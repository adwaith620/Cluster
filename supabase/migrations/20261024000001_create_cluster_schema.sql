-- ==============================================================================
-- Cluster Database Migration
-- Complete Schema: Sessions, Teams, Participants, Lifecycle, RLS & Atomic RPCs
-- ==============================================================================

-- 1. Create Sessions Table
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organiser_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    join_code VARCHAR(10) UNIQUE NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 100 CHECK (capacity >= 2 AND capacity <= 500),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (
        status IN ('draft', 'registration_open', 'registration_locked', 'assigned', 'revealed', 'completed')
    ),
    is_archived BOOLEAN NOT NULL DEFAULT false,
    team_count INTEGER CHECK (team_count IS NULL OR (team_count >= 2 AND team_count <= 100)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Create Teams Table
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    team_number INTEGER NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    media_url TEXT,
    media_type TEXT CHECK (media_type IS NULL OR media_type IN ('image', 'video', 'audio')),
    media_mime_type TEXT,
    media_filename TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_session_team_number UNIQUE (session_id, team_number)
);

-- 3. Create Participants Table
CREATE TABLE IF NOT EXISTS public.participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (char_length(trim(name)) >= 1 AND char_length(name) <= 60),
    device_token TEXT NOT NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled')),
    last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_session_device UNIQUE (session_id, device_token)
);

-- 4. Create Indexes for High Concurrency and Fast Lookups
CREATE INDEX IF NOT EXISTS idx_sessions_join_code ON public.sessions(join_code);
CREATE INDEX IF NOT EXISTS idx_sessions_organiser ON public.sessions(organiser_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions(status);
CREATE INDEX IF NOT EXISTS idx_teams_session ON public.teams(session_id);
CREATE INDEX IF NOT EXISTS idx_participants_session ON public.participants(session_id);
CREATE INDEX IF NOT EXISTS idx_participants_status ON public.participants(session_id, status);
CREATE INDEX IF NOT EXISTS idx_participants_team ON public.participants(team_id);
CREATE INDEX IF NOT EXISTS idx_participants_device ON public.participants(session_id, device_token);
CREATE INDEX IF NOT EXISTS idx_participants_heartbeat ON public.participants(session_id, last_heartbeat_at);

-- 5. Updated_at Trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sessions_updated_at ON public.sessions;
CREATE TRIGGER trigger_sessions_updated_at
    BEFORE UPDATE ON public.sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- ATOMIC RPC FUNCTIONS (CONCURRENCY-SAFE MUTATIONS)
-- ==============================================================================

-- 6. Atomic Participant Registration with Concurrency Lock & Idempotency
CREATE OR REPLACE FUNCTION public.register_participant(
    p_join_code TEXT,
    p_name TEXT,
    p_device_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_session RECORD;
    v_clean_name TEXT;
    v_active_count INTEGER;
    v_existing_participant RECORD;
    v_new_participant RECORD;
BEGIN
    v_clean_name := trim(p_name);
    IF char_length(v_clean_name) < 1 OR char_length(v_clean_name) > 60 THEN
        RAISE EXCEPTION 'INVALID_NAME: Name must be between 1 and 60 characters';
    END IF;

    IF p_device_token IS NULL OR trim(p_device_token) = '' THEN
        RAISE EXCEPTION 'INVALID_DEVICE_TOKEN: Device token is required';
    END IF;

    -- Lock session row to prevent race conditions during concurrent registrations
    SELECT * INTO v_session
    FROM public.sessions
    WHERE upper(join_code) = upper(trim(p_join_code))
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'SESSION_NOT_FOUND: Invalid session code';
    END IF;

    IF v_session.is_archived THEN
        RAISE EXCEPTION 'SESSION_ARCHIVED: This session has been archived';
    END IF;

    IF v_session.status <> 'registration_open' THEN
        RAISE EXCEPTION 'REGISTRATION_CLOSED: Registration is %', v_session.status;
    END IF;

    -- Check if participant with this device token already exists in this session
    SELECT * INTO v_existing_participant
    FROM public.participants
    WHERE session_id = v_session.id AND device_token = p_device_token
    FOR UPDATE;

    IF FOUND THEN
        -- If already active, refresh heartbeat and update name
        IF v_existing_participant.status = 'active' THEN
            UPDATE public.participants
            SET last_heartbeat_at = timezone('utc'::text, now()),
                name = v_clean_name
            WHERE id = v_existing_participant.id
            RETURNING * INTO v_existing_participant;

            SELECT count(*) INTO v_active_count
            FROM public.participants
            WHERE session_id = v_session.id AND status = 'active';

            RETURN jsonb_build_object(
                'success', true,
                'resumed', true,
                'participant_id', v_existing_participant.id,
                'name', v_existing_participant.name,
                'session_id', v_session.id,
                'session_title', v_session.title,
                'session_status', v_session.status,
                'capacity', v_session.capacity,
                'active_count', v_active_count
            );
        ELSE
            -- Inactive or cancelled: check if capacity allows reactivating
            SELECT count(*) INTO v_active_count
            FROM public.participants
            WHERE session_id = v_session.id AND status = 'active';

            IF v_active_count >= v_session.capacity THEN
                RAISE EXCEPTION 'CAPACITY_REACHED: Session has reached maximum capacity of %', v_session.capacity;
            END IF;

            UPDATE public.participants
            SET status = 'active',
                name = v_clean_name,
                last_heartbeat_at = timezone('utc'::text, now())
            WHERE id = v_existing_participant.id
            RETURNING * INTO v_existing_participant;

            RETURN jsonb_build_object(
                'success', true,
                'resumed', true,
                'participant_id', v_existing_participant.id,
                'name', v_existing_participant.name,
                'session_id', v_session.id,
                'session_title', v_session.title,
                'session_status', v_session.status,
                'capacity', v_session.capacity,
                'active_count', v_active_count + 1
            );
        END IF;
    END IF;

    -- New participant: Check capacity under row lock
    SELECT count(*) INTO v_active_count
    FROM public.participants
    WHERE session_id = v_session.id AND status = 'active';

    IF v_active_count >= v_session.capacity THEN
        RAISE EXCEPTION 'CAPACITY_REACHED: Session has reached maximum capacity of %', v_session.capacity;
    END IF;

    -- Insert new active participant
    INSERT INTO public.participants (
        session_id,
        name,
        device_token,
        status,
        last_heartbeat_at
    ) VALUES (
        v_session.id,
        v_clean_name,
        p_device_token,
        'active',
        timezone('utc'::text, now())
    )
    RETURNING * INTO v_new_participant;

    RETURN jsonb_build_object(
        'success', true,
        'resumed', false,
        'participant_id', v_new_participant.id,
        'name', v_new_participant.name,
        'session_id', v_session.id,
        'session_title', v_session.title,
        'session_status', v_session.status,
        'capacity', v_session.capacity,
        'active_count', v_active_count + 1
    );
END;
$$;

-- 7. Participant Heartbeat & Status Query
CREATE OR REPLACE FUNCTION public.heartbeat_participant(
    p_participant_id UUID,
    p_device_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_participant RECORD;
    v_session RECORD;
    v_active_count INTEGER;
BEGIN
    SELECT * INTO v_participant
    FROM public.participants
    WHERE id = p_participant_id AND device_token = p_device_token;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PARTICIPANT_NOT_FOUND: Participant registration not found';
    END IF;

    SELECT * INTO v_session
    FROM public.sessions
    WHERE id = v_participant.session_id;

    -- If still active, update heartbeat timestamp
    IF v_participant.status = 'active' THEN
        UPDATE public.participants
        SET last_heartbeat_at = timezone('utc'::text, now())
        WHERE id = v_participant.id;
    END IF;

    SELECT count(*) INTO v_active_count
    FROM public.participants
    WHERE session_id = v_session.id AND status = 'active';

    RETURN jsonb_build_object(
        'participant_id', v_participant.id,
        'participant_status', v_participant.status,
        'session_id', v_session.id,
        'session_status', v_session.status,
        'active_count', v_active_count,
        'capacity', v_session.capacity
    );
END;
$$;

-- 8. Clean Inactive Participants (Server-Side Lease Expiry)
CREATE OR REPLACE FUNCTION public.clean_inactive_participants(
    p_session_id UUID,
    p_grace_seconds INTEGER DEFAULT 180
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_session RECORD;
    v_cleaned_count INTEGER := 0;
BEGIN
    SELECT * INTO v_session
    FROM public.sessions
    WHERE id = p_session_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'SESSION_NOT_FOUND';
    END IF;

    -- Only expire participants while registration is open and before assignment/reveal
    IF v_session.status <> 'registration_open' THEN
        RETURN 0;
    END IF;

    WITH updated AS (
        UPDATE public.participants
        SET status = 'cancelled'
        WHERE session_id = p_session_id
          AND status = 'active'
          AND last_heartbeat_at < (timezone('utc'::text, now()) - (p_grace_seconds || ' seconds')::interval)
        RETURNING id
    )
    SELECT count(*) INTO v_cleaned_count FROM updated;

    RETURN v_cleaned_count;
END;
$$;

-- 9. Balanced & Randomized Team Assignment
CREATE OR REPLACE FUNCTION public.assign_teams_randomly(
    p_session_id UUID,
    p_team_count INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_session RECORD;
    v_participant_ids UUID[];
    v_participant_count INTEGER;
    v_team_ids UUID[];
    v_i INTEGER;
    v_team_idx INTEGER;
BEGIN
    IF p_team_count < 2 THEN
        RAISE EXCEPTION 'INVALID_TEAM_COUNT: Must specify at least 2 teams';
    END IF;

    -- Lock session row
    SELECT * INTO v_session
    FROM public.sessions
    WHERE id = p_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'SESSION_NOT_FOUND';
    END IF;

    IF v_session.status <> 'registration_locked' AND v_session.status <> 'assigned' THEN
        RAISE EXCEPTION 'INVALID_STATE: Session must be in registration_locked or assigned state';
    END IF;

    -- Get all active participants in random order
    SELECT array_agg(id) INTO v_participant_ids
    FROM (
        SELECT id
        FROM public.participants
        WHERE session_id = p_session_id AND status = 'active'
        ORDER BY random()
    ) sub;

    v_participant_count := coalesce(cardinality(v_participant_ids), 0);

    IF v_participant_count < p_team_count THEN
        RAISE EXCEPTION 'INSUFFICIENT_PARTICIPANTS: Active participants (%) is less than requested teams (%)',
            v_participant_count, p_team_count;
    END IF;

    -- Ensure teams 1..p_team_count exist
    -- Delete any excess teams if team_count decreased
    DELETE FROM public.teams
    WHERE session_id = p_session_id AND team_number > p_team_count;

    -- Insert missing teams
    FOR v_i IN 1..p_team_count LOOP
        INSERT INTO public.teams (session_id, team_number, name)
        VALUES (p_session_id, v_i, 'Team ' || v_i)
        ON CONFLICT (session_id, team_number) DO NOTHING;
    END LOOP;

    -- Fetch team ids ordered by team_number
    SELECT array_agg(id ORDER BY team_number ASC) INTO v_team_ids
    FROM public.teams
    WHERE session_id = p_session_id;

    -- Distribute participants evenly in round-robin across shuffled participant array
    -- This guarantees that team sizes differ by at most 1!
    FOR v_i IN 1..v_participant_count LOOP
        v_team_idx := ((v_i - 1) % p_team_count) + 1;
        UPDATE public.participants
        SET team_id = v_team_ids[v_team_idx]
        WHERE id = v_participant_ids[v_i];
    END LOOP;

    -- Update session state
    UPDATE public.sessions
    SET status = 'assigned',
        team_count = p_team_count
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
        'success', true,
        'participant_count', v_participant_count,
        'team_count', p_team_count
    );
END;
$$;

-- 10. Reveal Session Teams (Validates All Media Uploaded)
CREATE OR REPLACE FUNCTION public.reveal_session_teams(
    p_session_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_session RECORD;
    v_missing_media_count INTEGER;
    v_team_count INTEGER;
BEGIN
    SELECT * INTO v_session
    FROM public.sessions
    WHERE id = p_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'SESSION_NOT_FOUND';
    END IF;

    IF v_session.status <> 'assigned' THEN
        RAISE EXCEPTION 'INVALID_STATE: Session must be in assigned state before revealing';
    END IF;

    -- Verify that every team in the session has a media_url
    SELECT count(*) INTO v_team_count
    FROM public.teams
    WHERE session_id = p_session_id;

    IF v_team_count < 2 THEN
        RAISE EXCEPTION 'NO_TEAMS: No teams configured for this session';
    END IF;

    SELECT count(*) INTO v_missing_media_count
    FROM public.teams
    WHERE session_id = p_session_id AND (media_url IS NULL OR trim(media_url) = '');

    IF v_missing_media_count > 0 THEN
        RAISE EXCEPTION 'MISSING_MEDIA: % team(s) do not have media uploaded yet', v_missing_media_count;
    END IF;

    UPDATE public.sessions
    SET status = 'revealed'
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
        'success', true,
        'status', 'revealed',
        'teams_count', v_team_count
    );
END;
$$;

-- 11. Secure Participant Reveal State Reader (Zero Assignment Leaks Before Reveal)
CREATE OR REPLACE FUNCTION public.get_participant_reveal_data(
    p_session_id UUID,
    p_participant_id UUID,
    p_device_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_session RECORD;
    v_participant RECORD;
    v_team RECORD;
    v_team_member_count INTEGER;
BEGIN
    SELECT * INTO v_session
    FROM public.sessions
    WHERE id = p_session_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'SESSION_NOT_FOUND';
    END IF;

    SELECT * INTO v_participant
    FROM public.participants
    WHERE id = p_participant_id AND session_id = p_session_id AND device_token = p_device_token;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PARTICIPANT_NOT_FOUND';
    END IF;

    -- If NOT revealed, return status only. DO NOT reveal team details or media!
    IF v_session.status <> 'revealed' AND v_session.status <> 'completed' THEN
        RETURN jsonb_build_object(
            'revealed', false,
            'session_status', v_session.status,
            'participant_name', v_participant.name,
            'participant_status', v_participant.status
        );
    END IF;

    -- Session is revealed: return participant's assigned team only
    IF v_participant.team_id IS NULL THEN
        RAISE EXCEPTION 'NO_TEAM_ASSIGNED: Participant was not assigned to a team';
    END IF;

    SELECT * INTO v_team
    FROM public.teams
    WHERE id = v_participant.team_id;

    -- Count total members on this team to compute (m - 1) other members
    SELECT count(*) INTO v_team_member_count
    FROM public.participants
    WHERE team_id = v_team.id AND status = 'active';

    RETURN jsonb_build_object(
        'revealed', true,
        'session_status', v_session.status,
        'session_title', v_session.title,
        'participant_name', v_participant.name,
        'team_id', v_team.id,
        'team_number', v_team.team_number,
        'team_name', v_team.name,
        'media_url', v_team.media_url,
        'media_type', v_team.media_type,
        'media_mime_type', v_team.media_mime_type,
        'media_filename', v_team.media_filename,
        'total_team_members', v_team_member_count,
        'other_members_count', greatest(0, v_team_member_count - 1)
    );
END;
$$;

-- ==============================================================================
-- TABLE GRANTS & ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Grant table access to standard PostgREST roles (RLS enforces row-level isolation)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.sessions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.teams TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.participants TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

-- Sessions Policies
DROP POLICY IF EXISTS "Organisers manage their own sessions" ON public.sessions;
CREATE POLICY "Organisers manage their own sessions"
    ON public.sessions
    FOR ALL
    TO authenticated
    USING (organiser_id = auth.uid())
    WITH CHECK (organiser_id = auth.uid());

DROP POLICY IF EXISTS "Public can view non-archived session basics by code" ON public.sessions;
CREATE POLICY "Public can view non-archived session basics by code"
    ON public.sessions
    FOR SELECT
    TO anon, authenticated
    USING (is_archived = false);

-- Teams Policies
DROP POLICY IF EXISTS "Organisers manage teams of their sessions" ON public.teams;
CREATE POLICY "Organisers manage teams of their sessions"
    ON public.teams
    FOR ALL
    TO authenticated
    USING (
        session_id IN (
            SELECT id FROM public.sessions WHERE organiser_id = auth.uid()
        )
    )
    WITH CHECK (
        session_id IN (
            SELECT id FROM public.sessions WHERE organiser_id = auth.uid()
        )
    );

-- Participants Policies
DROP POLICY IF EXISTS "Organisers view participants of their sessions" ON public.participants;
CREATE POLICY "Organisers view participants of their sessions"
    ON public.participants
    FOR ALL
    TO authenticated
    USING (
        session_id IN (
            SELECT id FROM public.sessions WHERE organiser_id = auth.uid()
        )
    )
    WITH CHECK (
        session_id IN (
            SELECT id FROM public.sessions WHERE organiser_id = auth.uid()
        )
    );

-- ==============================================================================
-- STORAGE CONFIGURATION FOR TEAM MEDIA
-- ==============================================================================

-- Create team-media bucket if storage extension is available
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'team-media',
    'team-media',
    true,
    52428800, -- 50 MB
    ARRAY[
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'video/mp4',
        'video/webm',
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/ogg'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY[
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'video/mp4',
        'video/webm',
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/ogg'
    ];

-- Storage RLS: Organisers can upload/delete to team-media
DROP POLICY IF EXISTS "Organisers can upload team media" ON storage.objects;
CREATE POLICY "Organisers can upload team media"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'team-media');

DROP POLICY IF EXISTS "Organisers can update team media" ON storage.objects;
CREATE POLICY "Organisers can update team media"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'team-media');

DROP POLICY IF EXISTS "Organisers can delete team media" ON storage.objects;
CREATE POLICY "Organisers can delete team media"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'team-media');

DROP POLICY IF EXISTS "Public can view team media" ON storage.objects;
CREATE POLICY "Public can view team media"
    ON storage.objects
    FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'team-media');

-- Realtime publication configuration
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.participants;

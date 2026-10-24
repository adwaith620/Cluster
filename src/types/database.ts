export type SessionStatus =
  | 'draft'
  | 'registration_open'
  | 'registration_locked'
  | 'assigned'
  | 'revealed'
  | 'completed';

export type MediaType = 'image' | 'video' | 'audio';

export type ParticipantStatus = 'active' | 'inactive' | 'cancelled';

export interface Session {
  id: string;
  organiser_id: string;
  title: string;
  join_code: string;
  capacity: number;
  status: SessionStatus;
  is_archived: boolean;
  team_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  session_id: string;
  team_number: number;
  name: string;
  media_url: string | null;
  media_type: MediaType | null;
  media_mime_type: string | null;
  media_filename: string | null;
  created_at: string;
}

export interface Participant {
  id: string;
  session_id: string;
  name: string;
  device_token: string;
  team_id: string | null;
  status: ParticipantStatus;
  last_heartbeat_at: string;
  created_at: string;
}

export interface ParticipantWithTeam extends Participant {
  team?: Team | null;
}

export interface ParticipantRevealData {
  revealed: boolean;
  session_status: SessionStatus;
  session_title?: string;
  participant_name: string;
  participant_status: ParticipantStatus;
  team_id?: string;
  team_number?: number;
  team_name?: string;
  media_url?: string | null;
  media_type?: MediaType | null;
  media_mime_type?: string | null;
  media_filename?: string | null;
  total_team_members?: number;
  other_members_count?: number;
}

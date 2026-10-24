# Cluster — Scan. Discover. Connect.

Mobile-first, QR-based team formation web application designed for college orientations, workshops, corporate offsites, conferences, and icebreaker activities.

---

## 1. Product Overview

Cluster revolutionizes group formation by replacing awkward numbering or arbitrary team assignments with a fun, engaging, visual icebreaker:

1. **Host & Projection**: An organiser creates a session, sets a participant capacity (e.g. 100), and displays the universal QR code on a screen or projector.
2. **Frictionless Participant Scan**: Attendees scan the QR code using their phone's native camera, Google Lens, or any standard QR reader. No app download and no participant account registration is required.
3. **Realtime Waiting Room**: Participants enter their name, receive a secure session capability lease, and see the live lobby count update in real time.
4. **Media Upload & Balanced Assignment**: The organiser locks registration, sets the number of teams $K$, uploads one media asset (image, video, or audio) per team, and shuffles. Cluster mathematically balances team sizes ($q = \lfloor N / K \rfloor$, $r = N \bmod K$).
5. **Simultaneous Reveal & Connection**: When the organiser reveals teams, every participant's phone immediately lights up with their assigned identity and tells them how many others share it (e.g., *"You're Team Cheetah! 5 other participants have your identity. Find them!"*).

---

## 2. Technology Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Turbopack, React 19, TypeScript).
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with dark-first accessible UI design.
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL with Row Level Security, Supabase Auth for organisers).
- **Realtime**: Supabase Realtime (PostgreSQL replication events for counts and state transitions).
- **Storage**: Supabase Storage (`team-media` bucket) supporting JPEG, PNG, WebP, GIF, MP4, WebM, MP3, WAV, and OGG.
- **QR Generation**: `qrcode` library generating URL-encoded QR payloads.
- **Validation**: [Zod](https://zod.dev/) schema validation on both server API routes and client forms.
- **Testing**: [Vitest](https://vitest.dev/) for unit and integration testing; [Playwright](https://playwright.dev/) for end-to-end smoke testing.
- **Deployment**: Vercel-ready with zero-config serverless edge compatibility.

---

## 3. Project Architecture & Structure

```
Cluster/
├── .env.example                               # Documented environment template
├── next.config.mjs                            # Next.js configuration
├── package.json                               # Dependencies & scripts
├── playwright.config.ts                       # Playwright E2E configuration
├── postcss.config.mjs                         # PostCSS Tailwind v4 configuration
├── tsconfig.json                              # TypeScript strict configuration
├── vitest.config.ts                           # Vitest unit/integration configuration
├── supabase/
│   └── migrations/
│       └── 20261024000001_create_cluster_schema.sql  # Database tables, RLS & atomic RPCs
├── src/
│   ├── app/
│   │   ├── globals.css                        # Design tokens & dark mode styling
│   │   ├── layout.tsx                         # Root responsive layout
│   │   ├── page.tsx                           # Production landing page
│   │   ├── login/page.tsx                     # Organiser authentication (Sign In / Sign Up)
│   │   ├── dashboard/
│   │   │   ├── page.tsx                       # Organiser dashboard & session list
│   │   │   └── sessions/
│   │   │       ├── new/page.tsx               # Create session
│   │   │       └── [id]/page.tsx              # Organiser live session control room
│   │   ├── join/[code]/page.tsx               # Mobile participant entry, lobby & reveal
│   │   └── api/sessions/
│   │       ├── [code]/
│   │       │   ├── register/route.ts          # Concurrency-safe registration RPC
│   │       │   ├── heartbeat/route.ts         # Participant lease heartbeat
│   │       │   └── reveal-state/route.ts      # Zero-leak participant identity reader
│   │       └── [id]/
│   │           ├── status/route.ts            # Lifecycle transition handler
│   │           ├── assign/route.ts            # Balanced team allocation endpoint
│   │           ├── reveal/route.ts            # Reveal validation & trigger
│   │           ├── reset/route.ts             # Safe assignment reset
│   │           ├── clean-inactive/route.ts    # Server-side lease expiry process
│   │           ├── export/route.ts            # CSV participant roster download
│   │           └── teams/[teamId]/media/      # Media upload to Supabase Storage
│   ├── components/
│   │   └── brand/ClusterLogo.tsx              # Geometric grouping motif logo
│   ├── lib/
│   │   ├── algorithms/team-assignment.ts      # Unbiased Fisher-Yates balanced assignment
│   │   ├── auth/organiser.ts                  # Server-side session ownership verification
│   │   ├── supabase/
│   │   │   ├── client.ts                      # Browser Supabase client
│   │   │   ├── server.ts                      # SSR Supabase client (cookie-based)
│   │   │   └── admin.ts                       # Server-only service client for RPCs
│   │   ├── utils/
│   │   │   ├── code.ts                        # Unpredictable join code generator
│   │   │   ├── csv.ts                         # RFC-compliant CSV generator with escaping
│   │   │   ├── participant.ts                 # Cryptographic capability tokens
│   │   │   ├── qr.ts                          # Canonical URL & QR generation
│   │   │   └── rate-limit.ts                  # Sliding-window rate limiting
│   │   └── validators/index.ts                # Zod schemas for input validation
│   └── types/database.ts                      # Relational schema & TypeScript definitions
└── tests/
    ├── unit/
    │   ├── team-assignment.test.ts            # Mathematical invariants (K teams, max diff <= 1)
    │   └── validators.test.ts                 # Zod & media validation tests
    ├── integration/
    │   └── registration-and-lifecycle.test.ts # Concurrency, idempotency & lease tests
    └── e2e/
        └── cluster-flow.spec.ts               # Browser E2E smoke tests
```

---

## 4. Concurrency Safety & Lifecycle Architecture

### Concurrency Guarantees
- Participant registration uses PostgreSQL row-level locking (`SELECT ... FOR UPDATE` on `sessions`).
- Capacity checks and participant insertions occur atomically within `register_participant()`. Even if multiple participants attempt to claim the final available slot simultaneously, the transaction serializes and accepts exactly one, rejecting excess attempts with `CAPACITY_REACHED`.
- Idempotency: Re-submitting registration with an existing device token recovers or reactivates the participant without creating duplicate records.

### Participant Lease & Inactivity Expiry Policy
1. When a participant joins, their device stores a unique capability token (`cluster_device_token`) in both an HttpOnly cookie and localStorage.
2. While the waiting room page is open, the browser dispatches a periodic heartbeat (`POST /api/sessions/[code]/heartbeat`) every 20 seconds, as well as on `visibilitychange` (returning from background).
3. **Grace Period**: Cluster enforces a configurable 3-minute (180-second) inactivity grace period. If a participant switches apps, background-throttles their browser, or temporarily loses mobile signal, their slot is preserved as long as they return within the grace period.
4. **Server-Side Expiry**: Inactive participants can be swept via `clean_inactive_participants()` only while registration is in `registration_open`.
5. **Post-Reveal Invariant**: Once teams are locked, assigned, or revealed, participants are **never** removed merely because their heartbeat drops. If a user reconnects after reveal, their revealed screen is immediately restored.

### Session Lifecycle State Machine
```
draft ──> registration_open ──> registration_locked ──> assigned ──> revealed ──> completed
                ▲                      │
                └────── reset ─────────┘
```
- `draft`: Organiser sets title and capacity.
- `registration_open`: Public QR join is active; live lobby count tracks participants.
- `registration_locked`: Registration closed; organiser selects team count and uploads media.
- `assigned`: Balanced teams generated; assignments are visible to the organiser but remain completely hidden from participants.
- `revealed`: All participants simultaneously receive their assigned team identity and other-members count.
- `completed`: Activity finished.
- Organisers can reset an assigned session back to `registration_locked` or `registration_open` before reveal.

---

## 5. Local Setup & Development

### Prerequisites
- Node.js 18+ (tested on Node.js v26)
- npm or pnpm

### 1. Clone & Install
```bash
git clone https://github.com/adwaith620/Cluster.git
cd Cluster
npm install
```

### 2. Environment Configuration
Copy the example configuration file:
```bash
cp .env.example .env.local
```
Update `.env.local` with your configuration:
```env
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_SUPABASE_URL="https://your-supabase-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
```

### 3. Database & Supabase Setup
1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase Dashboard.
3. Paste and run the complete migration script located at:
   `supabase/migrations/20261024000001_create_cluster_schema.sql`
   This automatically creates:
   - `sessions`, `teams`, and `participants` tables.
   - Concurrency indexes and `updated_at` triggers.
   - Atomic RPC functions (`register_participant`, `heartbeat_participant`, `clean_inactive_participants`, `assign_teams_randomly`, `reveal_session_teams`, `get_participant_reveal_data`).
   - Row Level Security (RLS) policies.
   - Storage bucket `team-media` with size limits (50MB) and allowed MIME types.
   - Realtime publication enabling live subscriptions.

### 4. Google OAuth Setup (Optional for Organisers)
To enable "Continue with Google" for organisers:
1. In the [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an **OAuth 2.0 Client ID** (Web application).
2. Set Authorized redirect URIs to your Supabase Auth callback URL:
   `https://atijpayqntezmnqbprzn.supabase.co/auth/v1/callback`
3. In your **Supabase Dashboard > Authentication > Providers > Google**, toggle **Enable Google provider**, paste your **Client ID** and **Client Secret**, and save.
4. Under **URL Configuration**:
   - Set **Site URL** to: `https://cluster-tkm.vercel.app`
   - Add both URLs to the **Redirect URLs** list:
     - `https://cluster-tkm.vercel.app/auth/callback`
     - `http://localhost:3000/auth/callback`

### 5. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 6. Testing & Verification

Cluster includes unit, integration, and end-to-end test suites.

### Run Unit and Integration Tests
```bash
npm test
```
*Current test suite: 34 tests passing across 3 test files in < 1 second.*

Test coverage includes:
- **Balanced Team Distribution**: Proves $q = \lfloor N / K \rfloor$, $r = N \bmod K$, max team size difference $\le 1$ across 100 randomized variations.
- **Other-Members Count**: Verifies $m - 1$ calculation excluding the active participant.
- **Input Validation**: Tests Zod schemas for session capacity (2–500), join codes, names, and media types.
- **Media Validation**: Verifies allowable MIME types and 50MB file size limit.
- **Concurrency Simulation**: Simulates competing requests claiming the final slot under capacity.
- **Idempotent Resumption**: Verifies duplicate token submissions do not create duplicate participants.
- **Zero-Leak Reveal**: Guarantees participant state reader returns zero team information prior to reveal.
- **CSV Escaping**: Verifies RFC-compliant escaping of quotes, commas, and multiline inputs.

### Run Type Checking
```bash
npm run lint
```

### Run Production Build
```bash
npm run build
```

### Run End-to-End Tests (Playwright)
```bash
npm run test:e2e
```
*(Requires running application or local server and installed Playwright browsers via `npx playwright install`)*.

---

## 7. Production Deployment (Vercel)

1. Push this repository to GitHub: `https://github.com/adwaith620/Cluster.git`.
2. Import the repository in [Vercel](https://vercel.com).
3. Set the Environment Variables in the Vercel Project Settings:
   - `NEXT_PUBLIC_APP_URL`: `https://cluster-tkm.vercel.app`
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase URL (`https://atijpayqntezmnqbprzn.supabase.co`).
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase public anon key.
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (kept strictly secret on server).
4. Deploy. Vercel automatically runs `next build` and generates the optimized production bundles.

---

## 8. License

MIT License. Built with ❤️ for college orientations and community gatherings.

# Sync World - Complete App Synopsis

## What It Is

Sync World is a music sync licensing portal built for Warner Chappell Music. It connects three groups of people: **music supervisors/viewers** who need music for film, TV, ads, and campaigns; **producers/songwriters** who create that music; and **admins** who manage the pipeline between them. The app replaces the fragmented email-and-spreadsheet workflow of sync licensing with a centralized platform where music can be uploaded, browsed, requested, downloaded, and tracked.

**Live URL:** https://sync-world-app.vercel.app

---

## Tech Stack

- **Framework:** Next.js 16.2.2 (App Router) with React 19, TypeScript
- **Database:** Supabase (PostgreSQL) with Row-Level Security
- **Auth:** Supabase Auth (email/password + magic links), invite-only signup
- **Storage:** Supabase Storage (audio files with signed URL access)
- **Email:** Resend (transactional emails for checkout + brief notifications)
- **Hosting:** Vercel (serverless, edge-optimized)
- **Styling:** Tailwind CSS v4 + custom CSS variables, mobile-responsive

---

## Three User Roles

### Viewer (Music Supervisors, Sync Teams)
People looking for music to place in projects. They:
- Browse the full catalog split into **Songs** and **Instrumentals** sections
- Filter by genre, energy, mood, vocal type, BPM, writer/producer
- Preview tracks with in-browser audio playback
- Add tracks to a cart and checkout to receive download links via email
- Submit detailed **Music Briefs** describing what they need (modeled after real Warner Chappell submission format)
- View their download history to avoid re-reviewing tracks
- Edit their profile with company, role, and contact info

### Producer / Songwriter
People who create music. They:
- Upload tracks (single or batch) with a 3-step flow: upload files, set shared metadata, review per-song details
- Auto-detection of file versions (Main, Clean, Instrumental, Acapella) from file names
- View all submitted Music Briefs to see what supervisors are looking for
- Submit existing catalog tracks to specific briefs
- Upload NEW tracks directly to a brief (files go to catalog AND link to the brief)
- Edit their profile with specialties, bio, and credits

### Admin
Full platform management. They:
- View dashboard with catalog stats, recent activity, and all music requests
- Edit any track's metadata, sync status, and priority
- Manage the submission pipeline (track pitches to sync partners)
- Create invite links for new producers, viewers, or other admins
- Manage contacts (music supervisors, decision makers)
- See all briefs and submit tracks to them
- Access everything producers and viewers can do

---

## Core Features & How They Work

### 1. Catalog Browsing (`/browse`)
The browse page splits the catalog into **Songs** (tracks with vocals) and **Instrumentals** (tracks where vocal = "Instrumental"). Each section shows a grid of genre cards (Apple Music style) with track counts. Clicking a genre shows a filtered table with columns: Title/Artist, Type (Song/Instrumental badge), Status, Genre, BPM, Energy, Mood, Vocal, Versions, Sync Status, Actions, Cart.

**Search** works across title, artist, genre, subgenre, mood, theme, and notes. Additional filters: status, energy, vocal type, writer/producer name.

### 2. Audio Playback (`/api/play`)
Tracks are stored in Supabase Storage. The play button fetches a 1-hour signed URL via a server-side API route (bypasses RLS). Audio plays in-browser with play/pause toggle per track. The system looks for the "main" version first, falls back to any available file.

### 3. Cart & Checkout (`/api/checkout`)
Viewers add tracks to a cart (persisted in localStorage via React Context). On checkout:
- Server generates 24-hour signed download URLs for all file versions (main, clean, instrumental, acapella)
- Sends an HTML email via Resend with track info (title, artist, writers, producers, genre, BPM, key, energy, mood) and download buttons
- Increments download counts on each track
- Logs download activity per user (feeds into download history)

### 4. Music Briefs (`/request` + `/requests`)
The brief submission form mirrors how Warner Chappell actually sends music needs. Five sections:
1. **Project & Campaign** - project name, brand/client, campaign type (TV Commercial, Sports Campaign, Film, etc.), deadline
2. **Creative Direction** - key themes, core emotions, story context
3. **Music Direction** - genres, sub-genres, genre blends/crossovers, energy, vocal, BPM, instrumentation notes
4. **References** - specific tracks and artist vibes
5. **Additional** - notes, contact name and email

On submission: inserts into `music_requests` table, logs activity, emails all admins with a formatted brief.

The **Briefs list** (`/requests`) shows expandable cards. Producers/admins can click "Submit Tracks to This Brief" which opens a modal with two tabs:
- **From Catalog** - search and select existing tracks
- **Upload New** - pick files from device, fill in metadata, upload. Track goes into the catalog AND gets linked to the brief.

### 5. Track Upload (`/upload`)
Three-step batch upload:
1. **Drop files** - drag-and-drop or file picker. Auto-groups files by song name, auto-detects versions (Main/Clean/Inst/Acap from filename).
2. **Shared metadata** - set artist, writers, producers, genre, energy, vocal type, mood, theme, label, splits, notes. Applied to all songs in batch.
3. **Review** - expandable cards per song. Override any field per song. Add BPM, key, sub-genre, lyrics, download links. Remove songs. Submit.

Each track creates a row in `tracks`, uploads files to Supabase Storage under `{trackId}/{versionType}/{filename}`, creates `track_files` records, and logs activity.

### 6. Download History (`/downloads`)
Shows viewers every track they've downloaded (deduplicated). Table with: Title, Artist/Writers, Type (Song/Instrumental), Genre, Energy, Mood, BPM/Key, Download Date. Helps viewers avoid re-listening to already-reviewed tracks.

### 7. User Profiles (`/profile`)
Editable fields: Full Name, Company/Label, Phone, Location, Website, Bio. Producers also get a Specialties/Genres field. Read-only section shows email, role, and member-since date. Profile data stored in `profiles` table with server-side update API.

### 8. Admin Dashboard (`/admin`)
- **Stat cards**: total tracks, downloads, active submissions, placements
- **Music Requests table**: recent briefs with from, genre, mood/energy, project, deadline, description
- **Catalog Pipeline table**: all tracks with inline sync status management (liked/chosen/placed)
- **Activity Feed**: real-time log of uploads, downloads, interest marks, placements
- Sub-pages: `/admin/invites`, `/admin/submissions`, `/admin/contacts`

### 9. Invite System (`/admin/invites`)
Admins generate invite links with a role (Viewer, Producer, or Admin), optional email lock, and optional label/description. Links go to `/signup?token=...` where the user creates an account with the pre-assigned role. Invites can be revoked. Used invites show who used them and when.

### 10. Auth Flow
- **Login**: email/password or magic link
- **Signup**: invite-only via token-gated `/signup` page
- **Session**: Supabase Auth with cookie-based sessions, middleware protection
- **Profile fallback**: if RLS blocks profile read, API returns fallback profile from auth metadata
- Password fields have show/hide toggle on both login and signup

---

## Database Schema

### Tables
- **profiles** - id, full_name, role, company, email, phone, bio, website, location, specialties, created_at
- **tracks** - id (text, auto-generated SW-XXXX), title, artist, writers, producers, status, genre, subgenre, bpm, energy, mood, theme, vocal, key, has_main/clean/inst/acap, label, splits, priority, seasonal, download_url, lyrics, notes, sync_status, download_count, submitted_by, date_added
- **track_files** - id, track_id, version_type, file_name, file_size, storage_path, format, uploaded_at
- **music_requests** - id, user_id, user_name, user_email, project, brand, campaign_type, deadline, creative_themes, emotions, story_context, genre, subgenre, genre_blends, energy, vocal, bpm_min/max, instrumentation, reference, reference_artists, description, contact_name, contact_email, mood, theme, created_at
- **brief_submissions** - id, brief_id, track_id, submitted_by, submitted_by_name, notes, created_at (unique on brief_id + track_id)
- **submissions** - id (auto SUB-XXXX), date_sent, recipient, email, platform, track_ids, category, download_link, downloaded, interest, placement_offer, fee_offered, status, notes
- **contacts** - id, name, role, company, email, phone, relationship, last_contact, notes
- **activity_log** - id, type, text, track_id, user_id, created_at
- **invites** - id, token, role, email, label, used, used_by, used_at, expires_at, created_by, created_at

### Row-Level Security
- Viewers/admins can read all tracks; producers see only their own
- Users can read/update their own profile; admins can read all
- Music requests: users read own, admins and producers read all
- Brief submissions: any authenticated user can read and insert
- Activity log: any authenticated user can insert; admins can read all
- Track files: follows track visibility rules

---

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/profile` | GET | Fetch current user's profile (with fallback) |
| `/api/profile-update` | PUT | Update profile fields |
| `/api/tracks` | GET | List all tracks (id, title, artist, genre, vocal) |
| `/api/play` | GET | Generate signed URL for audio playback |
| `/api/checkout` | POST | Process cart, generate download links, send email |
| `/api/downloads` | GET | User's download history with track details |
| `/api/request` | POST | Submit a music brief, notify admins |
| `/api/requests` | GET | List all music briefs |
| `/api/brief-submit` | POST/GET | Submit catalog tracks to a brief / list submissions |
| `/api/brief-upload` | POST | Upload new files + create track + link to brief |
| `/auth/callback` | GET | Supabase auth callback (magic links, OAuth) |

---

## File Structure

```
src/
  app/
    page.tsx                    # Root redirect
    layout.tsx                  # Root layout + CartProvider
    globals.css                 # All styles + responsive
    login/page.tsx              # Login (password + magic link)
    signup/page.tsx             # Invite-gated signup
    profile/page.tsx            # User profile editor
    browse/page.tsx             # Catalog browser (Songs + Instrumentals)
    upload/page.tsx             # 3-step track upload
    downloads/page.tsx          # Download history
    request/page.tsx            # Submit music brief
    requests/page.tsx           # View briefs + submit tracks
    admin/
      page.tsx                  # Admin dashboard
      invites/page.tsx          # Invite management
      submissions/page.tsx      # Submission pipeline
      contacts/page.tsx         # Contact management
    api/
      profile/route.ts          # Profile fetch
      profile-update/route.ts   # Profile update
      tracks/route.ts           # Track list
      play/route.ts             # Audio playback signed URLs
      checkout/route.ts         # Cart checkout + email
      downloads/route.ts        # Download history
      request/route.ts          # Brief submission
      requests/route.ts         # Brief list
      brief-submit/route.ts     # Submit tracks to brief
      brief-upload/route.ts     # Upload + submit to brief
    auth/callback/route.ts      # Auth callback
  components/
    nav/TopNav.tsx              # Header navigation
    tracks/
      TrackTable.tsx            # Track list table
      TrackDetail.tsx           # Track detail modal
      TrackFilters.tsx          # Filter controls
    cart/CartPanel.tsx          # Cart sidebar
    upload/DropZone.tsx         # File upload drop zone
    ui/
      Badge.tsx                 # Status badges
      EnergyBar.tsx             # Energy level bar
      GenreTagInput.tsx         # Genre multi-select
      Modal.tsx                 # Modal wrapper
      Notification.tsx          # Toast notifications
      StatCard.tsx              # Dashboard stat card
      SubgenreInput.tsx         # Sub-genre input
      VersionDots.tsx           # Version indicators
  contexts/CartContext.tsx       # Cart state management
  hooks/useAuth.ts              # Auth hook
  lib/
    types.ts                    # All TypeScript types + constants
    supabase/
      client.ts                 # Browser Supabase client
      server.ts                 # Server Supabase client
  middleware.ts                 # Route protection + auth
supabase/
  migrations/
    001_initial_schema.sql      # Core tables + triggers
    002_rls_policies.sql        # Row-level security
    003_seed_data.sql           # Initial data
    004_invites.sql             # Invite system
    005_fix_signup_rls.sql      # RLS fixes
    006_music_requests.sql      # Music briefs table
  007_profile_fields.sql        # Profile extensions
  008_music_briefs_fields.sql   # Brief field extensions
  009_brief_submissions.sql     # Brief submission tracking
```

---

## Recommendations for Improvement & Scale

### High Priority

1. **Real-time notifications** - Use Supabase Realtime to push notifications when: a new brief is submitted, tracks are submitted to your brief, your track gets marked as "chosen" or "placed." Currently all notifications are email-only or require page refresh.

2. **Waveform audio player** - Replace the basic HTML5 audio element with a waveform player (like WaveSurfer.js). Show visual waveform, allow seeking, show timestamp. This is standard in music industry tools and helps supervisors quickly scan tracks.

3. **Track preview clips** - Auto-generate 30-60 second preview clips so supervisors can quickly skim tracks without listening to full songs. Could use FFmpeg on the server side.

4. **Full-text search with Supabase** - Replace the current client-side string matching with PostgreSQL full-text search (tsvector). This would enable fuzzy matching, ranked results, and searching across lyrics, notes, and all metadata simultaneously.

5. **Bulk metadata editing** - Admins need to edit multiple tracks at once (e.g., change genre for 20 tracks, mark a batch as "Released"). Add multi-select checkboxes and bulk action toolbar.

6. **Email delivery setup** - Currently requires `RESEND_API_KEY` env var. Need to verify a custom domain with Resend so emails come from `@syncworld.com` instead of `noreply@resend.dev`. Add email templates for different notification types.

### Medium Priority

7. **Playlist / Collection system** - Let viewers create named playlists/collections (e.g., "Nike Summer Shortlist") to organize tracks they're considering. Share playlists with team members via link.

8. **Comments & feedback on tracks** - Allow viewers to leave timestamped comments on tracks (e.g., "love the hook at 1:23 but the bridge is too long"). Producers can respond. This replaces back-and-forth emails.

9. **Analytics dashboard** - Track which genres get the most downloads, which producers' tracks get the most interest, which briefs get the most submissions. Show trends over time. Help admins make data-driven decisions about what music to source.

10. **Version control for tracks** - Allow producers to upload updated versions of existing tracks (e.g., new mix, stems added) rather than creating entirely new entries. Track version history.

11. **Stems & alternative formats** - Support stem uploads (drums, bass, vocals, etc.) alongside full mixes. Many sync placements need stems for custom edits. Add a stems section to track detail.

12. **Role-based notifications preferences** - Let users configure what emails they receive (new briefs, submission updates, placement confirmations). Currently everything goes to all admins.

13. **Brief status tracking** - Add statuses to briefs: Open, In Review, Filled, Closed. Let admins mark briefs as filled when they find what they need. Show brief pipeline on admin dashboard.

### Scale & Infrastructure

14. **CDN for audio streaming** - Move audio delivery to a CDN (Cloudflare R2 or AWS CloudFront) for faster global streaming. Supabase Storage signed URLs work but aren't optimized for media streaming.

15. **Background job processing** - Move email sending, file processing, and activity logging to background jobs (Vercel Cron or Inngest). Currently these happen inline during API requests which can slow responses.

16. **Database indexing** - Add indexes on frequently queried columns: `tracks.genre`, `tracks.vocal`, `tracks.submitted_by`, `activity_log.user_id`, `music_requests.created_at`. Critical as catalog grows past 1,000+ tracks.

17. **File size limits & validation** - Enforce max file sizes (e.g., 200MB per file), validate audio formats server-side, reject corrupt files. Currently accepts anything the browser sends.

18. **Rate limiting** - Add rate limiting on API routes (especially `/api/play` and `/api/checkout`) to prevent abuse. Use Vercel's edge middleware or Upstash Redis.

19. **Audit log** - Expand `activity_log` into a proper audit trail: track who changed what field on which record and when. Essential for sync licensing where contractual details matter.

20. **Multi-tenant architecture** - If Sync World expands beyond Warner Chappell, add organization/workspace support. Each organization gets its own catalog, users, and briefs. Shared infrastructure, isolated data.

### UX Improvements

21. **Onboarding flow** - After signup, guide new users through a 3-step onboarding: complete profile, tour key features, first action (upload for producers, browse for viewers).

22. **Dark mode** - The CSS variables are already set up for theming. Add a dark mode toggle that persists in localStorage. Many music professionals work in dark environments.

23. **Keyboard shortcuts** - Space to play/pause, arrow keys to navigate tracks, Cmd+K for search. Power users (music supervisors reviewing 50+ tracks) will appreciate this.

24. **Drag-and-drop track ordering** - Let admins and viewers reorder tracks by priority in their views. Useful for curating "top picks" lists.

25. **Mobile audio player** - Add a persistent mini-player at the bottom of the screen (like Spotify) that keeps playing as users navigate between pages. Currently audio stops on page change.

### Business Features

26. **Licensing agreement workflow** - When a track moves to "placed," trigger a licensing agreement workflow: generate a contract PDF, route for signatures (DocuSign API), track payment status.

27. **Revenue tracking** - Track sync fees per placement. Show producers their earnings. Generate quarterly reports for admins.

28. **ISRC / metadata standards** - Add ISRC codes, ISWC codes, and other industry-standard identifiers to tracks. Export metadata in DDEX format for distribution partners.

29. **Integration with DISCO / Songtradr** - Many sync teams use DISCO or Songtradr. Build import/export bridges so tracks can be synced bidirectionally.

30. **AI-powered music matching** - Use audio fingerprinting or ML models to analyze uploaded tracks and auto-suggest which briefs they might fit. Match by mood, energy, genre, and sonic characteristics.

---

## Environment Variables Required

```
NEXT_PUBLIC_SUPABASE_URL=       # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Supabase anon/public key
RESEND_API_KEY=                 # Resend email API key (optional, for email features)
RESEND_FROM_EMAIL=              # Sender email address (optional)
```

---

## How to Continue Building

Any future Claude session can pick up this project by:

1. Reading this synopsis for full context
2. Reading `src/lib/types.ts` for all data structures
3. Reading `src/middleware.ts` for auth/routing logic
4. Checking `supabase/migrations/` for database schema
5. Running `npm run dev` to start the dev server
6. Running `npx vercel --prod` to deploy changes

The codebase follows consistent patterns:
- Pages use `useAuth()` hook for auth + loading guards
- API routes use `createClient()` from `@/lib/supabase/server` for server-side Supabase
- All database writes go through server-side API routes to bypass RLS
- Notifications use the `useNotification()` hook
- Mobile-first responsive design with CSS media queries in `globals.css`

-- Background queue for AI audio analysis (Reccobeats).
-- Populated by the upload pipeline after a successful upload; drained by
-- /api/cron/process-analysis-queue running every minute on Vercel Cron.

create table if not exists public.analysis_queue (
  id uuid primary key default gen_random_uuid(),
  track_id text not null references public.tracks(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'processing', 'done', 'failed')),
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  processed_at timestamptz
);

create unique index if not exists analysis_queue_track_pending_idx
  on public.analysis_queue(track_id) where status in ('pending', 'processing');

create index if not exists analysis_queue_status_idx
  on public.analysis_queue(status, created_at);

alter table public.analysis_queue enable row level security;
-- Only service role reads/writes this table; no policies needed.

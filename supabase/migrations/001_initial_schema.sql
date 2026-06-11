-- FlashForge schema
-- Run this migration in Supabase SQL editor or via CLI

create extension if not exists "pgcrypto";

-- ── game_sessions ─────────────────────────────────────────────────────────────
create table if not exists public.game_sessions (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  user_fingerprint  text not null,          -- anonymous browser ID
  notes_length      int not null default 0,
  total_cards       int not null default 0,
  total_answered    int not null default 0,
  total_correct     int not null default 0,
  accuracy          numeric(5,2) not null default 0,
  final_xp          int not null default 0,
  badges_earned     text[] not null default '{}',
  weak_topics       text[] not null default '{}',
  strong_topics     text[] not null default '{}',
  completed         boolean not null default false
);

-- ── card_attempts ─────────────────────────────────────────────────────────────
create table if not exists public.card_attempts (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  session_id     uuid not null references public.game_sessions(id) on delete cascade,
  card_id        int not null,
  card_level     int not null check (card_level between 1 and 4),
  topic          text not null,
  question       text not null,
  user_answer    text not null,
  verdict        text not null check (verdict in ('correct','partial','incorrect')),
  score          int not null check (score between 0 and 100),
  attempt_number int not null default 1
);

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table public.game_sessions enable row level security;
alter table public.card_attempts  enable row level security;

-- Allow anonymous inserts (the app uses anon key)
create policy "anon can insert sessions"
  on public.game_sessions for insert
  to anon with check (true);

create policy "anon can insert attempts"
  on public.card_attempts for insert
  to anon with check (true);

-- Public read for leaderboard
create policy "public can read sessions"
  on public.game_sessions for select
  to anon using (true);

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index if not exists idx_sessions_xp        on public.game_sessions(final_xp desc);
create index if not exists idx_sessions_created   on public.game_sessions(created_at desc);
create index if not exists idx_attempts_session   on public.card_attempts(session_id);
create index if not exists idx_attempts_verdict   on public.card_attempts(verdict);

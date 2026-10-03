-- FitVision cloud backup of workout sessions.
-- Run once in the Supabase SQL editor (or `supabase db push`).

create table if not exists public.fitvision_sessions (
    id          text        not null,
    user_id     uuid        not null references auth.users (id) on delete cascade,
    data        jsonb       not null,
    updated_at  timestamptz not null default now(),
    primary key (user_id, id)
);

create index if not exists fitvision_sessions_user_idx on public.fitvision_sessions (user_id);

-- Each user can only see and write their own rows.
alter table public.fitvision_sessions enable row level security;

drop policy if exists "own sessions read" on public.fitvision_sessions;
create policy "own sessions read" on public.fitvision_sessions
    for select using (auth.uid() = user_id);

drop policy if exists "own sessions write" on public.fitvision_sessions;
create policy "own sessions write" on public.fitvision_sessions
    for insert with check (auth.uid() = user_id);

drop policy if exists "own sessions update" on public.fitvision_sessions;
create policy "own sessions update" on public.fitvision_sessions
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own sessions delete" on public.fitvision_sessions;
create policy "own sessions delete" on public.fitvision_sessions
    for delete using (auth.uid() = user_id);

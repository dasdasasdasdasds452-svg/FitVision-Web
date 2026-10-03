-- FitVision friends: friend codes + weekly leaderboard.
-- Run once in the Supabase SQL editor (after 001_fitvision_sessions.sql).
-- Friends can read only each other's display name and weekly totals. Sessions stay private.

create table if not exists public.fitvision_profiles (
    user_id      uuid primary key references auth.users (id) on delete cascade,
    friend_code  text not null unique check (friend_code ~ '^[A-HJ-NP-Z2-9]{6}$'),
    display_name text not null default 'Athlete' check (char_length(display_name) between 1 and 40),
    week_start   date,
    week_days    integer not null default 0 check (week_days between 0 and 7),
    week_sets    integer not null default 0 check (week_sets between 0 and 1000),
    week_avg     integer check (week_avg between 0 and 100),
    streak       integer not null default 0 check (streak between 0 and 3650),
    last_trained date,
    updated_at   timestamptz not null default now()
);

create table if not exists public.fitvision_friendships (
    user_id    uuid not null references auth.users (id) on delete cascade,
    friend_id  uuid not null references auth.users (id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (user_id, friend_id),
    check (user_id <> friend_id)
);

create index if not exists fitvision_friendships_friend_idx on public.fitvision_friendships (friend_id);

alter table public.fitvision_profiles enable row level security;
alter table public.fitvision_friendships enable row level security;

-- Profiles: read your own and your friends'; write only your own.
drop policy if exists "fitvision profiles read own or friends" on public.fitvision_profiles;
create policy "fitvision profiles read own or friends" on public.fitvision_profiles
    for select using (
        auth.uid() = user_id
        or exists (
            select 1 from public.fitvision_friendships f
            where f.user_id = auth.uid() and f.friend_id = fitvision_profiles.user_id
        )
    );

drop policy if exists "fitvision profiles insert own" on public.fitvision_profiles;
create policy "fitvision profiles insert own" on public.fitvision_profiles
    for insert with check (auth.uid() = user_id);

drop policy if exists "fitvision profiles update own" on public.fitvision_profiles;
create policy "fitvision profiles update own" on public.fitvision_profiles
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Friendships: read your own rows. Adding/removing goes through the functions below,
-- which always write both directions so friendship is mutual.
drop policy if exists "fitvision friendships read own" on public.fitvision_friendships;
create policy "fitvision friendships read own" on public.fitvision_friendships
    for select using (auth.uid() = user_id);

create or replace function public.fitvision_add_friend(code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
    me uuid := auth.uid();
    other uuid;
    other_name text;
begin
    if me is null then
        return json_build_object('status', 'unauthenticated');
    end if;
    select p.user_id, p.display_name into other, other_name
    from public.fitvision_profiles p
    where p.friend_code = upper(trim(code));
    if other is null then
        return json_build_object('status', 'not_found');
    end if;
    if other = me then
        return json_build_object('status', 'self');
    end if;
    if exists (select 1 from public.fitvision_friendships where user_id = me and friend_id = other) then
        return json_build_object('status', 'already', 'name', other_name);
    end if;
    insert into public.fitvision_friendships (user_id, friend_id)
    values (me, other), (other, me)
    on conflict do nothing;
    return json_build_object('status', 'added', 'name', other_name);
end;
$$;

create or replace function public.fitvision_remove_friend(friend uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if auth.uid() is null then
        return;
    end if;
    delete from public.fitvision_friendships
    where (user_id = auth.uid() and friend_id = friend)
       or (user_id = friend and friend_id = auth.uid());
end;
$$;

revoke all on function public.fitvision_add_friend(text) from public, anon;
revoke all on function public.fitvision_remove_friend(uuid) from public, anon;
grant execute on function public.fitvision_add_friend(text) to authenticated;
grant execute on function public.fitvision_remove_friend(uuid) to authenticated;

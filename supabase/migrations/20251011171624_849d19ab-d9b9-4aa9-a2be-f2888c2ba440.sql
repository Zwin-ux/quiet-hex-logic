-- Profiles table for user data
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null check (length(username) between 2 and 24),
  created_at timestamptz default now()
);

-- Social: Friends table
create table public.friends (
  a uuid references public.profiles(id) on delete cascade,
  b uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (a, b),
  check (a < b)
);

-- Social: Blocks table
create table public.blocks (
  blocker uuid references public.profiles(id) on delete cascade,
  blocked uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);

-- Match status enum
create type match_status as enum ('waiting', 'active', 'finished', 'aborted');

-- Matches table
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references public.profiles(id),
  size int not null check (size in (7, 9, 11, 13)),
  pie_rule bool not null default true,
  status match_status not null default 'waiting',
  turn smallint not null default 1,
  winner smallint,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Match players table
create table public.match_players (
  match_id uuid references public.matches(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  color smallint not null check (color in (1, 2)),
  is_bot bool not null default false,
  created_at timestamptz default now(),
  primary key (match_id, profile_id)
);

-- Moves table (append-only)
create table public.moves (
  match_id uuid references public.matches(id) on delete cascade,
  ply int not null,
  color smallint not null check (color in (1, 2)),
  cell int,
  created_at timestamptz default now(),
  primary key (match_id, ply)
);

-- Tutorial progress table
create table public.tutorial_progress (
  profile_id uuid references public.profiles(id) on delete cascade,
  step int not null,
  completed_at timestamptz default now(),
  primary key (profile_id, step)
);

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.friends enable row level security;
alter table public.blocks enable row level security;
alter table public.matches enable row level security;
alter table public.match_players enable row level security;
alter table public.moves enable row level security;
alter table public.tutorial_progress enable row level security;

-- RLS Policies: Profiles
create policy "profiles_select" on public.profiles
  for select using (true);

create policy "profiles_insert" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update" on public.profiles
  for update using (auth.uid() = id);

-- RLS Policies: Friends
create policy "friends_select" on public.friends
  for select using (a = auth.uid() or b = auth.uid());

create policy "friends_insert" on public.friends
  for insert with check (a = auth.uid());

create policy "friends_delete" on public.friends
  for delete using (a = auth.uid() or b = auth.uid());

-- RLS Policies: Blocks
create policy "blocks_all" on public.blocks
  for all using (blocker = auth.uid());

-- RLS Policies: Matches
create policy "matches_select" on public.matches
  for select using (
    exists(
      select 1 from public.match_players mp 
      where mp.match_id = id and mp.profile_id = auth.uid()
    ) or status = 'waiting'
  );

create policy "matches_insert" on public.matches
  for insert with check (auth.uid() = owner);

create policy "matches_update" on public.matches
  for update using (
    exists(
      select 1 from public.match_players mp 
      where mp.match_id = id and mp.profile_id = auth.uid()
    )
  );

-- RLS Policies: Match Players
create policy "match_players_select" on public.match_players
  for select using (
    exists(
      select 1 from public.match_players mp 
      where mp.match_id = match_id and mp.profile_id = auth.uid()
    )
  );

create policy "match_players_insert" on public.match_players
  for insert with check (
    exists(
      select 1 from public.matches m 
      where m.id = match_id and m.owner = auth.uid()
    )
  );

-- RLS Policies: Moves
create policy "moves_select" on public.moves
  for select using (
    exists(
      select 1 from public.match_players mp 
      where mp.match_id = match_id and mp.profile_id = auth.uid()
    )
  );

create policy "moves_insert" on public.moves
  for insert with check (
    exists(
      select 1 from public.match_players mp 
      where mp.match_id = match_id and mp.profile_id = auth.uid()
    )
  );

-- RLS Policies: Tutorial Progress
create policy "tutorial_progress_all" on public.tutorial_progress
  for all using (profile_id = auth.uid());

-- Trigger to update updated_at on matches
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger matches_updated_at
  before update on public.matches
  for each row execute function public.handle_updated_at();

-- Function to create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id, 
    coalesce(
      new.raw_user_meta_data->>'username',
      'player_' || substr(new.id::text, 1, 8)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Enable realtime for matches and moves
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.moves;
alter publication supabase_realtime add table public.match_players;
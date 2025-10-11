-- Fix infinite recursion in match_players RLS policies
-- Drop the problematic policies
drop policy if exists "match_players_select" on public.match_players;
drop policy if exists "match_players_insert" on public.match_players;

-- Create a security definer function to check if user is in a match
create or replace function public.user_in_match(_match_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.match_players
    where match_id = _match_id
      and profile_id = _user_id
  )
$$;

-- Create new policies using the security definer function
create policy "match_players_select" on public.match_players
  for select using (
    public.user_in_match(match_id, auth.uid())
  );

create policy "match_players_insert" on public.match_players
  for insert with check (
    exists(
      select 1 from public.matches m 
      where m.id = match_id and m.owner = auth.uid()
    )
  );
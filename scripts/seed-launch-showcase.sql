-- Public launch data for the current alpha shell.
-- Safe to run multiple times.

insert into public.worlds (slug, name, description, visibility, created_by)
values
  (
    'founding-floor',
    'Founding Floor',
    'Hex. Chess. Checkers. Connect 4. Finals on May 1.',
    'public',
    null
  ),
  (
    'workshop-floor',
    'Workshop Floor',
    'Mods. Bots. Test tables.',
    'public',
    null
  )
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  visibility = excluded.visibility,
  updated_at = now();

insert into public.lobbies (
  code,
  host_id,
  status,
  board_size,
  pie_rule,
  turn_timer_seconds,
  game_key,
  world_id
)
select
  seed.code,
  null,
  'waiting',
  seed.board_size,
  seed.pie_rule,
  seed.turn_timer_seconds,
  seed.game_key,
  worlds.id
from (
  values
    ('HX0501', 'founding-floor', 'hex', 11, true, 45),
    ('CH0501', 'founding-floor', 'chess', 8, false, 60),
    ('C40501', 'workshop-floor', 'connect4', 7, false, 45)
) as seed(code, world_slug, game_key, board_size, pie_rule, turn_timer_seconds)
join public.worlds worlds on worlds.slug = seed.world_slug
where not exists (
  select 1
  from public.lobbies existing
  where existing.code = seed.code
);

update public.tournaments
set
  description = 'Open online bracket. Four boards. Finals after lock.',
  format = 'single_elimination',
  status = 'registration',
  max_players = 32,
  min_players = 8,
  board_size = 11,
  pie_rule = true,
  turn_timer_seconds = 45,
  registration_deadline = '2026-05-01T18:30:00-07:00'::timestamptz,
  start_time = '2026-05-01T19:00:00-07:00'::timestamptz,
  world_id = (select id from public.worlds where slug = 'founding-floor'),
  game_key = 'hex',
  competitive_mode = false,
  updated_at = now()
where name = 'BOARD Founding Open';

insert into public.tournaments (
  name,
  description,
  format,
  status,
  max_players,
  min_players,
  board_size,
  pie_rule,
  turn_timer_seconds,
  registration_deadline,
  start_time,
  created_by,
  world_id,
  game_key,
  competitive_mode
)
select
  'BOARD Founding Open',
  'Open online bracket. Four boards. Finals after lock.',
  'single_elimination',
  'registration',
  32,
  8,
  11,
  true,
  45,
  '2026-05-01T18:30:00-07:00'::timestamptz,
  '2026-05-01T19:00:00-07:00'::timestamptz,
  null,
  (select id from public.worlds where slug = 'founding-floor'),
  'hex',
  false
where not exists (
  select 1
  from public.tournaments existing
  where existing.name = 'BOARD Founding Open'
);

update public.tournaments
set
  description = 'Single-board qualifier. World ID required at join.',
  format = 'single_elimination',
  status = 'seeding',
  max_players = 16,
  min_players = 4,
  board_size = 11,
  pie_rule = true,
  turn_timer_seconds = 45,
  registration_deadline = '2026-04-30T18:30:00-07:00'::timestamptz,
  start_time = '2026-04-30T19:00:00-07:00'::timestamptz,
  world_id = null,
  game_key = 'hex',
  competitive_mode = true,
  updated_at = now()
where name = 'Foundry Warmup Cup';

insert into public.tournaments (
  name,
  description,
  format,
  status,
  max_players,
  min_players,
  board_size,
  pie_rule,
  turn_timer_seconds,
  registration_deadline,
  start_time,
  created_by,
  world_id,
  game_key,
  competitive_mode
)
select
  'Foundry Warmup Cup',
  'Single-board qualifier. World ID required at join.',
  'single_elimination',
  'seeding',
  16,
  4,
  11,
  true,
  45,
  '2026-04-30T18:30:00-07:00'::timestamptz,
  '2026-04-30T19:00:00-07:00'::timestamptz,
  null,
  null,
  'hex',
  true
where not exists (
  select 1
  from public.tournaments existing
  where existing.name = 'Foundry Warmup Cup'
);

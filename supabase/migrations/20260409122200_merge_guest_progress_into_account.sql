CREATE OR REPLACE FUNCTION public.merge_guest_progress_into_account(
  p_guest_user_id uuid,
  p_target_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_target_user_id THEN
    RAISE EXCEPTION 'You can only merge into the active account'
      USING ERRCODE = '42501';
  END IF;

  IF p_guest_user_id IS NULL OR p_target_user_id IS NULL OR p_guest_user_id = p_target_user_id THEN
    RAISE EXCEPTION 'Invalid merge request';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_guest_user_id
      AND is_guest = true
  ) THEN
    RAISE EXCEPTION 'Guest profile not found';
  END IF;

  UPDATE public.matches
  SET owner = p_target_user_id
  WHERE owner = p_guest_user_id;

  INSERT INTO public.match_players (match_id, profile_id, color, is_bot, created_at, rating_change)
  SELECT
    mp.match_id,
    p_target_user_id,
    mp.color,
    mp.is_bot,
    mp.created_at,
    mp.rating_change
  FROM public.match_players mp
  WHERE mp.profile_id = p_guest_user_id
  ON CONFLICT (match_id, profile_id) DO NOTHING;
  DELETE FROM public.match_players WHERE profile_id = p_guest_user_id;

  INSERT INTO public.lobby_players (lobby_id, player_id, role, is_ready, last_seen)
  SELECT
    lp.lobby_id,
    p_target_user_id,
    lp.role,
    lp.is_ready,
    lp.last_seen
  FROM public.lobby_players lp
  WHERE lp.player_id = p_guest_user_id
  ON CONFLICT (lobby_id, player_id) DO UPDATE
    SET
      is_ready = excluded.is_ready OR public.lobby_players.is_ready,
      last_seen = GREATEST(excluded.last_seen, public.lobby_players.last_seen);
  DELETE FROM public.lobby_players WHERE player_id = p_guest_user_id;

  UPDATE public.lobbies
  SET host_id = p_target_user_id
  WHERE host_id = p_guest_user_id;

  INSERT INTO public.tournament_participants (tournament_id, player_id, seed, status, wins, losses, points, joined_at)
  SELECT
    tp.tournament_id,
    p_target_user_id,
    tp.seed,
    tp.status,
    tp.wins,
    tp.losses,
    tp.points,
    tp.joined_at
  FROM public.tournament_participants tp
  WHERE tp.player_id = p_guest_user_id
  ON CONFLICT (tournament_id, player_id) DO NOTHING;
  DELETE FROM public.tournament_participants WHERE player_id = p_guest_user_id;

  UPDATE public.tournament_matches
  SET
    player1_id = CASE WHEN player1_id = p_guest_user_id THEN p_target_user_id ELSE player1_id END,
    player2_id = CASE WHEN player2_id = p_guest_user_id THEN p_target_user_id ELSE player2_id END,
    winner_id = CASE WHEN winner_id = p_guest_user_id THEN p_target_user_id ELSE winner_id END
  WHERE
    player1_id = p_guest_user_id
    OR player2_id = p_guest_user_id
    OR winner_id = p_guest_user_id;

  UPDATE public.tournaments
  SET created_by = p_target_user_id
  WHERE created_by = p_guest_user_id;

  INSERT INTO public.world_members (world_id, profile_id, role, joined_at)
  SELECT
    wm.world_id,
    p_target_user_id,
    wm.role,
    wm.joined_at
  FROM public.world_members wm
  WHERE wm.profile_id = p_guest_user_id
  ON CONFLICT (world_id, profile_id) DO UPDATE
    SET role = CASE
      WHEN public.world_members.role = 'owner' OR excluded.role = 'owner' THEN 'owner'
      WHEN public.world_members.role = 'admin' OR excluded.role = 'admin' THEN 'admin'
      ELSE public.world_members.role
    END;
  DELETE FROM public.world_members WHERE profile_id = p_guest_user_id;

  UPDATE public.worlds
  SET created_by = p_target_user_id
  WHERE created_by = p_guest_user_id;

  INSERT INTO public.spectators (match_id, profile_id, joined_at)
  SELECT
    s.match_id,
    p_target_user_id,
    s.joined_at
  FROM public.spectators s
  WHERE s.profile_id = p_guest_user_id
  ON CONFLICT (match_id, profile_id) DO NOTHING;
  DELETE FROM public.spectators WHERE profile_id = p_guest_user_id;

  INSERT INTO public.user_presence (profile_id, match_id, status, updated_at)
  SELECT
    p_target_user_id,
    up.match_id,
    up.status,
    up.updated_at
  FROM public.user_presence up
  WHERE up.profile_id = p_guest_user_id
  ON CONFLICT (profile_id) DO UPDATE
    SET
      match_id = excluded.match_id,
      status = excluded.status,
      updated_at = excluded.updated_at;
  DELETE FROM public.user_presence WHERE profile_id = p_guest_user_id;

  INSERT INTO public.player_ratings (profile_id, game_key, elo_rating, games_rated, updated_at)
  SELECT
    p_target_user_id,
    pr.game_key,
    pr.elo_rating,
    pr.games_rated,
    pr.updated_at
  FROM public.player_ratings pr
  WHERE pr.profile_id = p_guest_user_id
  ON CONFLICT (profile_id, game_key) DO NOTHING;
  DELETE FROM public.player_ratings WHERE profile_id = p_guest_user_id;

  UPDATE public.rating_history
  SET profile_id = p_target_user_id
  WHERE profile_id = p_guest_user_id;

  INSERT INTO public.tutorial_progress (profile_id, step, completed_at)
  SELECT
    p_target_user_id,
    tp.step,
    tp.completed_at
  FROM public.tutorial_progress tp
  WHERE tp.profile_id = p_guest_user_id
  ON CONFLICT (profile_id, step) DO NOTHING;
  DELETE FROM public.tutorial_progress WHERE profile_id = p_guest_user_id;

  INSERT INTO public.user_achievements (achievement_id, user_id, earned_at)
  SELECT
    ua.achievement_id,
    p_target_user_id,
    ua.earned_at
  FROM public.user_achievements ua
  WHERE ua.user_id = p_guest_user_id
  ON CONFLICT DO NOTHING;
  DELETE FROM public.user_achievements WHERE user_id = p_guest_user_id;

  UPDATE public.bots
  SET owner_profile_id = p_target_user_id
  WHERE owner_profile_id = p_guest_user_id;

  UPDATE public.profiles
  SET
    converted_from_anonymous_id = COALESCE(converted_from_anonymous_id, p_guest_user_id),
    is_guest = false
  WHERE id = p_target_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'guestUserId', p_guest_user_id,
    'targetUserId', p_target_user_id
  );
END;
$$;


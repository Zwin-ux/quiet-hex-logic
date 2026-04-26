export interface TournamentRow {
  id: string;
  board_size: number;
  pie_rule: boolean;
  turn_timer_seconds: number | null;
  world_id: string | null;
  game_key?: string | null;
  mod_version_id?: string | null;
}

export interface TournamentParticipantRow {
  player_id: string;
  seed: number | null;
  joined_at?: string | null;
}

export interface TournamentRoundRow {
  id: string;
  round_number: number;
  round_name: string | null;
  status: string;
}

export interface TournamentMatchRow {
  id: string;
  tournament_id: string | null;
  round_id: string | null;
  match_id: string | null;
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  bracket_position: number;
  next_match_id: string | null;
  status: string;
}

export function nextPowerOfTwo(value: number) {
  let next = 1;
  while (next < value) next *= 2;
  return next;
}

export function buildSeedOrder(size: number): number[] {
  if (size <= 1) return [1];

  const previous = buildSeedOrder(size / 2);
  const next: number[] = [];

  for (const seed of previous) {
    next.push(seed);
    next.push(size + 1 - seed);
  }

  return next;
}

export function roundNameFor(roundNumber: number, totalRounds: number) {
  const matchesInRound = 2 ** (totalRounds - roundNumber);
  const playersInRound = matchesInRound * 2;

  if (playersInRound <= 2) return 'Finals';
  if (playersInRound === 4) return 'Semifinals';
  if (playersInRound === 8) return 'Quarterfinals';
  if (playersInRound === 16) return 'Round of 16';
  if (playersInRound === 32) return 'Round of 32';
  return `Round ${roundNumber}`;
}

function matchBoardSize(gameKey: string | null | undefined, boardSize: number) {
  if (gameKey === 'chess' || gameKey === 'checkers') return 8;
  if (gameKey === 'ttt') return 3;
  if (gameKey === 'connect4') return 7;
  return boardSize;
}

async function createLiveMatchForTournamentPair(
  supabase: any,
  tournament: TournamentRow,
  tournamentMatch: TournamentMatchRow,
  variantSnapshot?: { rules: Record<string, unknown> | null; modVersionId: string | null },
) {
  if (!tournamentMatch.player1_id || !tournamentMatch.player2_id || tournamentMatch.match_id) {
    return null;
  }

  const gameKey = tournament.game_key ?? 'hex';
  const size = matchBoardSize(gameKey, tournament.board_size);
  const pieRule = gameKey === 'hex' ? tournament.pie_rule : false;

  const { data: liveMatch, error: liveMatchError } = await supabase
    .from('matches')
    .insert({
      tournament_id: tournament.id,
      world_id: tournament.world_id ?? null,
      owner: tournamentMatch.player1_id,
        game_key: gameKey,
        size,
        pie_rule: pieRule,
        turn_timer_seconds: tournament.turn_timer_seconds,
        rules: variantSnapshot?.rules ?? null,
        mod_version_id: variantSnapshot?.modVersionId ?? null,
        allow_spectators: true,
        status: 'active',
    })
    .select()
    .single();

  if (liveMatchError || !liveMatch) {
    throw liveMatchError ?? new Error('Failed to create tournament match');
  }

  const { error: playersError } = await supabase
    .from('match_players')
    .insert([
      {
        match_id: liveMatch.id,
        profile_id: tournamentMatch.player1_id,
        color: 1,
      },
      {
        match_id: liveMatch.id,
        profile_id: tournamentMatch.player2_id,
        color: 2,
      },
    ]);

  if (playersError) {
    throw playersError;
  }

  const { error: updateError } = await supabase
    .from('tournament_matches')
    .update({
      match_id: liveMatch.id,
      status: 'active',
    })
    .eq('id', tournamentMatch.id);

  if (updateError) {
    throw updateError;
  }

  return liveMatch.id as string;
}

export async function syncTournamentBracket(
  supabase: any,
  tournament: TournamentRow,
) {
  let variantSnapshot: { rules: Record<string, unknown> | null; modVersionId: string | null } | undefined;

  if (tournament.mod_version_id) {
    const { data: versionRow, error: versionError } = await supabase
      .from('workshop_mod_versions')
      .select('id, rules, workshop_mods!inner(game_key)')
      .eq('id', tournament.mod_version_id)
      .maybeSingle();

    if (versionError) throw versionError;
    if (!versionRow) throw new Error('Tournament variant not found');

    const modGameKey = (versionRow as any)?.workshop_mods?.game_key;
    const gameKey = tournament.game_key ?? 'hex';
    if (modGameKey !== gameKey) {
      throw new Error('Tournament variant does not match tournament game');
    }

    variantSnapshot = {
      rules: ((versionRow as any)?.rules ?? null) as Record<string, unknown> | null,
      modVersionId: (versionRow as any)?.id ?? null,
    };
  }

  const { data: roundsData, error: roundsError } = await supabase
    .from('tournament_rounds')
    .select('id, round_number, round_name, status')
    .eq('tournament_id', tournament.id)
    .order('round_number', { ascending: true });

  if (roundsError) throw roundsError;

  const { data: matchesData, error: matchesError } = await supabase
    .from('tournament_matches')
    .select('id, tournament_id, round_id, match_id, player1_id, player2_id, winner_id, bracket_position, next_match_id, status')
    .eq('tournament_id', tournament.id)
    .order('bracket_position', { ascending: true });

  if (matchesError) throw matchesError;

  const rounds = (roundsData ?? []) as TournamentRoundRow[];
  const matches = (matchesData ?? []) as TournamentMatchRow[];
  const matchesById = new Map(matches.map((match) => [match.id, { ...match }]));

  let changed = true;
  while (changed) {
    changed = false;

    for (const match of matchesById.values()) {
      if (match.next_match_id && match.winner_id) {
        const nextMatch = matchesById.get(match.next_match_id);
        if (nextMatch) {
          const nextField = match.bracket_position % 2 === 0 ? 'player1_id' : 'player2_id';
          if ((nextMatch as any)[nextField] !== match.winner_id) {
            (nextMatch as any)[nextField] = match.winner_id;
            const { error } = await supabase
              .from('tournament_matches')
              .update({ [nextField]: match.winner_id })
              .eq('id', nextMatch.id);

            if (error) throw error;
            changed = true;
          }
        }
      }

      const soloPlayer = match.player1_id ?? match.player2_id;
      const hasSinglePlayer = Boolean(soloPlayer) && !(match.player1_id && match.player2_id);

      if (hasSinglePlayer && match.status !== 'completed' && !match.match_id && !match.winner_id) {
        match.winner_id = soloPlayer;
        match.status = 'completed';

        const { error } = await supabase
          .from('tournament_matches')
          .update({
            winner_id: soloPlayer,
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', match.id);

        if (error) throw error;
        changed = true;
        continue;
      }

      if (
        match.player1_id &&
        match.player2_id &&
        !match.match_id &&
        match.status !== 'completed'
      ) {
        const liveMatchId = await createLiveMatchForTournamentPair(
          supabase,
          tournament,
          match,
          variantSnapshot,
        );
        if (liveMatchId) {
          match.match_id = liveMatchId;
          match.status = 'active';
          changed = true;
        }
      }
    }
  }

  const roundStatusPromises = rounds.map(async (round) => {
    const roundMatches = Array.from(matchesById.values()).filter((match) => match.round_id === round.id);
    const nextStatus = roundMatches.every((match) => match.status === 'completed')
      ? 'completed'
      : roundMatches.some((match) => match.status === 'active')
        ? 'active'
        : 'pending';

    if (nextStatus !== round.status) {
      const updatePayload: Record<string, unknown> = { status: nextStatus };
      if (nextStatus === 'completed') {
        updatePayload.completed_at = new Date().toISOString();
      } else if (nextStatus === 'active') {
        updatePayload.started_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('tournament_rounds')
        .update(updatePayload)
        .eq('id', round.id);

      if (error) throw error;
    }
  });

  await Promise.all(roundStatusPromises);

  const finalRound = rounds.at(-1);
  const finalMatches = finalRound
    ? Array.from(matchesById.values()).filter((match) => match.round_id === finalRound.id)
    : [];
  const tournamentCompleted =
    finalMatches.length > 0 && finalMatches.every((match) => match.status === 'completed');

  const { error: tournamentError } = await supabase
    .from('tournaments')
    .update({
      status: tournamentCompleted ? 'completed' : 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', tournament.id);

  if (tournamentError) throw tournamentError;

  return {
    tournamentCompleted,
    finalWinnerId: finalMatches[0]?.winner_id ?? null,
  };
}

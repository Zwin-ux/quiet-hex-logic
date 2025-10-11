import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simplified Hex engine for validation
class HexValidator {
  n: number;
  board: Uint8Array;
  turn: number;
  ply: number;
  pieRule: boolean;
  swapped: boolean;

  constructor(size: number, pieRule: boolean) {
    this.n = size;
    this.board = new Uint8Array(size * size);
    this.turn = 1;
    this.ply = 0;
    this.pieRule = pieRule;
    this.swapped = false;
  }

  legal(cell: number | null): boolean {
    if (cell === null) {
      return this.pieRule && this.ply === 1 && !this.swapped;
    }
    return cell >= 0 && cell < this.board.length && this.board[cell] === 0;
  }

  play(cell: number | null): void {
    if (!this.legal(cell)) {
      throw new Error(`Illegal move: cell=${cell}, ply=${this.ply}`);
    }

    if (cell === null) {
      this.swapped = true;
      this.turn = 1;
      this.ply++;
      return;
    }

    this.board[cell] = this.turn;
    this.ply++;
    this.turn = this.turn === 1 ? 2 : 1;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { matchId, proposedMove, playerId } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch match details
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('size, pie_rule, turn, status, owner')
      .eq('id', matchId)
      .single();

    if (matchError) throw matchError;

    // Check game is active
    if (match.status !== 'active') {
      return new Response(
        JSON.stringify({ valid: false, error: 'Game is not active' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch player info to verify it's their turn
    const { data: player, error: playerError } = await supabase
      .from('match_players')
      .select('color')
      .eq('match_id', matchId)
      .eq('profile_id', playerId)
      .single();

    if (playerError || !player) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Player not in this match' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if it's their turn
    if (player.color !== match.turn) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Not your turn' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all moves and reconstruct game state
    const { data: moves, error: movesError } = await supabase
      .from('moves')
      .select('ply, color, cell')
      .eq('match_id', matchId)
      .order('ply', { ascending: true });

    if (movesError) throw movesError;

    // Replay moves to validate state
    const validator = new HexValidator(match.size, match.pie_rule);
    for (const move of moves) {
      validator.play(move.cell);
    }

    // Validate proposed move
    const cell = proposedMove === null ? null : Number(proposedMove);
    
    if (!validator.legal(cell)) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Illegal move' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ valid: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in validate-move:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ valid: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const validateMoveSchema = z.object({
  matchId: z.string().uuid('Invalid match ID'),
  proposedMove: z.number().int().min(0).max(10000).nullable(),
  playerId: z.string().uuid('Invalid player ID')
});

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
    const body = await req.json();
    
    // Validate input
    const validationResult = validateMoveSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input parameters', 
          details: validationResult.error.format() 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { matchId, proposedMove, playerId } = validationResult.data;
    
    // Get authenticated user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify the authenticated user matches the playerId
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user || user.id !== playerId) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

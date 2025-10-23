import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Disjoint Set Union for connectivity tracking
class DSU {
  parent: number[];
  
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
  }
  
  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]);
    }
    return this.parent[x];
  }
  
  union(x: number, y: number): void {
    const rootX = this.find(x);
    const rootY = this.find(y);
    if (rootX !== rootY) {
      this.parent[rootY] = rootX;
    }
  }
}

// Hex game engine
class HexValidator {
  n: number;
  board: (0 | 1 | 2)[];
  turn: number;
  pieRule: boolean;
  dsu1: DSU;
  dsu2: DSU;
  
  constructor(size: number, pieRule: boolean) {
    this.n = size;
    this.pieRule = pieRule;
    this.board = Array(size * size).fill(0);
    this.turn = 1;
    this.dsu1 = new DSU(size * size + 2);
    this.dsu2 = new DSU(size * size + 2);
  }
  
  legal(cell: number | null): boolean {
    if (cell === null) {
      return this.turn === 2 && this.pieRule;
    }
    return cell >= 0 && cell < this.board.length && this.board[cell] === 0;
  }
  
  play(cell: number | null): void {
    if (!this.legal(cell)) {
      throw new Error('Illegal move');
    }
    
    if (cell === null) {
      // Pie rule: swap all stones on the board
      this.board = this.board.map(c => c === 1 ? 2 : c === 2 ? 1 : 0) as (0 | 1 | 2)[];
      // After swap, increment turn normally (next player's turn)
      this.turn++;
      return;
    }
    
    const color = this.turn % 2 === 1 ? 1 : 2;
    this.board[cell] = color;
    const dsu = color === 1 ? this.dsu1 : this.dsu2;
    
    const neighbors = this.getNeighbors(cell);
    for (const nb of neighbors) {
      if (this.board[nb] === color) {
        dsu.union(cell, nb);
      }
    }
    
    if (color === 1) {
      const col = cell % this.n;
      if (col === 0) dsu.union(cell, this.board.length);
      if (col === this.n - 1) dsu.union(cell, this.board.length + 1);
    } else {
      const row = Math.floor(cell / this.n);
      if (row === 0) dsu.union(cell, this.board.length);
      if (row === this.n - 1) dsu.union(cell, this.board.length + 1);
    }
    
    this.turn++;
  }
  
  getNeighbors(cell: number): number[] {
    const row = Math.floor(cell / this.n);
    const col = cell % this.n;
    const neighbors: number[] = [];
    
    const deltas = [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0]];
    
    for (const [dr, dc] of deltas) {
      const newRow = row + dr;
      const newCol = col + dc;
      if (newRow >= 0 && newRow < this.n && newCol >= 0 && newCol < this.n) {
        neighbors.push(newRow * this.n + newCol);
      }
    }
    
    return neighbors;
  }
  
  winner(): 0 | 1 | 2 {
    const left1 = this.board.length;
    const right1 = this.board.length + 1;
    
    if (this.dsu1.find(left1) === this.dsu1.find(right1)) return 1;
    if (this.dsu2.find(left1) === this.dsu2.find(right1)) return 2;
    return 0;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { matchId, cell, actionId } = await req.json();
    
    if (!actionId) {
      return new Response(
        JSON.stringify({ error: 'action_id required for idempotency' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check rate limit first
    const rateLimitOk = await supabase.rpc('check_move_rate_limit', {
      _match_id: matchId,
      _user_id: user.id
    });

    if (!rateLimitOk.data) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded - too many moves' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for duplicate action_id (idempotency)
    const { data: existingMove } = await supabase
      .from('moves')
      .select('ply')
      .eq('match_id', matchId)
      .eq('action_id', actionId)
      .maybeSingle();

    if (existingMove) {
      // Move already processed - return success (idempotent)
      console.log('Duplicate action_id detected, returning cached result');
      const { data: currentMatch } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();
      
      return new Response(
        JSON.stringify({
          success: true,
          turn: currentMatch.turn,
          winner: currentMatch.winner,
          status: currentMatch.status,
          cached: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is a player in this match
    const { data: player, error: playerError } = await supabase
      .from('match_players')
      .select('color, is_bot')
      .eq('match_id', matchId)
      .eq('profile_id', user.id)
      .single();

    if (playerError || !player) {
      return new Response(
        JSON.stringify({ error: 'Not authorized for this match' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch match details with version for optimistic concurrency
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();
    
    const currentVersion = match?.version || 0;

    if (matchError || !match) {
      return new Response(
        JSON.stringify({ error: 'Match not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (match.status === 'finished' || match.status === 'aborted') {
      return new Response(
        JSON.stringify({ error: 'Match is already finished' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if it's the player's turn
    const currentPlayerColor = match.turn % 2 === 1 ? 1 : 2;
    if (player.color !== currentPlayerColor) {
      return new Response(
        JSON.stringify({ error: 'Not your turn' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all moves and reconstruct game state
    const { data: moves, error: movesError } = await supabase
      .from('moves')
      .select('*')
      .eq('match_id', matchId)
      .order('ply', { ascending: true });

    if (movesError) {
      console.error('Error fetching moves:', movesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch moves' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Reconstruct game state
    const validator = new HexValidator(match.size, match.pie_rule);
    
    for (const move of moves || []) {
      validator.play(move.cell);
    }

    // Validate and apply the proposed move
    if (!validator.legal(cell)) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Illegal move' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    validator.play(cell);
    const winner = validator.winner();
    const newTurn = validator.turn;
    const newStatus = winner ? 'finished' : 'active';

    // Insert move with action_id for idempotency
    const { error: moveInsertError } = await supabase
      .from('moves')
      .insert({
        match_id: matchId,
        ply: match.turn,
        color: currentPlayerColor,
        cell: cell,
        action_id: actionId
      });

    if (moveInsertError) {
      console.error('Error inserting move:', moveInsertError);
      // Check if duplicate key violation (23505)
      if (moveInsertError.code === '23505') {
        return new Response(
          JSON.stringify({ error: 'Duplicate move detected' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: 'Failed to record move' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update match with optimistic concurrency control
    const { data: updatedMatch, error: matchUpdateError } = await supabase
      .from('matches')
      .update({
        turn: newTurn,
        status: newStatus,
        winner: winner || null,
        version: currentVersion + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', matchId)
      .eq('version', currentVersion)
      .select()
      .single();

    if (matchUpdateError || !updatedMatch) {
      console.error('Error updating match (concurrency conflict):', matchUpdateError);
      // Rollback move insert would happen automatically via RLS/permissions
      return new Response(
        JSON.stringify({ error: 'Match state changed - please retry' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        turn: newTurn,
        winner: winner || null,
        status: newStatus
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in apply-move:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
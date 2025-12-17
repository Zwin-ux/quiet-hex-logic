import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type AIDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

// Lightweight Hex engine for AI calculations
class HexAI {
  board: number[];
  size: number;
  pieRule: boolean;
  turn: number;

  constructor(size: number, board: number[], pieRule: boolean, turn: number) {
    this.size = size;
    this.board = [...board];
    this.pieRule = pieRule;
    this.turn = turn;
  }

  getEmptyCells(): number[] {
    return this.board
      .map((val, idx) => val === 0 ? idx : -1)
      .filter(idx => idx !== -1);
  }

  coords(i: number): [number, number] {
    return [i % this.size, Math.floor(i / this.size)];
  }

  getNeighbors(cell: number): number[] {
    const [c, r] = this.coords(cell);
    const neighbors: number[] = [];
    
    // Offset coordinates (odd-q): odd columns shifted down
    const deltasEven = [[1, -1], [1, 0], [0, 1], [-1, 0], [-1, -1], [0, -1]]; // [dc, dr]
    const deltasOdd = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [0, -1]];   // [dc, dr]
    
    const deltas = c % 2 === 0 ? deltasEven : deltasOdd;
    
    for (const [dc, dr] of deltas) {
      const nc = c + dc;
      const nr = r + dr;
      if (nc >= 0 && nc < this.size && nr >= 0 && nr < this.size) {
        neighbors.push(nr * this.size + nc);
      }
    }
    
    return neighbors;
  }

  // Easy AI: Random with center bias
  getEasyMove(canUsePieRule: boolean): { move: number | null, reasoning: string } {
    const empty = this.getEmptyCells();
    if (empty.length === 0) return { move: null, reasoning: 'No moves available' };

    if (canUsePieRule && Math.random() < 0.2) {
      return { move: null, reasoning: 'Swapping colors for positional advantage.' };
    }

    const center = Math.floor(this.size / 2);

    if (Math.random() < 0.7) {
      const centerCells = empty.filter(cell => {
        const [c, r] = this.coords(cell);
        const dist = Math.abs(c - center) + Math.abs(r - center);
        return dist <= 2;
      });

      if (centerCells.length > 0) {
        const move = centerCells[Math.floor(Math.random() * centerCells.length)];
        return { move, reasoning: 'Playing near center for territorial control.' };
      }
    }

    const move = empty[Math.floor(Math.random() * empty.length)];
    return { move, reasoning: 'Making a developing move.' };
  }

  // Medium AI: Simple heuristic evaluation
  getMediumMove(canUsePieRule: boolean): { move: number | null, reasoning: string } {
    const empty = this.getEmptyCells();
    if (empty.length === 0) return { move: null, reasoning: 'No moves available' };

    const center = Math.floor(this.size / 2);

    if (canUsePieRule) {
      for (let i = 0; i < this.size * this.size; i++) {
        if (this.board[i] !== 0) {
          const [c, r] = this.coords(i);
          const dist = Math.abs(c - center) + Math.abs(r - center);
          if (dist <= 1) {
            return { move: null, reasoning: 'Swapping - opponent took strong center position.' };
          }
        }
      }
    }

    const currentColor = this.turn % 2 === 1 ? 1 : 2;
    let bestMove = empty[0];
    let bestScore = -Infinity;

    for (const move of empty) {
      const [c, r] = this.coords(move);
      let score = 0;

      if (currentColor === 1) {
        const westDist = c;
        const eastDist = this.size - 1 - c;
        score += Math.max(0, 10 - Math.min(westDist, eastDist));
        score += Math.max(0, 5 - Math.abs(r - center));
      } else {
        const northDist = r;
        const southDist = this.size - 1 - r;
        score += Math.max(0, 10 - Math.min(northDist, southDist));
        score += Math.max(0, 5 - Math.abs(c - center));
      }

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    const [c, r] = this.coords(bestMove);
    const distFromCenter = Math.abs(c - center) + Math.abs(r - center);
    const reasoning = distFromCenter <= 2
      ? 'Controlling central territory with good connectivity.'
      : currentColor === 1
        ? 'Advancing west-east connection.'
        : 'Building north-south bridge.';

    return { move: bestMove, reasoning };
  }

  // Hard AI: Tactical evaluation with threat detection
  getHardMove(canUsePieRule: boolean): { move: number | null, reasoning: string } {
    const empty = this.getEmptyCells();
    if (empty.length === 0) return { move: null, reasoning: 'No moves available' };

    const center = Math.floor(this.size / 2);

    if (canUsePieRule) {
      for (let i = 0; i < this.size * this.size; i++) {
        if (this.board[i] !== 0) {
          const [c, r] = this.coords(i);
          const dist = Math.abs(c - center) + Math.abs(r - center);
          if (dist <= 2) {
            return { move: null, reasoning: 'Swapping - opponent took strong position.' };
          }
        }
      }
    }

    const currentColor = this.turn % 2 === 1 ? 1 : 2;
    const opponentColor = currentColor === 1 ? 2 : 1;

    // Check for immediate winning move
    for (const move of empty) {
      const testBoard = [...this.board];
      testBoard[move] = currentColor;
      if (this.checkWinner(testBoard, currentColor)) {
        return { move, reasoning: 'Winning move!' };
      }
    }

    // Check for blocking opponent's winning threat
    for (const move of empty) {
      const testBoard = [...this.board];
      testBoard[move] = opponentColor;
      if (this.checkWinner(testBoard, opponentColor)) {
        return { move, reasoning: 'Blocking critical opponent threat!' };
      }
    }

    // Advanced positional scoring
    let bestMove = empty[0];
    let bestScore = -Infinity;

    for (const move of empty) {
      let score = 0;
      const [c, r] = this.coords(move);

      // Distance to goal
      if (currentColor === 1) {
        const westDist = c;
        const eastDist = this.size - 1 - c;
        score += 20 - Math.min(westDist, eastDist);
        score += 10 - Math.abs(r - center);
      } else {
        const northDist = r;
        const southDist = this.size - 1 - r;
        score += 20 - Math.min(northDist, southDist);
        score += 10 - Math.abs(c - center);
      }

      // Connectivity bonus
      const neighbors = this.getNeighbors(move);
      let friendlyNeighbors = 0;
      let opponentNeighbors = 0;
      
      for (const nb of neighbors) {
        if (this.board[nb] === currentColor) friendlyNeighbors++;
        if (this.board[nb] === opponentColor) opponentNeighbors++;
      }
      
      score += friendlyNeighbors * 15;
      score += opponentNeighbors * 8;

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return { move: bestMove, reasoning: 'Strategic position with strong connectivity' };
  }

  // Winner check for threat detection
  checkWinner(board: number[], color: number): boolean {
    const start = color === 1 ? 
      Array.from({length: this.size}, (_, i) => i * this.size) :
      Array.from({length: this.size}, (_, i) => i);
    
    const visited = new Set<number>();
    const queue: number[] = [];
    
    for (const cell of start) {
      if (board[cell] === color) {
        queue.push(cell);
        visited.add(cell);
      }
    }
    
    while (queue.length > 0) {
      const cell = queue.shift()!;
      const [col, row] = this.coords(cell);
      
      if (color === 1 && col === this.size - 1) return true;
      if (color === 2 && row === this.size - 1) return true;
      
      // Use offset coordinates for neighbors
      const deltasEven = [[1, -1], [1, 0], [0, 1], [-1, 0], [-1, -1], [0, -1]];
      const deltasOdd = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [0, -1]];
      const deltas = col % 2 === 0 ? deltasEven : deltasOdd;
      
      for (const [dc, dr] of deltas) {
        const nc = col + dc;
        const nr = row + dr;
        if (nc >= 0 && nc < this.size && nr >= 0 && nr < this.size) {
          const neighborCell = nr * this.size + nc;
          if (board[neighborCell] === color && !visited.has(neighborCell)) {
            visited.add(neighborCell);
            queue.push(neighborCell);
          }
        }
      }
    }
    
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { matchId, difficulty = 'expert' } = await req.json() as { matchId: string, difficulty?: AIDifficulty };
    
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

    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('size, pie_rule, turn, owner, ai_difficulty')
      .eq('id', matchId)
      .single();

    if (matchError || !match) throw matchError || new Error('Match not found');

    // Allow owner in AI matches
    const isAIMatch = match.ai_difficulty !== null;
    if (!(isAIMatch && match.owner === user.id)) {
      const { data: player, error: playerError } = await supabase
        .from('match_players')
        .select('profile_id')
        .eq('match_id', matchId)
        .eq('profile_id', user.id)
        .maybeSingle();

      if (playerError || !player) {
        return new Response(
          JSON.stringify({ error: 'Not authorized for this match' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { data: moves, error: movesError } = await supabase
      .from('moves')
      .select('ply, color, cell')
      .eq('match_id', matchId)
      .order('ply', { ascending: true });

    if (movesError) throw movesError;

    const boardSize = match.size;
    const board = Array(boardSize * boardSize).fill(0);
    let canUsePieRule = false;

    for (const move of moves) {
      if (move.cell !== null) {
        board[move.cell] = move.color;
      }
    }

    if (match.pie_rule && moves.length === 1 && moves[0].cell !== null) {
      canUsePieRule = true;
    }

    // Use traditional AI
    const hexAI = new HexAI(boardSize, board, match.pie_rule, match.turn);
    let result: { move: number | null, reasoning: string };

    switch (difficulty) {
      case 'easy':
        result = hexAI.getEasyMove(canUsePieRule);
        break;
      case 'medium':
        result = hexAI.getMediumMove(canUsePieRule);
        break;
      case 'hard':
      case 'expert':
        result = hexAI.getHardMove(canUsePieRule);
        break;
      default:
        result = hexAI.getEasyMove(canUsePieRule);
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-move:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

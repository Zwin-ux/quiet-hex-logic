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
      // Check if opponent played in center
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

    // Score each move based on position
    let bestMove = empty[0];
    let bestScore = -Infinity;

    for (const move of empty) {
      const [c, r] = this.coords(move);
      let score = 0;

      if (currentColor === 1) {
        // Indigo connects W-E
        const westDist = c;
        const eastDist = this.size - 1 - c;
        score += Math.max(0, 10 - Math.min(westDist, eastDist));
        score += Math.max(0, 5 - Math.abs(r - center));
      } else {
        // Ochre connects N-S
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

    // Use medium strategy with enhanced scoring
    return this.getMediumMove(canUsePieRule);
  }

  // Simple winner check for threat detection
  checkWinner(board: number[], color: number): boolean {
    const start = color === 1 ? 
      Array.from({length: this.size}, (_, i) => i * this.size) : // West edge for player 1
      Array.from({length: this.size}, (_, i) => i); // North edge for player 2
    
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
      
      // Check if reached goal
      if (color === 1 && col === this.size - 1) return true; // East edge
      if (color === 2 && row === this.size - 1) return true; // South edge
      
      // Check neighbors
      const neighbors = [
        [1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]
      ];
      
      for (const [dc, dr] of neighbors) {
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
    
    // Get authenticated user from JWT
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

    // Verify the user is authenticated and is a player in this match
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch match first to decide authorization rules
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('size, pie_rule, turn, owner, ai_difficulty')
      .eq('id', matchId)
      .single();

    if (matchError || !match) throw matchError || new Error('Match not found');

    // Authorization: allow owner in AI practice matches even if not in match_players
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

    // Build board state representation
    const boardSize = match.size;
    const board = Array(boardSize * boardSize).fill(0);
    let canUsePieRule = false;

    for (const move of moves) {
      if (move.cell !== null) {
        board[move.cell] = move.color;
      }
    }

    // Check if pie rule is available
    if (match.pie_rule && moves.length === 1 && moves[0].cell !== null) {
      canUsePieRule = true;
    }

    // Get available moves
    const emptyCells = board
      .map((val, idx) => val === 0 ? idx : -1)
      .filter(idx => idx !== -1);

    // For non-expert difficulty, use traditional AI
    if (difficulty !== 'expert') {
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
          result = hexAI.getHardMove(canUsePieRule);
          break;
        default:
          result = hexAI.getEasyMove(canUsePieRule);
      }

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Expert difficulty: Prefer LLM, but always fallback to deterministic AI
    const hexAIFallback = () => {
      const hexAI = new HexAI(boardSize, board, match.pie_rule, match.turn);
      return hexAI.getHardMove(canUsePieRule);
    };

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      const result = hexAIFallback();
      return new Response(
        JSON.stringify({ ...result, reasoning: result.reasoning + ' (LLM unavailable)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    try {
      const systemPrompt = `You are an expert Hex game AI. Hex is played on a ${boardSize}×${boardSize} rhombus board. 
Player 1 (indigo) connects West-East. Player 2 (ochre) connects North-South.
Players alternate placing stones. First to connect their sides wins.

Key strategies:
- Control the center
- Build bridges (two stones separated by specific empty cells that guarantee connection)
- Block opponent's connections
- Create multiple threats simultaneously

Current turn: Player ${match.turn}`;

      const userPrompt = `Board state (0=empty, 1=indigo, 2=ochre):
${board.map((v, i) => (i % boardSize === 0 ? '\n' : '') + v).join(' ')}

Available moves: ${emptyCells.slice(0, 20).join(', ')}${emptyCells.length > 20 ? '...' : ''}
${canUsePieRule ? '\nPie rule available: You can swap colors instead of playing.' : ''}

Analyze and choose the best move. ${canUsePieRule ? 'Consider whether swapping is better than playing a move.' : ''}`;

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          tools: [{
            type: 'function',
            function: {
              name: 'make_move',
              description: 'Make a move in the Hex game',
              parameters: {
                type: 'object',
                properties: {
                  move: {
                    type: ['number', 'null'],
                    description: 'Cell index (0 to board_size²-1) or null for pie swap'
                  },
                  reasoning: {
                    type: 'string',
                    description: 'Brief explanation of why this move is strong (20-40 words)'
                  }
                },
                required: ['move', 'reasoning'],
                additionalProperties: false
              }
            }
          }],
          tool_choice: { type: 'function', function: { name: 'make_move' } }
        })
      });

      if (!aiResponse.ok) throw new Error(`AI gateway error ${aiResponse.status}: ${await aiResponse.text()}`);

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      
      if (toolCall?.function?.arguments) {
        const args = JSON.parse(toolCall.function.arguments);
        const move = args.move === null ? null : Number(args.move);
        
        // Validate move
        if (move !== null && (move < 0 || move >= boardSize * boardSize || board[move] !== 0)) {
          throw new Error('AI suggested invalid move');
        }
        
        return new Response(
          JSON.stringify({ move, reasoning: args.reasoning || 'Expert analysis' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error('No valid AI response');
    } catch (e) {
      console.error('LLM path failed:', e);
      const fallback = hexAIFallback();
      return new Response(
        JSON.stringify({ ...fallback, reasoning: fallback.reasoning + ' (fallback used)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }


  } catch (error) {
    console.error('Error in ai-move:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

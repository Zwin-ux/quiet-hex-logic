import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type AIDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

// MCTS Node for tree search
class MCTSNode {
  move: number | null;
  parent: MCTSNode | null;
  children: MCTSNode[];
  wins: number;
  visits: number;
  untriedMoves: number[];

  constructor(move: number | null, parent: MCTSNode | null, untriedMoves: number[]) {
    this.move = move;
    this.parent = parent;
    this.children = [];
    this.wins = 0;
    this.visits = 0;
    this.untriedMoves = [...untriedMoves];
  }

  uct(explorationParam = 1.41): number {
    if (this.visits === 0) return Infinity;
    return (this.wins / this.visits) + 
           explorationParam * Math.sqrt(Math.log(this.parent!.visits) / this.visits);
  }

  selectChild(): MCTSNode {
    return this.children.reduce((best, child) => 
      child.uct() > best.uct() ? child : best
    );
  }

  addChild(move: number, untriedMoves: number[]): MCTSNode {
    const child = new MCTSNode(move, this, untriedMoves);
    this.untriedMoves = this.untriedMoves.filter(m => m !== move);
    this.children.push(child);
    return child;
  }

  update(result: number): void {
    this.visits++;
    this.wins += result;
  }
}

// Enhanced Hex engine with MCTS
class HexAI {
  board: number[];
  size: number;
  turn: number;
  transpositionTable: Map<string, { wins: number; visits: number }>;

  constructor(size: number, board: number[], turn: number) {
    this.size = size;
    this.board = [...board];
    this.turn = turn;
    this.transpositionTable = new Map();
  }

  getBoardHash(): string {
    return this.board.join(',');
  }

  getEmptyCells(): number[] {
    return this.board
      .map((val, idx) => val === 0 ? idx : -1)
      .filter(idx => idx !== -1);
  }

  coords(i: number): [number, number] {
    return [i % this.size, Math.floor(i / this.size)];
  }

  clone(): HexAI {
    const cloned = new HexAI(this.size, this.board, this.turn);
    cloned.transpositionTable = this.transpositionTable;
    return cloned;
  }

  makeMove(move: number): void {
    const color = this.turn % 2 === 1 ? 1 : 2;
    this.board[move] = color;
    this.turn++;
  }

  // MCTS Expert Move
  getMCTSMove(timeBudgetMs = 120): { move: number | null, reasoning: string } {
    const empty = this.getEmptyCells();
    if (empty.length === 0) return { move: null, reasoning: 'No moves available' };
    if (empty.length === 1) return { move: empty[0], reasoning: 'Only move available' };

    const currentColor = this.turn % 2 === 1 ? 1 : 2;
    
    // Check immediate win
    for (const move of empty) {
      const test = this.clone();
      test.makeMove(move);
      if (test.checkWinner(currentColor)) {
        return { move, reasoning: 'Winning move found by MCTS' };
      }
    }

    // Check immediate block
    const opponentColor = currentColor === 1 ? 2 : 1;
    for (const move of empty) {
      const test = this.clone();
      test.board[move] = opponentColor;
      if (test.checkWinner(opponentColor)) {
        return { move, reasoning: 'Blocking critical threat (MCTS)' };
      }
    }

    // Run MCTS
    const rootNode = new MCTSNode(null, null, empty);
    const startTime = Date.now();
    let iterations = 0;

    while (Date.now() - startTime < timeBudgetMs && iterations < 1000) {
      iterations++;
      
      // Selection
      let node = rootNode;
      const state = this.clone();
      
      while (node.untriedMoves.length === 0 && node.children.length > 0) {
        node = node.selectChild();
        if (node.move !== null) {
          state.makeMove(node.move);
        }
      }

      // Expansion
      if (node.untriedMoves.length > 0) {
        const move = node.untriedMoves[Math.floor(Math.random() * node.untriedMoves.length)];
        state.makeMove(move);
        node = node.addChild(move, state.getEmptyCells());
      }

      // Simulation (lightweight playout with heuristic)
      const result = this.simulate(state, currentColor);

      // Backpropagation
      let currentNode: MCTSNode | null = node;
      while (currentNode !== null) {
        currentNode.update(result);
        currentNode = currentNode.parent;
      }
    }

    // Select best move
    if (rootNode.children.length === 0) {
      return { move: empty[0], reasoning: 'Fallback move' };
    }

    const bestChild = rootNode.children.reduce((best, child) => 
      child.visits > best.visits ? child : best
    );

    const winRate = ((bestChild.wins / bestChild.visits) * 100).toFixed(1);
    return { 
      move: bestChild.move!, 
      reasoning: `MCTS analysis: ${iterations} iterations, ${winRate}% win rate` 
    };
  }

  // Heuristic-guided simulation (not random)
  simulate(state: HexAI, playerColor: number): number {
    const simulationState = state.clone();
    const maxPlies = 30; // Limit simulation depth
    let ply = 0;

    while (ply < maxPlies) {
      const empty = simulationState.getEmptyCells();
      if (empty.length === 0) break;

      const currentColor = simulationState.turn % 2 === 1 ? 1 : 2;
      const winner = simulationState.checkWinner(1) || simulationState.checkWinner(2);
      if (winner) break;

      // Heuristic move selection (not pure random)
      const move = this.selectHeuristicMove(simulationState, empty, currentColor);
      simulationState.makeMove(move);
      ply++;
    }

    // Evaluate final position
    if (simulationState.checkWinner(playerColor)) return 1;
    if (simulationState.checkWinner(playerColor === 1 ? 2 : 1)) return 0;
    
    // Heuristic evaluation if no winner
    return this.evaluatePosition(simulationState, playerColor);
  }

  selectHeuristicMove(state: HexAI, empty: number[], color: number): number {
    let bestMove = empty[0];
    let bestScore = -Infinity;

    for (const move of empty.slice(0, Math.min(empty.length, 10))) {
      let score = Math.random() * 2; // Small randomness

      const [c, r] = state.coords(move);
      if (color === 1) {
        score += 10 - Math.min(c, state.size - 1 - c);
      } else {
        score += 10 - Math.min(r, state.size - 1 - r);
      }

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  evaluatePosition(state: HexAI, playerColor: number): number {
    // Heuristic: count progress toward goal
    let score = 0.5; // Neutral

    for (let i = 0; i < state.board.length; i++) {
      if (state.board[i] === playerColor) {
        const [c, r] = state.coords(i);
        if (playerColor === 1) {
          score += c / (state.size * 100); // Progress toward east
        } else {
          score += r / (state.size * 100); // Progress toward south
        }
      }
    }

    return Math.max(0, Math.min(1, score));
  }

  // Hard AI with bridge detection
  getHardMove(): { move: number | null, reasoning: string } {
    const empty = this.getEmptyCells();
    if (empty.length === 0) return { move: null, reasoning: 'No moves available' };

    const currentColor = this.turn % 2 === 1 ? 1 : 2;
    const opponentColor = currentColor === 1 ? 2 : 1;

    // Check immediate win
    for (const move of empty) {
      const test = this.clone();
      test.makeMove(move);
      if (test.checkWinner(currentColor)) {
        return { move, reasoning: 'Winning move!' };
      }
    }

    // Check immediate block
    for (const move of empty) {
      const test = this.clone();
      test.board[move] = opponentColor;
      if (test.checkWinner(opponentColor)) {
        return { move, reasoning: 'Blocking critical threat!' };
      }
    }

    // Bridge detection
    const bridgeMove = this.findBridgeMove(empty, currentColor);
    if (bridgeMove !== null) {
      return { move: bridgeMove, reasoning: 'Creating tactical bridge' };
    }

    // Fallback to positional heuristic
    return this.getMediumMove();
  }

  findBridgeMove(empty: number[], color: number): number | null {
    const myStones = [];
    for (let i = 0; i < this.board.length; i++) {
      if (this.board[i] === color) myStones.push(i);
    }

    for (let i = 0; i < myStones.length; i++) {
      for (let j = i + 1; j < myStones.length; j++) {
        const stone1 = myStones[i];
        const stone2 = myStones[j];
        
        const neighbors1 = this.getNeighbors(stone1);
        const neighbors2 = this.getNeighbors(stone2);
        
        const bridgePoints = neighbors1.filter(n1 => 
          neighbors2.includes(n1) && 
          this.board[n1] === 0 &&
          empty.includes(n1)
        );
        
        if (bridgePoints.length === 2) {
          return bridgePoints[0]; // Play one of the bridge points
        }
      }
    }
    
    return null;
  }

  getMediumMove(): { move: number | null, reasoning: string } {
    const empty = this.getEmptyCells();
    if (empty.length === 0) return { move: null, reasoning: 'No moves available' };

    const currentColor = this.turn % 2 === 1 ? 1 : 2;
    const center = Math.floor(this.size / 2);

    let bestMove = empty[0];
    let bestScore = -Infinity;

    for (const move of empty) {
      const [c, r] = this.coords(move);
      let score = 0;

      if (currentColor === 1) {
        score += 10 - Math.min(c, this.size - 1 - c);
        score += 5 - Math.abs(r - center);
      } else {
        score += 10 - Math.min(r, this.size - 1 - r);
        score += 5 - Math.abs(c - center);
      }

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return { move: bestMove, reasoning: 'Positional advantage' };
  }

  getNeighbors(cell: number): number[] {
    const [col, row] = this.coords(cell);
    const neighbors: number[] = [];
    
    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]];
    
    for (const [dc, dr] of directions) {
      const nc = col + dc;
      const nr = row + dr;
      if (nc >= 0 && nc < this.size && nr >= 0 && nr < this.size) {
        neighbors.push(nr * this.size + nc);
      }
    }
    
    return neighbors;
  }

  checkWinner(color: number): boolean {
    const start = color === 1 ? 
      Array.from({length: this.size}, (_, i) => i * this.size) :
      Array.from({length: this.size}, (_, i) => i);
    
    const visited = new Set<number>();
    const queue: number[] = [];
    
    for (const cell of start) {
      if (this.board[cell] === color) {
        queue.push(cell);
        visited.add(cell);
      }
    }
    
    while (queue.length > 0) {
      const cell = queue.shift()!;
      const [col, row] = this.coords(cell);
      
      if (color === 1 && col === this.size - 1) return true;
      if (color === 2 && row === this.size - 1) return true;
      
      const neighbors = this.getNeighbors(cell);
      for (const neighbor of neighbors) {
        if (this.board[neighbor] === color && !visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch match
    const { data: match } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (!match) {
      return new Response(JSON.stringify({ error: 'Match not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch moves
    const { data: moves } = await supabase
      .from('moves')
      .select('cell')
      .eq('match_id', matchId)
      .order('ply', { ascending: true });

    // Reconstruct board
    const board = Array(match.size * match.size).fill(0);
    let turn = 1;
    for (const move of moves || []) {
      if (move.cell !== null) {
        const color = turn % 2 === 1 ? 1 : 2;
        board[move.cell] = color;
      }
      turn++;
    }

    const ai = new HexAI(match.size, board, match.turn);

    let result;
    if (difficulty === 'expert') {
      // Use MCTS for expert
      result = ai.getMCTSMove(120);
    } else if (difficulty === 'hard') {
      result = ai.getHardMove();
    } else {
      result = ai.getMediumMove();
    }

    if (result.move === null) {
      return new Response(JSON.stringify({ error: 'No legal moves' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      cell: result.move,
      reasoning: result.reasoning,
      difficulty
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('AI move error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

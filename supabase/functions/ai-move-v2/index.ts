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

// Opening book for strong first moves (center and near-center)
const OPENING_BOOK: Record<number, number[]> = {
  7: [24, 23, 25, 17, 18, 31, 32], // 7x7 center cluster
  9: [40, 39, 41, 31, 32, 49, 50], // 9x9 center cluster
  11: [60, 59, 61, 49, 50, 71, 72, 48, 51, 70, 73], // 11x11 center cluster
  13: [84, 83, 85, 71, 72, 97, 98, 70, 73, 96, 99], // 13x13 center cluster
};

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

  // MCTS Expert Move - Significantly strengthened
  getMCTSMove(timeBudgetMs = 500): { move: number | null, reasoning: string } {
    const empty = this.getEmptyCells();
    if (empty.length === 0) return { move: null, reasoning: 'No moves available' };
    if (empty.length === 1) return { move: empty[0], reasoning: 'Only move available' };

    const currentColor = this.turn % 2 === 1 ? 1 : 2;
    const opponentColor = currentColor === 1 ? 2 : 1;
    const stonesPlayed = this.board.filter(c => c !== 0).length;

    // Use opening book for first 2 moves
    if (stonesPlayed <= 2) {
      const openingMoves = OPENING_BOOK[this.size] || [];
      const availableOpenings = openingMoves.filter(m => this.board[m] === 0);
      if (availableOpenings.length > 0) {
        // Pick the best available opening move (first in list = strongest)
        const move = availableOpenings[0];
        return { move, reasoning: '📖 Opening book move - center control' };
      }
    }

    // Check immediate win
    for (const move of empty) {
      const test = this.clone();
      test.makeMove(move);
      if (test.checkWinner(currentColor)) {
        return { move, reasoning: '🏆 Winning move!' };
      }
    }

    // Check immediate block
    for (const move of empty) {
      const test = this.clone();
      test.board[move] = opponentColor;
      if (test.checkWinner(opponentColor)) {
        return { move, reasoning: '🛡️ Blocking critical threat!' };
      }
    }

    // Check for virtual connections (bridges) - two moves that guarantee connection
    const virtualConnectionMove = this.findVirtualConnectionMove(empty, currentColor);
    if (virtualConnectionMove !== null) {
      return { move: virtualConnectionMove, reasoning: '🌉 Creating virtual connection' };
    }

    // Prioritize moves that create or extend bridges
    const bridgeMoves = this.findAllBridgeMoves(empty, currentColor);

    // Run MCTS with extended time and iterations
    const rootNode = new MCTSNode(null, null, empty);
    const startTime = Date.now();
    let iterations = 0;
    const maxIterations = 5000; // Increased from 1000

    while (Date.now() - startTime < timeBudgetMs && iterations < maxIterations) {
      iterations++;

      // Selection with improved UCT
      let node = rootNode;
      const state = this.clone();

      while (node.untriedMoves.length === 0 && node.children.length > 0) {
        node = node.selectChild();
        if (node.move !== null) {
          state.makeMove(node.move);
        }
      }

      // Expansion - prioritize bridge moves when expanding
      if (node.untriedMoves.length > 0) {
        let move: number;
        const bridgeInUntried = node.untriedMoves.filter(m => bridgeMoves.includes(m));
        if (bridgeInUntried.length > 0 && Math.random() < 0.7) {
          // 70% chance to prioritize bridge moves
          move = bridgeInUntried[Math.floor(Math.random() * bridgeInUntried.length)];
        } else {
          move = node.untriedMoves[Math.floor(Math.random() * node.untriedMoves.length)];
        }
        state.makeMove(move);
        node = node.addChild(move, state.getEmptyCells());
      }

      // Simulation with improved heuristics
      const result = this.simulateExpert(state, currentColor);

      // Backpropagation
      let currentNode: MCTSNode | null = node;
      while (currentNode !== null) {
        currentNode.update(result);
        currentNode = currentNode.parent;
      }
    }

    // Select best move
    if (rootNode.children.length === 0) {
      // Fallback to bridge moves or center moves
      if (bridgeMoves.length > 0) {
        return { move: bridgeMoves[0], reasoning: 'Bridge move fallback' };
      }
      return { move: empty[0], reasoning: 'Fallback move' };
    }

    const bestChild = rootNode.children.reduce((best, child) =>
      child.visits > best.visits ? child : best
    );

    const winRate = ((bestChild.wins / bestChild.visits) * 100).toFixed(1);
    const confidenceEmoji = parseFloat(winRate) > 70 ? '💪' : parseFloat(winRate) > 50 ? '🎯' : '🤔';
    const reasoning = `${confidenceEmoji} MCTS: ${iterations} iterations, ${winRate}% confidence`;

    return {
      move: bestChild.move!,
      reasoning
    };
  }

  // Find a move that creates a virtual connection (guaranteed connection via bridge)
  findVirtualConnectionMove(empty: number[], color: number): number | null {
    const myStones: number[] = [];
    for (let i = 0; i < this.board.length; i++) {
      if (this.board[i] === color) myStones.push(i);
    }

    // Check if any move creates a bridge that extends toward the goal
    for (const move of empty) {
      const neighbors = this.getNeighbors(move);
      const friendlyNeighbors = neighbors.filter(n => this.board[n] === color);

      if (friendlyNeighbors.length >= 2) {
        // This move connects multiple friendly groups - high value
        const [c, r] = this.coords(move);
        const isOnPath = color === 1 ?
          (c > 0 && c < this.size - 1) : // For player 1: not on edges
          (r > 0 && r < this.size - 1);  // For player 2: not on edges

        if (isOnPath) {
          return move;
        }
      }
    }
    return null;
  }

  // Find all moves that create or complete bridges
  findAllBridgeMoves(empty: number[], color: number): number[] {
    const bridgeMoves: number[] = [];
    const myStones: number[] = [];

    for (let i = 0; i < this.board.length; i++) {
      if (this.board[i] === color) myStones.push(i);
    }

    for (const move of empty) {
      const neighbors = this.getNeighbors(move);

      // Check if this move is adjacent to any of our stones
      const hasAdjacentFriend = neighbors.some(n => this.board[n] === color);

      if (hasAdjacentFriend) {
        // Check if placing here completes or creates a bridge pattern
        for (const stone of myStones) {
          const stoneNeighbors = this.getNeighbors(stone);
          const commonEmpty = neighbors.filter(n =>
            stoneNeighbors.includes(n) &&
            this.board[n] === 0 &&
            n !== move
          );

          if (commonEmpty.length >= 1) {
            // This forms part of a bridge pattern
            bridgeMoves.push(move);
            break;
          }
        }
      }
    }

    return bridgeMoves;
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

  // Enhanced expert simulation with deeper analysis
  simulateExpert(state: HexAI, playerColor: number): number {
    const simulationState = state.clone();
    const maxPlies = 60; // Increased from 30 for deeper analysis
    let ply = 0;

    while (ply < maxPlies) {
      const empty = simulationState.getEmptyCells();
      if (empty.length === 0) break;

      const currentColor = simulationState.turn % 2 === 1 ? 1 : 2;

      // Check for winner
      if (simulationState.checkWinner(1)) {
        return playerColor === 1 ? 1 : 0;
      }
      if (simulationState.checkWinner(2)) {
        return playerColor === 2 ? 1 : 0;
      }

      // Smart move selection with forced moves
      const opponentColor = currentColor === 1 ? 2 : 1;

      // Check for winning move
      for (const move of empty.slice(0, Math.min(empty.length, 20))) {
        const test = simulationState.clone();
        test.makeMove(move);
        if (test.checkWinner(currentColor)) {
          simulationState.makeMove(move);
          ply++;
          continue;
        }
      }

      // Check for blocking move
      for (const move of empty.slice(0, Math.min(empty.length, 20))) {
        const test = simulationState.clone();
        test.board[move] = opponentColor;
        if (test.checkWinner(opponentColor)) {
          simulationState.makeMove(move);
          ply++;
          continue;
        }
      }

      // Use smarter heuristic move selection
      const move = this.selectSmartMove(simulationState, empty, currentColor);
      simulationState.makeMove(move);
      ply++;
    }

    // Evaluate final position with shortest path heuristic
    if (simulationState.checkWinner(playerColor)) return 1;
    if (simulationState.checkWinner(playerColor === 1 ? 2 : 1)) return 0;

    return this.evaluatePositionExpert(simulationState, playerColor);
  }

  // Smarter move selection for simulations
  selectSmartMove(state: HexAI, empty: number[], color: number): number {
    let bestMove = empty[0];
    let bestScore = -Infinity;

    // Sample up to 15 moves for efficiency
    const sampled = empty.length <= 15 ? empty : empty.slice(0, 15);

    for (const move of sampled) {
      let score = Math.random() * 2; // Small randomness

      const [c, r] = state.coords(move);
      const center = Math.floor(state.size / 2);

      // Positional score based on goal direction
      if (color === 1) {
        // Player 1 wants to connect West-East
        score += 12 - Math.min(c, state.size - 1 - c);
        score += 6 - Math.abs(r - center); // Prefer center rows
      } else {
        // Player 2 wants to connect North-South
        score += 12 - Math.min(r, state.size - 1 - r);
        score += 6 - Math.abs(c - center); // Prefer center columns
      }

      // Connectivity bonus
      const neighbors = state.getNeighbors(move);
      let friendCount = 0;
      let enemyCount = 0;
      const opponentColor = color === 1 ? 2 : 1;

      for (const n of neighbors) {
        if (state.board[n] === color) friendCount++;
        if (state.board[n] === opponentColor) enemyCount++;
      }

      score += friendCount * 5; // Bonus for connecting to friendly stones
      score += enemyCount * 3;  // Bonus for blocking enemy

      // Penalty for redundant connections (already well-connected)
      if (friendCount >= 3) score -= 3;

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  // Expert position evaluation using connectivity analysis
  evaluatePositionExpert(state: HexAI, playerColor: number): number {
    // Use shortest path to goal as primary heuristic
    const myPath = state.shortestPathToGoal(playerColor);
    const oppPath = state.shortestPathToGoal(playerColor === 1 ? 2 : 1);

    if (myPath === 0) return 1.0; // We've won
    if (oppPath === 0) return 0.0; // Opponent won

    // Score based on who has the shorter path
    const pathDiff = oppPath - myPath;
    const baseScore = 0.5 + (pathDiff * 0.05);

    // Add stone count bonus
    let myStones = 0;
    let oppStones = 0;
    for (const cell of state.board) {
      if (cell === playerColor) myStones++;
      if (cell === (playerColor === 1 ? 2 : 1)) oppStones++;
    }

    const stoneBonus = (myStones - oppStones) * 0.01;

    return Math.max(0, Math.min(1, baseScore + stoneBonus));
  }

  // Calculate shortest path to goal (simple BFS-based)
  shortestPathToGoal(color: number): number {
    const size = this.size;

    // Start cells (where we need to connect from)
    const startCells: number[] = [];
    for (let i = 0; i < size * size; i++) {
      if (this.board[i] === color) {
        const [c, r] = this.coords(i);
        if (color === 1 && c === 0) startCells.push(i);
        if (color === 2 && r === 0) startCells.push(i);
      }
    }

    // If no stones on start edge, count from start edge
    if (startCells.length === 0) {
      for (let i = 0; i < size; i++) {
        if (color === 1) startCells.push(i * size); // West column
        else startCells.push(i); // North row
      }
    }

    // BFS to find shortest path
    const dist = new Map<number, number>();
    const queue: number[] = [];

    for (const cell of startCells) {
      dist.set(cell, this.board[cell] === color ? 0 : 1);
      queue.push(cell);
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentDist = dist.get(current)!;

      const [c, r] = this.coords(current);

      // Check if reached goal
      if (color === 1 && c === size - 1) return currentDist;
      if (color === 2 && r === size - 1) return currentDist;

      for (const neighbor of this.getNeighbors(current)) {
        if (!dist.has(neighbor) || dist.get(neighbor)! > currentDist + 1) {
          const cellVal = this.board[neighbor];
          const cost = cellVal === color ? 0 : (cellVal === 0 ? 1 : 100); // Enemy = very high cost
          const newDist = currentDist + cost;

          if (!dist.has(neighbor) || dist.get(neighbor)! > newDist) {
            dist.set(neighbor, newDist);
            queue.push(neighbor);
          }
        }
      }
    }

    return 100; // No path found
  }

  selectHeuristicMove(state: HexAI, empty: number[], color: number): number {
    let bestMove = empty[0];
    let bestScore = -Infinity;

    for (const move of empty.slice(0, Math.min(empty.length, 12))) {
      let score = Math.random() * 3; // Small randomness

      const [c, r] = state.coords(move);
      if (color === 1) {
        score += 10 - Math.min(c, state.size - 1 - c);
      } else {
        score += 10 - Math.min(r, state.size - 1 - r);
      }

      // Blocking heuristic in simulation
      const neighbors = state.getNeighbors(move);
      const opponentColor = color === 1 ? 2 : 1;
      const blockingPotential = neighbors.filter(n => state.board[n] === opponentColor).length;
      score += blockingPotential * 4;

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

  // Easy AI (fallback for errors)
  getEasyMove(): { move: number | null, reasoning: string } {
    const empty = this.getEmptyCells();
    if (empty.length === 0) return { move: null, reasoning: 'No moves available' };

    const center = Math.floor(this.size / 2);
    const currentColor = this.turn % 2 === 1 ? 1 : 2;
    
    // 60% chance to play near center or friendly stones
    if (Math.random() < 0.6) {
      const friendlyCells = empty.filter(cell => {
        const neighbors = this.getNeighbors(cell);
        return neighbors.some(n => this.board[n] === currentColor);
      });
      
      if (friendlyCells.length > 0) {
        const move = friendlyCells[Math.floor(Math.random() * friendlyCells.length)];
        return { move, reasoning: 'Exploring near my stones' };
      }
      
      const centerCells = empty.filter(cell => {
        const [c, r] = this.coords(cell);
        const dist = Math.abs(c - center) + Math.abs(r - center);
        return dist <= 2;
      });
      
      if (centerCells.length > 0) {
        const move = centerCells[Math.floor(Math.random() * centerCells.length)];
        return { move, reasoning: 'Playing near the center' };
      }
    }
    
    const move = empty[Math.floor(Math.random() * empty.length)];
    return { move, reasoning: 'Exploring the board' };
  }

  getMediumMove(): { move: number | null, reasoning: string } {
    const empty = this.getEmptyCells();
    if (empty.length === 0) return { move: null, reasoning: 'No moves available' };

    const currentColor = this.turn % 2 === 1 ? 1 : 2;
    const opponentColor = currentColor === 1 ? 2 : 1;
    const center = Math.floor(this.size / 2);

    let bestMove = empty[0];
    let bestScore = -Infinity;

    for (const move of empty) {
      const [c, r] = this.coords(move);
      let score = 0;

      // Base positional score
      if (currentColor === 1) {
        score += 20 - Math.min(c, this.size - 1 - c);
        score += 10 - Math.abs(r - center);
      } else {
        score += 20 - Math.min(r, this.size - 1 - r);
        score += 10 - Math.abs(c - center);
      }

      // Adjacency and bridge bonuses
      const neighbors = this.getNeighbors(move);
      let adjacentFriends = 0;
      let formsBridge = false;
      
      for (const neighbor of neighbors) {
        if (this.board[neighbor] === currentColor) {
          adjacentFriends++;
          const commonNeighbors = this.getNeighbors(neighbor).filter(n => 
            neighbors.includes(n) && this.board[n] === currentColor
          );
          if (commonNeighbors.length > 0) formsBridge = true;
        }
      }
      
      if (formsBridge) score += 8;
      score += adjacentFriends * 5;
      if (adjacentFriends > 2) score -= 5; // Redundancy penalty
      
      // Add randomness
      score += (Math.random() - 0.5) * 3;

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return { move: bestMove, reasoning: 'Building tactical position' };
  }

  getNeighbors(cell: number): number[] {
    const [col, row] = this.coords(cell);
    const neighbors: number[] = [];
    
    // Offset coordinates (odd-q): odd columns shifted down
    const deltasEven = [[1, -1], [1, 0], [0, 1], [-1, 0], [-1, -1], [0, -1]]; // [dc, dr]
    const deltasOdd = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [0, -1]];   // [dc, dr]
    
    const deltas = col % 2 === 0 ? deltasEven : deltasOdd;
    
    for (const [dc, dr] of deltas) {
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

    // Fallback ladder: Expert → Hard → Medium → Easy
    let result;
    let usedDifficulty = difficulty;
    
    try {
      if (difficulty === 'expert') {
        // Use MCTS for expert (500ms budget, ~3000-5000 iterations)
        result = ai.getMCTSMove(500);
      } else if (difficulty === 'hard') {
        result = ai.getHardMove();
      } else if (difficulty === 'medium') {
        result = ai.getMediumMove();
      } else {
        result = ai.getEasyMove();
      }
      
      if (result.move === null) {
        throw new Error('AI returned no move');
      }
    } catch (error) {
      console.error(`${difficulty} AI failed, falling back:`, error);
      
      // Implement fallback chain
      if (difficulty === 'expert') {
        console.log('Falling back to Hard AI');
        result = ai.getHardMove();
        usedDifficulty = 'hard';
      } else if (difficulty === 'hard') {
        console.log('Falling back to Medium AI');
        result = ai.getMediumMove();
        usedDifficulty = 'medium';
      } else if (difficulty === 'medium') {
        console.log('Falling back to Easy AI');
        result = ai.getEasyMove();
        usedDifficulty = 'easy';
      } else {
        // Easy AI failed - use random move as ultimate fallback
        const empty = ai.getEmptyCells();
        if (empty.length === 0) {
          return new Response(JSON.stringify({ error: 'No legal moves' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        result = { move: empty[0], reasoning: 'Random fallback move' };
      }
      
      if (result.move === null) {
        return new Response(JSON.stringify({ error: 'All AI levels failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response(JSON.stringify({
      cell: result.move,
      reasoning: result.reasoning,
      difficulty: usedDifficulty
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

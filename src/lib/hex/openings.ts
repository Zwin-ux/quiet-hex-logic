/**
 * Hex Opening Book
 * Common opening moves and strategies for different board sizes
 */

export type OpeningMove = {
  cell: number;
  name: string;
  description: string;
  strength: 'strong' | 'moderate' | 'weak';
  isCenter: boolean;
};

export type Opening = {
  id: string;
  name: string;
  description: string;
  boardSize: number;
  moves: { cell: number; color: 1 | 2 }[];
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  winRate?: number;
};

// Calculate center and strong opening positions for a given board size
export function getOpeningRecommendations(boardSize: number, ply: number): OpeningMove[] {
  const center = Math.floor(boardSize / 2);
  const n = boardSize;
  
  // Convert (col, row) to linear index
  const idx = (c: number, r: number) => r * n + c;
  
  if (ply === 0) {
    // First move recommendations (Player 1 - connecting West-East)
    const recommendations: OpeningMove[] = [
      {
        cell: idx(center, center),
        name: 'Center',
        description: 'Classic strong opening. Controls the board center.',
        strength: 'strong',
        isCenter: true,
      },
      {
        cell: idx(center + 1, center - 1),
        name: 'Acute Corner',
        description: 'Strong alternative avoiding pie rule swap.',
        strength: 'strong',
        isCenter: false,
      },
      {
        cell: idx(center - 1, center + 1),
        name: 'Obtuse Corner',
        description: 'Flexible opening with good positional value.',
        strength: 'moderate',
        isCenter: false,
      },
      {
        cell: idx(center, center - 1),
        name: 'Upper Center',
        description: 'Slightly off-center, reduces pie rule risk.',
        strength: 'moderate',
        isCenter: false,
      },
    ];
    
    return recommendations.filter(r => 
      r.cell >= 0 && r.cell < boardSize * boardSize
    );
  }
  
  if (ply === 1) {
    // Second move recommendations (Player 2 - connecting North-South)
    const recommendations: OpeningMove[] = [
      {
        cell: idx(center, center),
        name: 'Center Response',
        description: 'If available, take center for strong position.',
        strength: 'strong',
        isCenter: true,
      },
      {
        cell: idx(center - 1, center),
        name: 'Adjacent Block',
        description: 'Block opponent\'s path while building your own.',
        strength: 'strong',
        isCenter: false,
      },
      {
        cell: idx(center, center + 1),
        name: 'Lower Center',
        description: 'Start building towards south edge.',
        strength: 'moderate',
        isCenter: false,
      },
      {
        cell: idx(center + 1, center),
        name: 'Flank Position',
        description: 'Develop on the flank to create options.',
        strength: 'moderate',
        isCenter: false,
      },
    ];
    
    return recommendations.filter(r => 
      r.cell >= 0 && r.cell < boardSize * boardSize
    );
  }
  
  return [];
}

// Common named openings for reference
export const NAMED_OPENINGS: Opening[] = [
  {
    id: 'center-classic',
    name: 'Center Classic',
    description: 'The most common and solid opening. Place your first stone in the center of the board.',
    boardSize: 11,
    moves: [{ cell: 60, color: 1 }],
    tags: ['popular', 'solid', 'beginner-friendly'],
    difficulty: 'beginner',
    winRate: 52,
  },
  {
    id: 'obtuse-corner',
    name: 'Obtuse Corner Opening',
    description: 'Play in the obtuse corner to avoid pie rule while maintaining strong position.',
    boardSize: 11,
    moves: [{ cell: 71, color: 1 }],
    tags: ['anti-pie', 'positional'],
    difficulty: 'intermediate',
    winRate: 50,
  },
  {
    id: 'acute-corner',
    name: 'Acute Corner Opening',
    description: 'Opening near the acute corner. Good for beginners learning edge play.',
    boardSize: 11,
    moves: [{ cell: 49, color: 1 }],
    tags: ['edge-play', 'beginner-friendly'],
    difficulty: 'beginner',
    winRate: 48,
  },
  {
    id: 'bridge-setup',
    name: 'Bridge Setup',
    description: 'Early bridge formation to create a strong connection framework.',
    boardSize: 11,
    moves: [
      { cell: 60, color: 1 },
      { cell: 59, color: 2 },
      { cell: 72, color: 1 },
    ],
    tags: ['advanced', 'connection', 'tactical'],
    difficulty: 'advanced',
    winRate: 54,
  },
  {
    id: 'ladder-defense',
    name: 'Ladder Defense',
    description: 'Defensive setup to prevent opponent ladder attacks.',
    boardSize: 11,
    moves: [
      { cell: 60, color: 1 },
      { cell: 61, color: 2 },
      { cell: 49, color: 1 },
      { cell: 50, color: 2 },
    ],
    tags: ['defensive', 'ladder', 'intermediate'],
    difficulty: 'intermediate',
    winRate: 51,
  },
];

// Opening strategies and tips
export const OPENING_STRATEGIES = [
  {
    title: 'The Pie Rule',
    description: 'In Hex with pie rule, the second player can swap colors after the first move. This balances the first-move advantage.',
    tip: 'Avoid playing exactly in the center on your first move if pie rule is enabled - your opponent will likely swap!',
  },
  {
    title: 'Control the Center',
    description: 'Central positions provide flexibility and influence over the entire board.',
    tip: 'Early center control allows you to adapt your strategy based on your opponent\'s responses.',
  },
  {
    title: 'Connect to Edges Early',
    description: 'As Player 1 (Red), aim to connect West to East. As Player 2 (Blue), connect North to South.',
    tip: 'Establishing connections to your target edges early makes your path clearer.',
  },
  {
    title: 'Bridge Connections',
    description: 'Two stones diagonal to each other form a "bridge" - a virtual connection that cannot be fully blocked.',
    tip: 'Learn to recognize and use bridge patterns for unbreakable connections.',
  },
  {
    title: 'Block Efficiently',
    description: 'When defending, place stones that both block your opponent AND advance your own connection.',
    tip: 'Every defensive move should also have offensive value when possible.',
  },
];

// Get opening tips based on game state
export function getOpeningTip(ply: number, pieRule: boolean): string | null {
  if (ply === 0) {
    if (pieRule) {
      return 'With pie rule enabled, consider playing slightly off-center to reduce the chance of your opponent swapping.';
    }
    return 'As first player, the center is usually the strongest opening.';
  }
  
  if (ply === 1 && pieRule) {
    return 'Consider the pie rule: is your opponent\'s position strong enough to swap?';
  }
  
  if (ply < 4) {
    return 'Focus on establishing connections toward your target edges while contesting the center.';
  }
  
  return null;
}

/**
 * AI Difficulty Configuration
 * Maps difficulty levels to ELO ratings and behavioral parameters
 */

export type AIDifficultyLevel = 'beginner' | 'easy' | 'medium' | 'hard' | 'expert' | 'master';

export interface DifficultyConfig {
  name: string;
  eloRange: [number, number];
  description: string;
  thinkTime: number; // ms
  errorRate: number; // 0-1, chance of making a suboptimal move
  depth: number; // search depth for MCTS iterations
  color: string; // tailwind color class
}

export const DIFFICULTY_CONFIGS: Record<AIDifficultyLevel, DifficultyConfig> = {
  beginner: {
    name: 'Beginner',
    eloRange: [600, 900],
    description: 'Makes obvious mistakes, good for learning',
    thinkTime: 200,
    errorRate: 0.4,
    depth: 50,
    color: 'bg-emerald-500'
  },
  easy: {
    name: 'Easy',
    eloRange: [900, 1100],
    description: 'Center-biased, misses complex threats',
    thinkTime: 400,
    errorRate: 0.25,
    depth: 100,
    color: 'bg-sky-500'
  },
  medium: {
    name: 'Medium',
    eloRange: [1100, 1300],
    description: 'Knows bridges, basic blocking',
    thinkTime: 600,
    errorRate: 0.15,
    depth: 200,
    color: 'bg-amber-500'
  },
  hard: {
    name: 'Hard',
    eloRange: [1300, 1500],
    description: 'Strong tactical play with MCTS',
    thinkTime: 1000,
    errorRate: 0.08,
    depth: 500,
    color: 'bg-orange-500'
  },
  expert: {
    name: 'Expert',
    eloRange: [1500, 1700],
    description: 'Deep MCTS with opening book',
    thinkTime: 1500,
    errorRate: 0.03,
    depth: 1000,
    color: 'bg-red-500'
  },
  master: {
    name: 'Master',
    eloRange: [1700, 2000],
    description: 'Neural-enhanced evaluation (Premium)',
    thinkTime: 2000,
    errorRate: 0.01,
    depth: 2000,
    color: 'bg-purple-500'
  }
};

/**
 * Get estimated ELO for a difficulty level
 */
export function getDifficultyElo(difficulty: AIDifficultyLevel): number {
  const config = DIFFICULTY_CONFIGS[difficulty];
  return Math.floor((config.eloRange[0] + config.eloRange[1]) / 2);
}

/**
 * Get difficulty level for a given ELO rating
 */
export function getEloToDifficulty(elo: number): AIDifficultyLevel {
  if (elo < 900) return 'beginner';
  if (elo < 1100) return 'easy';
  if (elo < 1300) return 'medium';
  if (elo < 1500) return 'hard';
  if (elo < 1700) return 'expert';
  return 'master';
}

/**
 * Get all difficulties as ordered array
 */
export function getDifficultyLevels(): AIDifficultyLevel[] {
  return ['beginner', 'easy', 'medium', 'hard', 'expert', 'master'];
}

/**
 * Check if difficulty requires premium
 */
export function isPremiumDifficulty(difficulty: AIDifficultyLevel): boolean {
  return difficulty === 'master';
}

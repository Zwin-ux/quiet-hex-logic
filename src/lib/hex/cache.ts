/**
 * Position caching for AI moves
 * Reduces computation time for repeated positions
 */

import { Hex } from './engine';

export interface CachedMove {
  move: number | null;
  reasoning: string;
  difficulty: string;
  timestamp: number;
}

/**
 * Generate a hash for a board position
 * Uses Zobrist-like hashing for fast position identification
 */
export function hashPosition(game: Hex): string {
  // Simple hash: concatenate board state with game metadata
  const boardStr = Array.from(game.board).join(',');
  return `${game.n}:${game.ply}:${game.turn}:${game.swapped}:${boardStr}`;
}

/**
 * Position cache with LRU eviction
 */
export class PositionCache {
  private cache: Map<string, CachedMove>;
  private maxSize: number;
  private accessOrder: string[];

  constructor(maxSize: number = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.accessOrder = [];
  }

  /**
   * Get cached move for position
   */
  get(game: Hex, difficulty: string): CachedMove | null {
    const hash = hashPosition(game);
    const key = `${hash}:${difficulty}`;
    const cached = this.cache.get(key);

    if (cached) {
      // Update access order (LRU)
      this.updateAccessOrder(key);
      return cached;
    }

    return null;
  }

  /**
   * Store move in cache
   */
  set(game: Hex, difficulty: string, move: number | null, reasoning: string): void {
    const hash = hashPosition(game);
    const key = `${hash}:${difficulty}`;

    // Evict oldest entry if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const oldestKey = this.accessOrder.shift();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const cached: CachedMove = {
      move,
      reasoning,
      difficulty,
      timestamp: Date.now()
    };

    this.cache.set(key, cached);
    this.updateAccessOrder(key);
  }

  /**
   * Update LRU access order
   */
  private updateAccessOrder(key: string): void {
    // Remove from current position
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    // Add to end (most recently used)
    this.accessOrder.push(key);
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }

  /**
   * Remove entries older than specified age (in milliseconds)
   */
  evictOld(maxAge: number): number {
    const now = Date.now();
    let evicted = 0;

    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > maxAge) {
        this.cache.delete(key);
        const index = this.accessOrder.indexOf(key);
        if (index > -1) {
          this.accessOrder.splice(index, 1);
        }
        evicted++;
      }
    }

    return evicted;
  }
}

// Global cache instance
export const globalPositionCache = new PositionCache(1000);

/**
 * Get cached AI move or compute new one
 */
export async function getCachedOrCompute<T extends Record<string, any>>(
  game: Hex,
  difficulty: string,
  computeFn: () => Promise<T>
): Promise<T & { fromCache: boolean }> {
  const cached = globalPositionCache.get(game, difficulty);

  if (cached) {
    return {
      ...cached,
      fromCache: true
    } as unknown as T & { fromCache: boolean };
  }

  const result = await computeFn();
  return {
    ...result,
    fromCache: false
  };
}

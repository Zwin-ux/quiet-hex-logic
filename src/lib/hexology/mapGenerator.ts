// Deterministic map generation
import type { HexCoord, TerrainType, Tile } from './types';
import { SeededRandom } from './seededRandom';
import { coordKey } from './hexMath';

export interface MapConfig {
  size: number; // radius
  seed: number;
  terrainWeights?: {
    plain: number;
    forest: number;
    hill: number;
  };
}

export function generateMap(config: MapConfig): Map<string, Tile> {
  const { size, seed, terrainWeights = { plain: 0.6, forest: 0.25, hill: 0.15 } } = config;
  const rng = new SeededRandom(seed);
  const tiles = new Map<string, Tile>();

  // Generate hexagonal map
  for (let q = -size; q <= size; q++) {
    const r1 = Math.max(-size, -q - size);
    const r2 = Math.min(size, -q + size);
    for (let r = r1; r <= r2; r++) {
      const coord: HexCoord = { q, r };
      const terrain = pickTerrain(rng, terrainWeights);
      
      tiles.set(coordKey(coord), {
        coord,
        terrain,
        owner: undefined,
        unit: undefined,
      });
    }
  }

  // Ensure symmetry for fairness (mirror across center)
  makeSymmetric(tiles, size);

  return tiles;
}

function pickTerrain(
  rng: SeededRandom,
  weights: { plain: number; forest: number; hill: number }
): TerrainType {
  const roll = rng.next();
  let cumulative = 0;

  for (const [terrain, weight] of Object.entries(weights)) {
    cumulative += weight;
    if (roll < cumulative) {
      return terrain as TerrainType;
    }
  }

  return 'plain';
}

function makeSymmetric(tiles: Map<string, Tile>, size: number): void {
  // Mirror terrain across the center (q=0, r=0)
  const processed = new Set<string>();

  for (const [key, tile] of tiles) {
    if (processed.has(key)) continue;

    const mirrored: HexCoord = { q: -tile.coord.q, r: -tile.coord.r };
    const mirroredKey = coordKey(mirrored);

    if (tiles.has(mirroredKey)) {
      // Set both to the same terrain
      const terrain = tile.terrain;
      tiles.get(mirroredKey)!.terrain = terrain;
      processed.add(key);
      processed.add(mirroredKey);
    }
  }
}

export function getStartingPositions(size: number): {
  team1: HexCoord[];
  team2: HexCoord[];
} {
  // Simple starting zones: opposite edges
  const team1: HexCoord[] = [];
  const team2: HexCoord[] = [];

  // Team 1: top-left area
  for (let q = -size; q <= -size + 2; q++) {
    for (let r = -2; r <= 2; r++) {
      if (Math.abs(q) + Math.abs(r) + Math.abs(-q - r) <= size * 2) {
        team1.push({ q, r });
      }
    }
  }

  // Team 2: bottom-right area (mirrored)
  for (const pos of team1) {
    team2.push({ q: -pos.q, r: -pos.r });
  }

  return { team1, team2 };
}

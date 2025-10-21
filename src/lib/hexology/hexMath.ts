// Hex grid math utilities (axial coordinates)
import type { HexCoord } from './types';

export function coordKey(coord: HexCoord): string {
  return `${coord.q},${coord.r}`;
}

export function parseCoordKey(key: string): HexCoord {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
}

export function hexDistance(a: HexCoord, b: HexCoord): number {
  const dq = Math.abs(a.q - b.q);
  const dr = Math.abs(a.r - b.r);
  return Math.floor((dq + dr + Math.abs(dq + dr)) / 2);
}

export function hexEquals(a: HexCoord, b: HexCoord): boolean {
  return a.q === b.q && a.r === b.r;
}

export function getNeighbors(coord: HexCoord): HexCoord[] {
  const directions = [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 },
  ];
  return directions.map(d => ({ q: coord.q + d.q, r: coord.r + d.r }));
}

export function hexLerp(a: HexCoord, b: HexCoord, t: number): { q: number; r: number } {
  return {
    q: a.q + (b.q - a.q) * t,
    r: a.r + (b.r - a.r) * t,
  };
}

export function hexRound(hex: { q: number; r: number }): HexCoord {
  let q = Math.round(hex.q);
  let r = Math.round(hex.r);
  const s = Math.round(-hex.q - hex.r);

  const qDiff = Math.abs(q - hex.q);
  const rDiff = Math.abs(r - hex.r);
  const sDiff = Math.abs(s + hex.q + hex.r);

  if (qDiff > rDiff && qDiff > sDiff) {
    q = -r - s;
  } else if (rDiff > sDiff) {
    r = -q - s;
  }

  return { q, r };
}

// Line-of-sight using hex lerp
export function getHexLine(a: HexCoord, b: HexCoord): HexCoord[] {
  const distance = hexDistance(a, b);
  const results: HexCoord[] = [];
  
  for (let i = 0; i <= distance; i++) {
    const t = distance === 0 ? 0 : i / distance;
    results.push(hexRound(hexLerp(a, b, t)));
  }
  
  return results;
}

// A* pathfinding for hex grid
export function findPath(
  start: HexCoord,
  goal: HexCoord,
  isBlocked: (coord: HexCoord) => boolean,
  maxDistance: number
): HexCoord[] | null {
  const openSet = new Set<string>([coordKey(start)]);
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();

  gScore.set(coordKey(start), 0);
  fScore.set(coordKey(start), hexDistance(start, goal));

  while (openSet.size > 0) {
    let current: string | null = null;
    let lowestF = Infinity;

    for (const key of openSet) {
      const f = fScore.get(key) ?? Infinity;
      if (f < lowestF) {
        lowestF = f;
        current = key;
      }
    }

    if (!current) break;

    const currentCoord = parseCoordKey(current);
    
    if (hexEquals(currentCoord, goal)) {
      // Reconstruct path
      const path: HexCoord[] = [currentCoord];
      let curr = current;
      while (cameFrom.has(curr)) {
        curr = cameFrom.get(curr)!;
        path.unshift(parseCoordKey(curr));
      }
      return path;
    }

    openSet.delete(current);

    for (const neighbor of getNeighbors(currentCoord)) {
      if (isBlocked(neighbor)) continue;

      const neighborKey = coordKey(neighbor);
      const tentativeG = (gScore.get(current) ?? Infinity) + 1;

      if (tentativeG > maxDistance) continue;

      if (tentativeG < (gScore.get(neighborKey) ?? Infinity)) {
        cameFrom.set(neighborKey, current);
        gScore.set(neighborKey, tentativeG);
        fScore.set(neighborKey, tentativeG + hexDistance(neighbor, goal));
        openSet.add(neighborKey);
      }
    }
  }

  return null;
}

// Flood fill for region detection
export function floodFill(
  start: HexCoord,
  isSameRegion: (coord: HexCoord) => boolean,
  maxSize: number = 1000
): Set<string> {
  const region = new Set<string>();
  const queue: HexCoord[] = [start];
  const visited = new Set<string>([coordKey(start)]);

  while (queue.length > 0 && region.size < maxSize) {
    const current = queue.shift()!;
    const key = coordKey(current);

    if (!isSameRegion(current)) continue;

    region.add(key);

    for (const neighbor of getNeighbors(current)) {
      const neighborKey = coordKey(neighbor);
      if (!visited.has(neighborKey)) {
        visited.add(neighborKey);
        queue.push(neighbor);
      }
    }
  }

  return region;
}

// Hexology game types adapted for Lovable architecture

export type HexCoord = { q: number; r: number };

export type TerrainType = 'plain' | 'forest' | 'hill';

export interface TerrainConfig {
  key: TerrainType;
  moveMod: number;
  defMod: number;
  losMod: number;
}

export const TERRAIN_CONFIGS: Record<TerrainType, TerrainConfig> = {
  plain: { key: 'plain', moveMod: 0, defMod: 0, losMod: 0 },
  forest: { key: 'forest', moveMod: 0, defMod: 1, losMod: -1 },
  hill: { key: 'hill', moveMod: -1, defMod: 0, losMod: 1 },
};

export type UnitClass = 'Skirmisher' | 'Guardian' | 'Arcanist';

export interface UnitConfig {
  class: UnitClass;
  hp: number;
  move: number;
  range: number;
  armor: number;
}

export const UNIT_CONFIGS: Record<UnitClass, UnitConfig> = {
  Skirmisher: { class: 'Skirmisher', hp: 6, move: 3, range: 1, armor: 0 },
  Guardian: { class: 'Guardian', hp: 10, move: 2, range: 1, armor: 2 },
  Arcanist: { class: 'Arcanist', hp: 5, move: 2, range: 3, armor: 0 },
};

export interface Unit {
  id: string;
  class: UnitClass;
  team: 1 | 2;
  hp: number;
  maxHp: number;
  pos: HexCoord;
  ap: number; // action points remaining this turn
  hasMoved: boolean;
  hasActed: boolean;
}

export interface Tile {
  coord: HexCoord;
  terrain: TerrainType;
  owner?: 1 | 2;
  unit?: Unit;
}

export interface GameState {
  matchId: string;
  seed: number;
  turn: number;
  currentTeam: 1 | 2;
  phase: 'draft' | 'main' | 'resolve';
  tiles: Map<string, Tile>; // key: "q,r"
  units: Map<string, Unit>; // key: unitId
  vp: { team1: number; team2: number };
  regions: { team1: Set<string>; team2: Set<string> }; // sets of "q,r" keys
  winner?: 1 | 2;
}

export type ActionType = 'join' | 'draft' | 'move' | 'attack' | 'endTurn' | 'surrender';

export interface BaseAction {
  type: ActionType;
  playerId: string;
  timestamp: number;
}

export interface JoinAction extends BaseAction {
  type: 'join';
  team: 1 | 2;
}

export interface DraftAction extends BaseAction {
  type: 'draft';
  unitClass: UnitClass;
  pos: HexCoord;
}

export interface MoveAction extends BaseAction {
  type: 'move';
  unitId: string;
  to: HexCoord;
}

export interface AttackAction extends BaseAction {
  type: 'attack';
  attackerId: string;
  targetId: string;
}

export interface EndTurnAction extends BaseAction {
  type: 'endTurn';
}

export interface SurrenderAction extends BaseAction {
  type: 'surrender';
}

export type GameAction = JoinAction | DraftAction | MoveAction | AttackAction | EndTurnAction | SurrenderAction;

export interface CombatResult {
  attackerId: string;
  targetId: string;
  damage: number;
  targetKilled: boolean;
  flankBonus: boolean;
}

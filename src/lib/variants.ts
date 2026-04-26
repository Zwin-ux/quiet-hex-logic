import { listGames } from "@/lib/engine/registry";

export type VariantScope = "official_global" | "public_registry" | "world_private";
export type VariantSourceKind =
  | "official_seed"
  | "simple_editor"
  | "package_upload"
  | "engine_pack";
export type EngineMode =
  | "standard"
  | "freestyle_chess"
  | "reverse_hex"
  | "international_draughts"
  | "popout";
export type AccessType = "public" | "world_members" | "access_code";

export type WorkshopVariant = {
  id: string;
  manifest_id?: string;
  name: string;
  description: string;
  game_key: string;
  rules: Record<string, unknown>;
  is_featured: boolean;
  latest_version_id?: string | null;
  author_id: string;
  created_at: string;
  updated_at?: string;
  world_id?: string | null;
  scope?: VariantScope;
  is_official?: boolean;
  featured_rank?: number | null;
  availability?: "hosted" | "self_host" | "beta";
  engine_mode?: EngineMode;
  validation_status?: "draft" | "validating" | "published" | "rejected";
  latest_rules?: Record<string, unknown> | null;
  source_kind?: VariantSourceKind;
  start_fen?: string | null;
  start_seed?: string | null;
  capabilities?: Record<string, unknown> | null;
  validation_notes?: Record<string, unknown> | null;
};

export type OfficialVariantSeed = {
  manifestId: string;
  name: string;
  description: string;
  gameKey: string;
  version: string;
  rules: Record<string, unknown>;
  hostedEnabled: boolean;
  availability: "hosted" | "self_host" | "beta";
  engineMode: EngineMode;
};

export const OFFICIAL_VARIANT_SEEDS: OfficialVariantSeed[] = [
  {
    manifestId: "official-hex-13x13",
    name: "13x13 Championship",
    description: "Long-form Hex with the classic swap rule intact.",
    gameKey: "hex",
    version: "1.0.0",
    rules: { boardSize: 13, pieRule: true },
    hostedEnabled: true,
    availability: "hosted",
    engineMode: "standard",
  },
  {
    manifestId: "official-hex-no-pie",
    name: "No Pie Classic",
    description: "Pure opening pressure. No color swap after move one.",
    gameKey: "hex",
    version: "1.0.0",
    rules: { pieRule: false },
    hostedEnabled: true,
    availability: "hosted",
    engineMode: "standard",
  },
  {
    manifestId: "official-checkers-chill",
    name: "Chill Checkers",
    description: "No forced captures and a shorter no-capture draw window.",
    gameKey: "checkers",
    version: "1.0.0",
    rules: {
      mandatoryCapture: false,
      draw: { threefoldRepetition: true, noCaptureHalfMoves: 20 },
    },
    hostedEnabled: true,
    availability: "hosted",
    engineMode: "standard",
  },
  {
    manifestId: "official-connect4-blitz",
    name: "Connect 3 Blitz",
    description: "First to connect three. Fast, noisy, immediate.",
    gameKey: "connect4",
    version: "1.0.0",
    rules: { connect: 3 },
    hostedEnabled: true,
    availability: "hosted",
    engineMode: "standard",
  },
  {
    manifestId: "official-chess-endgame-arena",
    name: "Endgame Arena",
    description: "Loads a stripped king-and-pawn endgame from the first move.",
    gameKey: "chess",
    version: "1.0.0",
    rules: { startFen: "8/8/8/8/8/2k5/2P5/2K5 w - - 0 1" },
    hostedEnabled: true,
    availability: "hosted",
    engineMode: "standard",
  },
  {
    manifestId: "official-chess-freestyle",
    name: "Freestyle Chess",
    description: "Chess960 start positions. Held back until the castling gate is green.",
    gameKey: "chess",
    version: "0.9.0",
    rules: {},
    hostedEnabled: false,
    availability: "beta",
    engineMode: "freestyle_chess",
  },
];

export const DEFAULT_WORLD_ACCENT = "#0e0e0f";

export function variantLabel(variant?: Pick<WorkshopVariant, "name" | "is_official"> | null) {
  if (!variant) return "Standard";
  return variant.is_official ? `Official / ${variant.name}` : variant.name;
}

export function groupVariantsForGame(
  mods: WorkshopVariant[],
  gameKey: string,
  worldId?: string,
) {
  const filtered = mods.filter((mod) => mod.game_key === gameKey);

  return {
    official: filtered
      .filter((mod) => mod.scope === "official_global" || mod.is_official)
      .sort((left, right) => (left.featured_rank ?? 999) - (right.featured_rank ?? 999)),
    club: filtered
      .filter((mod) => mod.scope === "world_private" && (!worldId || mod.world_id === worldId))
      .sort((left, right) => left.name.localeCompare(right.name)),
    workshop: filtered
      .filter((mod) => mod.scope === "public_registry" || (!mod.scope && !mod.is_official))
      .sort((left, right) => left.name.localeCompare(right.name)),
  };
}

export function buildSimpleEditorManifest(args: {
  worldId: string;
  gameKey: string;
  name: string;
  description?: string;
  rules: Record<string, unknown>;
}) {
  const slug = args.name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "variant";

  return {
    id: `world-${args.worldId}-${args.gameKey}-${slug}`,
    name: args.name.trim(),
    version: "1.0.0",
    description: args.description?.trim() || "",
    author: "BOARD",
    games: {
      [args.gameKey]: {
        rules: args.rules,
      },
    },
  };
}

export function gameDisplayName(gameKey: string) {
  return listGames().find((game) => game.key === gameKey)?.displayName ?? gameKey;
}

export function supportsBoardSize(gameKey: string) {
  return gameKey === "hex";
}

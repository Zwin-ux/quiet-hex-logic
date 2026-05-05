import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const SHOWCASE_WORLD = {
  slug: "founding-floor",
  name: "Founding Floor",
  description: "Hex. Chess. Checkers. Connect 4. Finals on May 1.",
  visibility: "public",
};

const SHOWCASE_TOURNAMENT = {
  name: "BOARD Colosseum Invitational",
  description: "Pass-backed invitational bracket. Human proof, event pass, sealed receipts.",
  format: "single_elimination",
  status: "registration",
  max_players: 16,
  min_players: 4,
  board_size: 11,
  pie_rule: true,
  turn_timer_seconds: 45,
  game_key: "hex",
  competitive_mode: true,
  access_type: "pass_required",
};

function parseEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;

  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }

  return out;
}

function loadFileEnv(cwd) {
  return {
    ...parseEnvFile(path.join(cwd, ".env")),
    ...parseEnvFile(path.join(cwd, ".env.local")),
  };
}

function firstEnv(fileEnv, keys) {
  for (const key of keys) {
    const value = (process.env[key] || fileEnv[key] || "").trim();
    if (value) return value;
  }
  return "";
}

function parseArgs(argv) {
  const [command = "inspect", ...rest] = argv;
  const options = {};
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = rest[index + 1];
    if (!next || next.startsWith("--")) {
      options[key] = "true";
      continue;
    }
    options[key] = next;
    index += 1;
  }
  return { command, options };
}

function requireConfig() {
  const fileEnv = loadFileEnv(process.cwd());
  const supabaseUrl = firstEnv(fileEnv, ["SUPABASE_URL", "VITE_SUPABASE_URL"]);
  const serviceRoleKey = firstEnv(fileEnv, ["SUPABASE_SERVICE_ROLE_KEY"]);

  if (!supabaseUrl) {
    throw new Error("Missing SUPABASE_URL or VITE_SUPABASE_URL.");
  }
  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function ensureWorld(supabase) {
  const { data, error } = await supabase
    .from("worlds")
    .upsert(
      {
        slug: SHOWCASE_WORLD.slug,
        name: SHOWCASE_WORLD.name,
        description: SHOWCASE_WORLD.description,
        visibility: SHOWCASE_WORLD.visibility,
      },
      { onConflict: "slug" },
    )
    .select("id, slug, name")
    .single();

  if (error) throw error;
  return data;
}

function buildSchedule() {
  const now = new Date();
  const registrationDeadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const startTime = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);
  return {
    registration_deadline: registrationDeadline.toISOString(),
    start_time: startTime.toISOString(),
  };
}

async function findShowcaseTournament(supabase) {
  const { data, error } = await supabase
    .from("tournaments")
    .select("id, name, game_key, access_type, status, world_id, start_time")
    .eq("name", SHOWCASE_TOURNAMENT.name)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function prepareShowcaseTournament(supabase) {
  const world = await ensureWorld(supabase);
  const schedule = buildSchedule();
  const existing = await findShowcaseTournament(supabase);

  const payload = {
    ...SHOWCASE_TOURNAMENT,
    world_id: world.id,
    registration_url: null,
    ...schedule,
  };

  if (existing?.id) {
    const { data, error } = await supabase
      .from("tournaments")
      .update(payload)
      .eq("id", existing.id)
      .select("id, name, game_key, access_type, status, world_id, start_time")
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("tournaments")
    .insert({
      ...payload,
      created_by: null,
    })
    .select("id, name, game_key, access_type, status, world_id, start_time")
    .single();

  if (error) throw error;
  return data;
}

function normalizeTournament(row) {
  if (!row) {
    throw new Error("Showcase tournament is missing.");
  }
  if (row.access_type !== "pass_required") {
    throw new Error("Showcase tournament exists but is not pass_required.");
  }

  return {
    tournamentId: row.id,
    name: row.name,
    gameKey: row.game_key,
    accessType: row.access_type,
    status: row.status,
    worldId: row.world_id,
    startTime: row.start_time,
  };
}

function printResult(result, asJson) {
  if (asJson) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  process.stdout.write(`${result.name}\n`);
  process.stdout.write(`tournamentId=${result.tournamentId}\n`);
  process.stdout.write(`gameKey=${result.gameKey}\n`);
  process.stdout.write(`accessType=${result.accessType}\n`);
  process.stdout.write(`status=${result.status}\n`);
  process.stdout.write(`worldId=${result.worldId ?? "none"}\n`);
  process.stdout.write(`startTime=${result.startTime ?? "none"}\n`);
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));
  const supabase = requireConfig();

  if (command === "prepare") {
    const result = normalizeTournament(await prepareShowcaseTournament(supabase));
    printResult(result, Boolean(options.json));
    return;
  }

  if (command === "inspect") {
    const result = normalizeTournament(await findShowcaseTournament(supabase));
    printResult(result, Boolean(options.json));
    return;
  }

  throw new Error(`Unknown command "${command}". Use prepare or inspect.`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const updateRatingsSchema = z.object({
  matchId: z.string().uuid(),
  gameKey: z.string().min(1),
  result: z.enum(["p1", "p2", "draw"]),
  p1Id: z.string().uuid(),
  p2Id: z.string().uuid(),
});

function expectedScore(a: number, b: number): number {
  return 1 / (1 + Math.pow(10, (b - a) / 400));
}

function kFactor(games: number): number {
  return Math.max(16, 40 - Math.min(games, 30) * 0.8);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const parsed = updateRatingsSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid input", details: parsed.error.format() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { matchId, gameKey, result, p1Id, p2Id } = parsed.data;

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Idempotency: if we already wrote rating_history for this match+game, no-op.
    const { data: existingHistory, error: existingErr } = await supabase
      .from("rating_history")
      .select("id")
      .eq("match_id", matchId)
      .eq("game_key", gameKey)
      .limit(1);

    if (existingErr) throw existingErr;
    if (existingHistory && existingHistory.length > 0) {
      return new Response(JSON.stringify({ message: "Match already processed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure rating rows exist.
    const ensureRow = async (profileId: string) => {
      const { data } = await supabase
        .from("player_ratings")
        .select("profile_id, game_key, elo_rating, games_rated")
        .eq("profile_id", profileId)
        .eq("game_key", gameKey)
        .maybeSingle();

      if (data) return data as any;

      const { data: inserted, error: insErr } = await supabase
        .from("player_ratings")
        .insert({ profile_id: profileId, game_key: gameKey, elo_rating: 1200, games_rated: 0 })
        .select("profile_id, game_key, elo_rating, games_rated")
        .single();

      if (insErr) throw insErr;
      return inserted as any;
    };

    const p1 = await ensureRow(p1Id);
    const p2 = await ensureRow(p2Id);

    const r1 = Number(p1.elo_rating ?? 1200);
    const r2 = Number(p2.elo_rating ?? 1200);
    const g1 = Number(p1.games_rated ?? 0);
    const g2 = Number(p2.games_rated ?? 0);

    const s1 = result === "p1" ? 1 : result === "p2" ? 0 : 0.5;
    const s2 = 1 - s1;

    const e1 = expectedScore(r1, r2);
    const e2 = expectedScore(r2, r1);

    const k1 = kFactor(g1);
    const k2 = kFactor(g2);

    const d1 = Math.round(k1 * (s1 - e1));
    const d2 = Math.round(k2 * (s2 - e2));

    const n1 = Math.max(100, r1 + d1);
    const n2 = Math.max(100, r2 + d2);

    // Persist ratings
    const { error: up1Err } = await supabase
      .from("player_ratings")
      .update({ elo_rating: n1, games_rated: g1 + 1, updated_at: new Date().toISOString() })
      .eq("profile_id", p1Id)
      .eq("game_key", gameKey);
    if (up1Err) throw up1Err;

    const { error: up2Err } = await supabase
      .from("player_ratings")
      .update({ elo_rating: n2, games_rated: g2 + 1, updated_at: new Date().toISOString() })
      .eq("profile_id", p2Id)
      .eq("game_key", gameKey);
    if (up2Err) throw up2Err;

    // Back-compat: keep profiles rating in sync for hex until all UI is migrated.
    if (gameKey === "hex") {
      await supabase.from("profiles").update({ elo_rating: n1, games_rated: g1 + 1 }).eq("id", p1Id);
      await supabase.from("profiles").update({ elo_rating: n2, games_rated: g2 + 1 }).eq("id", p2Id);
    }

    // Record history
    const { error: histErr } = await supabase.from("rating_history").insert([
      {
        profile_id: p1Id,
        match_id: matchId,
        game_key: gameKey,
        old_rating: r1,
        new_rating: n1,
        rating_change: n1 - r1,
      },
      {
        profile_id: p2Id,
        match_id: matchId,
        game_key: gameKey,
        old_rating: r2,
        new_rating: n2,
        rating_change: n2 - r2,
      },
    ]);
    if (histErr) throw histErr;

    // Update match_players with rating deltas (used by post-game UI).
    const { error: mp1Err } = await supabase.from("match_players").update({ rating_change: n1 - r1 }).eq("match_id", matchId).eq("profile_id", p1Id);
    if (mp1Err) throw mp1Err;
    const { error: mp2Err } = await supabase.from("match_players").update({ rating_change: n2 - r2 }).eq("match_id", matchId).eq("profile_id", p2Id);
    if (mp2Err) throw mp2Err;

    return new Response(
      JSON.stringify({
        p1: { old: r1, new: n1, change: n1 - r1 },
        p2: { old: r2, new: n2, change: n2 - r2 },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("Rating update error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});


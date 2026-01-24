import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function createRematchLobby(supabase: any, match: any, matchPlayers: any[], hostId: string) {
  // Get original lobby settings if available
  let lobbySettings = {
    board_size: match.size,
    pie_rule: match.pie_rule,
    turn_timer_seconds: 45,
  };

  if (match.lobby_id) {
    const { data: lobby } = await supabase
      .from("lobbies")
      .select("board_size, pie_rule, turn_timer_seconds")
      .eq("id", match.lobby_id)
      .single();

    if (lobby) {
      lobbySettings = lobby;
    }
  }

  // Generate new lobby code
  const { data: code, error: codeError } = await supabase.rpc("generate_lobby_code");
  if (codeError) throw codeError;

  // Create new lobby with same settings
  const { data: newLobby, error: lobbyError } = await supabase
    .from("lobbies")
    .insert({
      code,
      host_id: hostId,
      board_size: lobbySettings.board_size,
      pie_rule: lobbySettings.pie_rule,
      turn_timer_seconds: lobbySettings.turn_timer_seconds,
      status: "waiting",
    })
    .select()
    .single();

  if (lobbyError) throw lobbyError;

  // Add both players to the new lobby
  const lobbyPlayers = matchPlayers.map((mp: any) => ({
    lobby_id: newLobby.id,
    player_id: mp.profile_id,
    role: mp.profile_id === hostId ? "host" : "guest",
    is_ready: false,
  }));

  const { error: playersInsertError } = await supabase.from("lobby_players").insert(lobbyPlayers);

  if (playersInsertError) throw playersInsertError;

  return { lobby: newLobby, code };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Use anon key client for auth verification
    const anonClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await anonClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Use service role client for database operations (bypasses RLS)
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    const { matchId, action } = await req.json();
    console.log(`[REMATCH] Request received - matchId: ${matchId}, action: ${action}, userId: ${user.id}`);

    if (!action || !["request", "accept"].includes(action)) {
      throw new Error("Invalid action. Must be 'request' or 'accept'");
    }

    // Get the match and its players
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("*, lobby_id")
      .eq("id", matchId)
      .single();

    if (matchError) throw matchError;
    console.log(`[REMATCH] Match loaded: ${match.id}`);

    // Get players from the match
    const { data: matchPlayers, error: playersError } = await supabase
      .from("match_players")
      .select("profile_id")
      .eq("match_id", matchId)
      .eq("is_bot", false);

    if (playersError) throw playersError;
    if (!matchPlayers || matchPlayers.length !== 2) {
      throw new Error("Cannot rematch - invalid player count");
    }

    // Verify requesting user was in the match
    if (!matchPlayers.some((p: any) => p.profile_id === user.id)) {
      throw new Error("Only players can request rematch");
    }

    const opponentId = matchPlayers.find((p: any) => p.profile_id !== user.id)?.profile_id;
    if (!opponentId) {
      throw new Error("Opponent not found");
    }
    console.log(`[REMATCH] Opponent ID: ${opponentId}`);

    if (action === "request") {
      console.log(`[REMATCH] Processing request action`);

      // Check if there's already a pending request from this user
      const { data: existingRequest, error: existingError } = await supabase
        .from("rematch_requests")
        .select("*")
        .eq("match_id", matchId)
        .eq("requester_id", user.id)
        .eq("status", "pending")
        .maybeSingle();

      console.log(`[REMATCH] Existing request check:`, { existingRequest, existingError });

      // Log any errors (including table not found)
      if (existingError) {
        console.error("[REMATCH] Error checking existing request:", existingError);
        throw new Error(`Database error: ${existingError.message}`);
      }

      if (existingRequest) {
        console.log(`[REMATCH] Found existing request, returning it`);
        return new Response(
          JSON.stringify({
            success: true,
            message: "Rematch request already sent",
            request: existingRequest,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Check if opponent already requested (mutual request = auto-accept)
      const { data: opponentRequest, error: opponentError } = await supabase
        .from("rematch_requests")
        .select("*")
        .eq("match_id", matchId)
        .eq("requester_id", opponentId)
        .eq("status", "pending")
        .maybeSingle();

      console.log(`[REMATCH] Opponent request check:`, { opponentRequest, opponentError });

      // Log any errors
      if (opponentError) {
        console.error("[REMATCH] Error checking opponent request:", opponentError);
        throw new Error(`Database error: ${opponentError.message}`);
      }

      if (opponentRequest) {
        console.log(`[REMATCH] Found opponent request - creating mutual lobby`);
        // Both players want rematch - create lobby immediately
        const lobbyData = await createRematchLobby(supabase, match, matchPlayers, user.id);

        // Update opponent's request to accepted
        await supabase
          .from("rematch_requests")
          .update({ status: "accepted", lobby_id: lobbyData.lobby.id })
          .eq("id", opponentRequest.id);

        console.log(`Mutual rematch - lobby created: ${lobbyData.code} from match ${matchId}`);

        return new Response(
          JSON.stringify({
            success: true,
            lobby: lobbyData.lobby,
            code: lobbyData.code,
            mutual: true,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Create new rematch request
      console.log(
        `[REMATCH] Creating new request - matchId: ${matchId}, requester: ${user.id}, recipient: ${opponentId}`,
      );

      const { data: newRequest, error: requestError } = await supabase
        .from("rematch_requests")
        .insert({
          match_id: matchId,
          requester_id: user.id,
          recipient_id: opponentId,
          status: "pending",
        })
        .select()
        .single();

      console.log(`[REMATCH] Insert result:`, { newRequest, requestError });

      if (requestError) {
        console.error(`[REMATCH] Failed to insert request:`, requestError);
        throw requestError;
      }

      console.log(`[REMATCH] Successfully created request ${newRequest.id}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Rematch request sent",
          request: newRequest,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    } else if (action === "accept") {
      // Find the pending request from opponent
      const { data: request, error: requestError } = await supabase
        .from("rematch_requests")
        .select("*")
        .eq("match_id", matchId)
        .eq("recipient_id", user.id)
        .eq("status", "pending")
        .single();

      if (requestError || !request) {
        throw new Error("No pending rematch request found");
      }

      // Create lobby
      const lobbyData = await createRematchLobby(supabase, match, matchPlayers, user.id);

      // Update request status
      await supabase
        .from("rematch_requests")
        .update({ status: "accepted", lobby_id: lobbyData.lobby.id })
        .eq("id", request.id);

      console.log(`Rematch accepted - lobby created: ${lobbyData.code} from match ${matchId}`);

      return new Response(
        JSON.stringify({
          success: true,
          lobby: lobbyData.lobby,
          code: lobbyData.code,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    throw new Error("Invalid action");
  } catch (error) {
    console.error("Error creating rematch:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

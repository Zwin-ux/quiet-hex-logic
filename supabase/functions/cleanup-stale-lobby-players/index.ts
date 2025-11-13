const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.75.0');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate cutoff time (60 seconds ago)
    const cutoffTime = new Date(Date.now() - 60000).toISOString();

    console.log('[cleanup-stale-lobby-players] Checking for stale players since:', cutoffTime);

    // Find all stale players (haven't sent heartbeat in 60+ seconds)
    const { data: stalePlayers, error: fetchError } = await supabase
      .from('lobby_players')
      .select('lobby_id, player_id, last_seen, profiles(username)')
      .lt('last_seen', cutoffTime)
      .eq('lobbies.status', 'waiting');

    if (fetchError) {
      console.error('[cleanup-stale-lobby-players] Error fetching stale players:', fetchError);
      throw fetchError;
    }

    if (!stalePlayers || stalePlayers.length === 0) {
      console.log('[cleanup-stale-lobby-players] No stale players found');
      return new Response(
        JSON.stringify({ message: 'No stale players to clean up', removed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[cleanup-stale-lobby-players] Found ${stalePlayers.length} stale players`);

    // Remove stale players
    const { error: deleteError } = await supabase
      .from('lobby_players')
      .delete()
      .lt('last_seen', cutoffTime);

    if (deleteError) {
      console.error('[cleanup-stale-lobby-players] Error deleting stale players:', deleteError);
      throw deleteError;
    }

    // Check for empty lobbies after cleanup and delete them
    const { data: emptyLobbies, error: emptyError } = await supabase
      .from('lobbies')
      .select('id, code')
      .eq('status', 'waiting')
      .not('id', 'in', `(SELECT DISTINCT lobby_id FROM lobby_players)`);

    if (!emptyError && emptyLobbies && emptyLobbies.length > 0) {
      console.log(`[cleanup-stale-lobby-players] Deleting ${emptyLobbies.length} empty lobbies`);
      
      const { error: deleteLobbyError } = await supabase
        .from('lobbies')
        .delete()
        .in('id', emptyLobbies.map(l => l.id));

      if (deleteLobbyError) {
        console.error('[cleanup-stale-lobby-players] Error deleting empty lobbies:', deleteLobbyError);
      }
    }

    console.log('[cleanup-stale-lobby-players] Cleanup complete');

    return new Response(
      JSON.stringify({ 
        message: 'Stale players cleaned up successfully', 
        removed: stalePlayers.length,
        emptyLobbiesDeleted: emptyLobbies?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[cleanup-stale-lobby-players] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

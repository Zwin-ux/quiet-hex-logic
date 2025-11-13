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

    // Calculate cutoff time (1 hour ago)
    const cutoffTime = new Date(Date.now() - 3600000).toISOString();

    console.log('[cleanup-old-lobbies] Checking for old lobbies since:', cutoffTime);

    // Find all old lobbies that are still in 'waiting' status
    const { data: oldLobbies, error: fetchError } = await supabase
      .from('lobbies')
      .select('id, code, created_at')
      .eq('status', 'waiting')
      .lt('created_at', cutoffTime);

    if (fetchError) {
      console.error('[cleanup-old-lobbies] Error fetching old lobbies:', fetchError);
      throw fetchError;
    }

    if (!oldLobbies || oldLobbies.length === 0) {
      console.log('[cleanup-old-lobbies] No old lobbies found');
      return new Response(
        JSON.stringify({ message: 'No old lobbies to clean up', removed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[cleanup-old-lobbies] Found ${oldLobbies.length} old lobbies to delete`);

    // Delete old lobbies (cascade will handle lobby_players and lobby_chat_messages)
    const { error: deleteError } = await supabase
      .from('lobbies')
      .delete()
      .in('id', oldLobbies.map(l => l.id));

    if (deleteError) {
      console.error('[cleanup-old-lobbies] Error deleting old lobbies:', deleteError);
      throw deleteError;
    }

    console.log('[cleanup-old-lobbies] Cleanup complete');

    return new Response(
      JSON.stringify({ 
        message: 'Old lobbies cleaned up successfully', 
        removed: oldLobbies.length,
        codes: oldLobbies.map(l => l.code)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[cleanup-old-lobbies] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate the date 3 days ago
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    console.log('Starting cleanup of lobbies older than:', threeDaysAgo.toISOString());

    // Find lobbies that are waiting status and older than 3 days
    const { data: oldLobbies, error: fetchError } = await supabase
      .from('lobbies')
      .select('id, code, created_at')
      .eq('status', 'waiting')
      .lt('created_at', threeDaysAgo.toISOString());

    if (fetchError) {
      console.error('Error fetching old lobbies:', fetchError);
      throw fetchError;
    }

    if (!oldLobbies || oldLobbies.length === 0) {
      console.log('No old lobbies to clean up');
      return new Response(
        JSON.stringify({ message: 'No old lobbies found', deleted: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${oldLobbies.length} lobbies to clean up:`, oldLobbies.map(l => l.code));

    // Delete the lobby_players entries first (foreign key constraint)
    const lobbyIds = oldLobbies.map(l => l.id);
    const { error: deletePlayersError } = await supabase
      .from('lobby_players')
      .delete()
      .in('lobby_id', lobbyIds);

    if (deletePlayersError) {
      console.error('Error deleting lobby players:', deletePlayersError);
      throw deletePlayersError;
    }

    // Delete the lobbies
    const { error: deleteLobbiesError } = await supabase
      .from('lobbies')
      .delete()
      .in('id', lobbyIds);

    if (deleteLobbiesError) {
      console.error('Error deleting lobbies:', deleteLobbiesError);
      throw deleteLobbiesError;
    }

    console.log(`Successfully deleted ${oldLobbies.length} old lobbies`);

    return new Response(
      JSON.stringify({ 
        message: 'Cleanup completed successfully', 
        deleted: oldLobbies.length,
        lobbyCodes: oldLobbies.map(l => l.code)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in cleanup-empty-lobbies:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
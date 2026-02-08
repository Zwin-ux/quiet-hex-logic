import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Cron-only: verify service-role key
  const authHeader = req.headers.get('Authorization');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!authHeader || authHeader !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const sixHoursAgo = new Date();
    sixHoursAgo.setHours(sixHoursAgo.getHours() - 6);

    console.log(`Cleaning up matches older than ${sixHoursAgo.toISOString()}`);

    // Close old waiting matches (mark as aborted)
    const { data: waitingMatches, error: waitingError } = await supabase
      .from('matches')
      .update({ status: 'aborted', updated_at: new Date().toISOString() })
      .eq('status', 'waiting')
      .lt('created_at', sixHoursAgo.toISOString())
      .select('id');

    if (waitingError) {
      console.error('Error closing waiting matches:', waitingError);
    } else {
      console.log(`Closed ${waitingMatches?.length || 0} waiting matches`);
    }

    // Close old active matches (mark as finished, no winner)
    const { data: activeMatches, error: activeError } = await supabase
      .from('matches')
      .update({ 
        status: 'finished', 
        winner: null,
        updated_at: new Date().toISOString() 
      })
      .eq('status', 'active')
      .lt('updated_at', sixHoursAgo.toISOString())
      .select('id');

    if (activeError) {
      console.error('Error closing active matches:', activeError);
    } else {
      console.log(`Closed ${activeMatches?.length || 0} active matches`);
    }

    // Delete old empty lobbies
    const { data: oldLobbies, error: lobbyError } = await supabase
      .from('lobbies')
      .delete()
      .eq('status', 'waiting')
      .lt('created_at', sixHoursAgo.toISOString())
      .select('id');

    if (lobbyError) {
      console.error('Error deleting old lobbies:', lobbyError);
    } else {
      console.log(`Deleted ${oldLobbies?.length || 0} old lobbies`);
    }

    const summary = {
      waitingMatchesClosed: waitingMatches?.length || 0,
      activeMatchesClosed: activeMatches?.length || 0,
      lobbiesDeleted: oldLobbies?.length || 0,
      timestamp: new Date().toISOString()
    };

    console.log('Cleanup complete:', summary);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in cleanup-old-matches:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

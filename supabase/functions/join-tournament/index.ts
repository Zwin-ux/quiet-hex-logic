import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const joinTournamentSchema = z.object({
  tournamentId: z.string().uuid('Invalid tournament ID format'),
  accessCode: z.string().trim().max(64).optional().nullable(),
});

function hasIssuedTournamentPass(verificationMetadata: unknown, tournamentId: string) {
  const root = verificationMetadata && typeof verificationMetadata === 'object'
    ? verificationMetadata as Record<string, unknown>
    : {};
  const solanaCompetitive = root.solanaCompetitive && typeof root.solanaCompetitive === 'object'
    ? root.solanaCompetitive as Record<string, unknown>
    : {};
  const roomPasses = Array.isArray(solanaCompetitive.roomPasses) ? solanaCompetitive.roomPasses : [];

  return roomPasses.some((pass) => {
    if (!pass || typeof pass !== 'object') return false;
    const record = pass as Record<string, unknown>;
    return (
      record.scope === 'event_series' &&
      record.accessMode === 'pass_required' &&
      record.tournamentId === tournamentId &&
      (record.status === 'issued' || record.status === 'finalized')
    );
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const body = await req.json();
    
    // Validate input
    const validationResult = joinTournamentSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input parameters', 
          details: validationResult.error.format() 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { tournamentId, accessCode } = validationResult.data;

    const { data: tournament, error: tournamentLookupError } = await admin
      .from('tournaments')
      .select('id, name, access_type, competitive_mode')
      .eq('id', tournamentId)
      .maybeSingle();

    if (tournamentLookupError) throw tournamentLookupError;
    if (!tournament) throw new Error('Tournament not found');

    if (tournament.access_type === 'pass_required') {
      const { data: identity, error: identityError } = await admin
        .from('world_app_identities')
        .select('verification_metadata, wallet_auth_at, idkit_verified_at')
        .eq('profile_id', user.id)
        .maybeSingle();

      if (identityError) throw identityError;

      if (!identity?.wallet_auth_at) {
        throw new Error('Pass-gated events require a bound World wallet');
      }

      if (tournament.competitive_mode && !identity?.idkit_verified_at) {
        throw new Error('Competitive events require human verification');
      }

      if (!hasIssuedTournamentPass(identity?.verification_metadata, tournamentId)) {
        throw new Error('Activate the event pass before joining this event');
      }
    }

    const { error: joinError } = await supabase.rpc('join_tournament_atomic', {
      p_tournament_id: tournamentId,
      p_access_code: accessCode || null,
    });

    if (joinError) throw joinError;

    console.log(`Player ${user.id} joined tournament ${tournamentId}`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error joining tournament:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const createTournamentSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Tournament name is required')
    .max(100, 'Tournament name must be less than 100 characters'),
  description: z.string()
    .trim()
    .max(1000, 'Description must be less than 1000 characters')
    .optional(),
  gameKey: z.string().optional(),
  worldId: z.string().uuid('Invalid world ID').optional(),
  format: z.enum(['single_elimination', 'double_elimination', 'round_robin'], {
    errorMap: () => ({ message: 'Invalid tournament format' })
  }).optional(),
  competitiveMode: z.boolean().optional(),
  maxPlayers: z.number()
    .int('Max players must be an integer')
    .min(2, 'Max players must be at least 2')
    .max(128, 'Max players cannot exceed 128'),
  minPlayers: z.number()
    .int('Min players must be an integer')
    .min(2, 'Min players must be at least 2')
    .max(128, 'Min players cannot exceed 128'),
  boardSize: z.number()
    .int('Board size must be an integer')
    .min(3, 'Board size must be at least 3')
    .max(19, 'Board size cannot exceed 19')
    .optional(),
  pieRule: z.boolean().optional(),
  turnTimerSeconds: z.number()
    .int('Turn timer must be an integer')
    .min(10, 'Turn timer must be at least 10 seconds')
    .max(600, 'Turn timer cannot exceed 600 seconds (10 minutes)')
    .optional(),
  registrationDeadline: z.string()
    .datetime('Invalid registration deadline format')
    .optional()
    .nullable(),
  startTime: z.string()
    .datetime('Invalid start time format')
    .optional()
    .nullable()
}).refine(data => data.maxPlayers >= data.minPlayers, {
  message: 'Max players must be greater than or equal to min players',
  path: ['maxPlayers']
});

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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const body = await req.json();
    
    // Validate input
    const validationResult = createTournamentSchema.safeParse(body);
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
    
    const {
      name,
      description,
      gameKey,
      worldId,
      format,
      competitiveMode,
      maxPlayers,
      minPlayers,
      boardSize,
      pieRule,
      turnTimerSeconds,
      registrationDeadline,
      startTime
    } = validationResult.data;

    const { data: tournamentResult, error: tournamentError } = await supabase.rpc('create_tournament_atomic', {
      p_name: name,
      p_description: description || null,
      p_game_key: gameKey || 'hex',
      p_world_id: worldId ?? null,
      p_format: format || 'single_elimination',
      p_competitive_mode: competitiveMode ?? false,
      p_max_players: maxPlayers,
      p_min_players: minPlayers,
      p_board_size: boardSize ?? null,
      p_pie_rule: pieRule ?? null,
      p_turn_timer_seconds: turnTimerSeconds || 45,
      p_registration_deadline: registrationDeadline || null,
      p_start_time: startTime || null,
    });

    if (tournamentError) throw tournamentError;

    const tournament = (tournamentResult as any)?.tournament;
    if (!tournament) {
      throw new Error('Failed to create tournament');
    }

    console.log(`Tournament ${tournament.id} created by ${user.id}`);

    return new Response(
      JSON.stringify({ tournament }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating tournament:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

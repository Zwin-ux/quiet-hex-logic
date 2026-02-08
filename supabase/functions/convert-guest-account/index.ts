import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const convertSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  username: z.string().min(1).max(30),
  avatarColor: z.string().optional(),
  guestId: z.string().uuid(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const parsed = convertSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: parsed.error.format() }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { email, password, username, avatarColor, guestId } = parsed.data;

    // Get current user (guest)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: guestUser } } = await supabaseClient.auth.getUser();
    if (!guestUser || !guestUser.is_anonymous) {
      return new Response(
        JSON.stringify({ error: 'Not a guest user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client for user management
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Create new user with email/password
    const { data: newUser, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        avatar_color: avatarColor,
      }
    });

    if (signUpError) {
      console.error('Sign up error:', signUpError);
      return new Response(
        JSON.stringify({ error: signUpError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!newUser.user) {
      return new Response(
        JSON.stringify({ error: 'Failed to create user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update all guest's data to point to new user
    // 1. Update match_players
    const { error: matchPlayersError } = await supabaseAdmin
      .from('match_players')
      .update({ profile_id: newUser.user.id })
      .eq('profile_id', guestId);

    if (matchPlayersError) {
      console.error('Error updating match_players:', matchPlayersError);
    }

    // 2. Update matches ownership
    const { error: matchesError } = await supabaseAdmin
      .from('matches')
      .update({ owner: newUser.user.id })
      .eq('owner', guestId);

    if (matchesError) {
      console.error('Error updating matches:', matchesError);
    }

    // 3. Update user_presence
    const { error: presenceError } = await supabaseAdmin
      .from('user_presence')
      .update({ profile_id: newUser.user.id })
      .eq('profile_id', guestId);

    if (presenceError) {
      console.error('Error updating user_presence:', presenceError);
    }

    // 4. Update tutorial_progress
    const { error: tutorialError } = await supabaseAdmin
      .from('tutorial_progress')
      .update({ profile_id: newUser.user.id })
      .eq('profile_id', guestId);

    if (tutorialError) {
      console.error('Error updating tutorial_progress:', tutorialError);
    }

    // 5. Update user_achievements
    const { error: achievementsError } = await supabaseAdmin
      .from('user_achievements')
      .update({ user_id: newUser.user.id })
      .eq('user_id', guestId);

    if (achievementsError) {
      console.error('Error updating user_achievements:', achievementsError);
    }

    // 6. Update the profile - mark as converted
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({
        username,
        avatar_color: avatarColor,
        is_guest: false,
        converted_from_anonymous_id: guestId
      })
      .eq('id', newUser.user.id);

    if (profileUpdateError) {
      console.error('Error updating profile:', profileUpdateError);
    }

    // 7. Delete the guest profile
    const { error: deleteProfileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', guestId);

    if (deleteProfileError) {
      console.error('Error deleting guest profile:', deleteProfileError);
    }

    // 8. Delete anonymous user
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(guestId);
    if (deleteUserError) {
      console.error('Error deleting guest user:', deleteUserError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        user: newUser.user
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Conversion error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

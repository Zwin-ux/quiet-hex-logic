import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('Stripe secret key not configured');
    }
    
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });

    // Get user from auth header
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user profile for email
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId = customers.data[0]?.id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile?.username,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
    }

    // Check for existing subscription
    const existingSub = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id, status')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingSub.data?.status === 'active') {
      return new Response(JSON.stringify({ error: 'Already subscribed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get or create the price
    const products = await stripe.products.list({ active: true, limit: 100 });
    let product = products.data.find((p: { metadata?: { hexology?: string } }) => p.metadata?.hexology === 'plus');
    
    if (!product) {
      product = await stripe.products.create({
        name: 'Hexology+',
        description: 'Premium subscription for Hexology',
        metadata: { hexology: 'plus' },
      });
    }

    const prices = await stripe.prices.list({ product: product.id, active: true });
    let price = prices.data.find((p: { unit_amount: number | null; recurring?: { interval?: string } | null }) => 
      p.unit_amount === 500 && p.recurring?.interval === 'month'
    );
    
    if (!price) {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: 500, // $5.00
        currency: 'usd',
        recurring: { interval: 'month' },
      });
    }

    // Create checkout session
    const origin = req.headers.get('origin') || 'http://localhost:5173';
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: price.id, quantity: 1 }],
      mode: 'subscription',
      success_url: `${origin}/premium?success=true`,
      cancel_url: `${origin}/premium?canceled=true`,
      metadata: { user_id: user.id },
    });

    // Upsert subscription record
    await supabase.from('subscriptions').upsert({
      user_id: user.id,
      stripe_customer_id: customerId,
      plan: 'hexology_plus',
      status: 'pending',
    }, { onConflict: 'user_id' });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Checkout error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

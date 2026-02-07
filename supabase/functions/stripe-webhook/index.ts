import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

serve(async (req) => {
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  
  if (!stripeKey || !webhookSecret) {
    console.error('Missing Stripe configuration');
    return new Response('Server error', { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
  const signature = req.headers.get('stripe-signature');
  
  if (!signature) {
    return new Response('No signature', { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('Webhook event:', event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.user_id;
        
        if (userId && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          
          await supabase.from('subscriptions').upsert({
            user_id: userId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscription.id,
            plan: 'openboard_plus',
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          }, { onConflict: 'user_id' });

          console.log('Subscription activated for user:', userId);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        
        // Find user by stripe customer id
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscription.id)
          .maybeSingle();

        if (existingSub) {
          await supabase.from('subscriptions').update({
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          }).eq('stripe_subscription_id', subscription.id);
          
          console.log('Subscription updated:', subscription.id);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        
        await supabase.from('subscriptions').update({
          status: 'canceled',
        }).eq('stripe_subscription_id', subscription.id);
        
        console.log('Subscription canceled:', subscription.id);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        
        if (invoice.subscription) {
          await supabase.from('subscriptions').update({
            status: 'past_due',
          }).eq('stripe_subscription_id', invoice.subscription as string);
          
          console.log('Payment failed for subscription:', invoice.subscription);
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Webhook error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

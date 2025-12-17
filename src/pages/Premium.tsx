import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Crown, Sparkles, Trophy, Palette, Zap, Shield, Puzzle, BarChart3, Download, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { usePremium } from '@/hooks/usePremium';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { premiumSkins } from '@/lib/boardSkins';

const features = [
  { icon: Palette, title: 'Exclusive Board Skins', description: '4 premium skins including Galaxy, Royal, Retro & Aurora' },
  { icon: Zap, title: 'Unlimited AI Practice', description: 'Play against all AI difficulties with no limits' },
  { icon: Puzzle, title: 'Unlimited Puzzles', description: 'Access all puzzle collections without daily limits' },
  { icon: BarChart3, title: 'Game Analysis', description: 'AI-powered post-game analysis with move evaluation' },
  { icon: Trophy, title: 'Tournament Priority', description: 'Priority access to tournaments and ranked matches' },
  { icon: Download, title: 'Replay Export', description: 'Export your game replays in PGN-like format' },
  { icon: Shield, title: 'No Ads', description: 'Clean, ad-free gaming experience' },
  { icon: Crown, title: 'Premium Badge', description: 'Show off your premium status everywhere' },
  { icon: Sparkles, title: 'Early Access', description: 'First access to new features and beta content' },
];

export default function Premium() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPremium, subscription, loading } = usePremium(user?.id);
  const [purchasing, setPurchasing] = useState(false);

  const handleSubscribe = async () => {
    if (!user) {
      toast.error('Please sign in to subscribe');
      navigate('/auth');
      return;
    }

    setPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId: 'hexology_plus_monthly' },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-billing-portal', {});
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Portal error:', error);
      toast.error('Failed to open billing portal');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate('/');
            }
          }}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-950 px-4 py-2 rounded-full font-bold mb-4">
            <Crown className="h-5 w-5" />
            Hexology+
          </div>
          <h1 className="text-4xl font-display font-bold mb-4">
            Elevate Your Game
          </h1>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto">
            Unlock premium features, exclusive skins, and support the development of Hexology.
          </p>
        </div>

        {/* Pricing Card */}
        <Card className="mb-12 border-2 border-amber-400/50 bg-gradient-to-br from-amber-500/5 to-yellow-400/5">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Hexology+ Monthly</CardTitle>
            <CardDescription>
              <span className="text-4xl font-bold text-foreground">$5</span>
              <span className="text-muted-foreground">/month</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            {isPremium ? (
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 text-green-600 bg-green-100 px-4 py-2 rounded-full">
                  <Check className="h-5 w-5" />
                  Active Subscription
                </div>
                {subscription?.current_period_end && (
                  <p className="text-sm text-muted-foreground">
                    {subscription.cancel_at_period_end
                      ? `Access until ${new Date(subscription.current_period_end).toLocaleDateString()}`
                      : `Renews on ${new Date(subscription.current_period_end).toLocaleDateString()}`}
                  </p>
                )}
                <Button onClick={handleManageSubscription} variant="outline">
                  Manage Subscription
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleSubscribe}
                disabled={purchasing || loading}
                className="bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-950 hover:from-amber-600 hover:to-yellow-500 font-bold px-8 py-6 text-lg"
              >
                {purchasing ? 'Processing...' : 'Subscribe Now'}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Features Grid */}
        <h2 className="text-2xl font-display font-bold text-center mb-8">
          What's Included
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {features.map((feature) => (
            <Card key={feature.title} className="bg-card/50">
              <CardContent className="pt-6">
                <feature.icon className="h-8 w-8 text-amber-500 mb-3" />
                <h3 className="font-semibold mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Premium Skins Preview */}
        <h2 className="text-2xl font-display font-bold text-center mb-6">
          Exclusive Board Skins
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {premiumSkins.map((skin) => (
            <Card key={skin.id} className="overflow-hidden">
              <div
                className="h-24 flex items-center justify-center text-4xl"
                style={{ backgroundColor: skin.colors.background }}
              >
                {skin.preview}
              </div>
              <CardContent className="p-3 text-center">
                <p className="font-medium text-sm">{skin.name}</p>
                <p className="text-xs text-muted-foreground">{skin.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Check, Crown, Sparkles, Trophy, Palette, Zap, Shield, Puzzle, BarChart3, Download, Star, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { usePremium } from '@/hooks/usePremium';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { premiumSkins } from '@/lib/boardSkins';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

const features = [
  { icon: Palette, title: 'Exclusive Board Skins', description: 'Access premium themes like Galaxy, Royal, Retro & Aurora' },
  { icon: Zap, title: 'Unlimited AI Practice', description: 'Play against all AI levels without any daily limitations' },
  { icon: Puzzle, title: 'Tactical Puzzles', description: 'Unlimited access to our growing library of Hex puzzles' },
  { icon: BarChart3, title: 'Deep Analysis', description: 'AI-powered post-game insights and best move suggestions' },
  { icon: Trophy, title: 'Competitive Edge', description: 'Priority matchmaking and exclusive ranked rewards' },
  { icon: Download, title: 'Game Portability', description: 'Export your replays to high-quality JSON or HEX formats' },
];

export default function Premium() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPremium, subscription, loading } = usePremium(user?.id);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const handleSubscribe = async () => {
    if (!user) {
      toast.error('Please sign in to subscribe');
      navigate('/auth');
      return;
    }

    setPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId: 'openboard_plus_monthly' },
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

  const isNative = (window as unknown as { isNativeApp?: boolean }).isNativeApp;
  const isIOS = (window as unknown as { nativePlatform?: string }).nativePlatform === 'ios';
  const showIAP = isIOS && isNative;
  const showStripe = !showIAP;

  useEffect(() => {
    if (!isNative) return;

    const handleSuccess = (_e: Event) => {
      toast.success('Purchase successful! Welcome to Plus.');
      // You may want to refresh the user's premium status here
      window.location.reload(); 
    };

    const handleError = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      toast.error(`Purchase failed: ${detail?.code || 'Unknown error'}`);
    };

    const handleRestore = (e: Event) => {
      setRestoring(false);
      const detail = (e as CustomEvent).detail;
      
      if (detail && Array.isArray(detail) && detail.length > 0) {
        const hasSubscription = detail.some(
          (purchase: { productId?: string }) => 
            purchase.productId === 'hexology_plus_monthly'
        );
        
        if (hasSubscription) {
          toast.success('Subscription restored successfully!');
          window.location.reload();
        } else {
          toast.info('No active Hexology+ subscription found');
        }
      } else {
        toast.info('No previous purchases found');
      }
    };

    window.addEventListener('iap-success', handleSuccess);
    window.addEventListener('iap-error', handleError);
    window.addEventListener('iap-restore', handleRestore);

    return () => {
      window.removeEventListener('iap-success', handleSuccess);
      window.removeEventListener('iap-error', handleError);
      window.removeEventListener('iap-restore', handleRestore);
    };
  }, [isNative]);

  const handleNativePurchase = () => {
    const win = window as unknown as { triggerNativePurchase?: () => void };
    if (win.triggerNativePurchase) {
      win.triggerNativePurchase();
    }
  };

  const handleNativeRestore = () => {
    setRestoring(true);
    const win = window as unknown as { triggerNativeRestore?: () => void };
    if (win.triggerNativeRestore) {
      win.triggerNativeRestore();
    } else {
      toast.error('Restore not available');
      setRestoring(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/10 rounded-full blur-[120px] animate-float" />
        <div className="absolute bottom-[10%] right-[-5%] w-[35%] h-[35%] bg-indigo/10 rounded-full blur-[100px] animate-float" style={{ animationDelay: '-2s' }} />
      </div>

      <div className="container relative mx-auto px-4 py-8 max-w-5xl z-10">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-8 hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-950 px-5 py-2 rounded-full font-bold mb-6 shadow-xl animate-gentle-pulse">
            <Crown className="h-5 w-5" />
            The Open Board+
          </div>
          <h1 className="text-5xl md:text-6xl font-display font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">
            Elevate Your Experience
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Unlock the full potential of The Open Board. Support independent development 
            and get exclusive features designed for true masters.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start mb-20">
          {/* Main Pricing Block */}
          <div className="lg:col-span-5">
            <Card className="border-2 border-amber-400/50 bg-white/50 dark:bg-black/40 backdrop-blur-xl shadow-2xl sticky top-8">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-3xl font-display">Monthly Mastery</CardTitle>
                <CardDescription className="text-lg">Everything included</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8 pt-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-5xl font-bold font-display">$5</span>
                    <span className="text-xl text-muted-foreground">/mo</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">Cancel anytime, no commitment</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="h-5 w-5 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Check className="h-3 w-3 text-green-500" />
                    </div>
                    <span>All premium board skins</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="h-5 w-5 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Check className="h-3 w-3 text-green-500" />
                    </div>
                    <span>Unlimited AI & Puzzles</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="h-5 w-5 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Check className="h-3 w-3 text-green-500" />
                    </div>
                    <span>AI Move Analysis</span>
                  </div>
                </div>

                {isPremium ? (
                  <div className="space-y-4 pt-4">
                    <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                      <Check className="h-6 w-6 text-green-500" />
                      <span className="font-semibold text-green-600">Active Membership</span>
                      {subscription?.current_period_end && (
                         <span className="text-xs text-muted-foreground text-center">
                          {subscription.cancel_at_period_end
                            ? `Access until ${new Date(subscription.current_period_end).toLocaleDateString()}`
                            : `Renews on ${new Date(subscription.current_period_end).toLocaleDateString()}`}
                        </span>
                      )}
                    </div>
                    {showStripe && (
                      <Button onClick={handleManageSubscription} variant="outline" className="w-full">
                        Manage via Stripe
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {showIAP && (
                      <Button
                        onClick={handleNativePurchase}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-950 hover:from-amber-600 hover:to-yellow-500 font-bold py-8 text-xl shadow-lg hover:shadow-amber-500/20 transition-all duration-300"
                      >
                        Subscribe via App Store
                      </Button>
                    )}
                    {showStripe && (
                      <Button
                        onClick={handleSubscribe}
                        disabled={purchasing || loading}
                        className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-950 hover:from-amber-600 hover:to-yellow-500 font-bold py-8 text-xl shadow-lg hover:shadow-amber-500/20 transition-all duration-300"
                      >
                        {purchasing ? 'Redirecting...' : 'Get The Open Board+'}
                      </Button>
                    )}
                    {isIOS && (
                      <Button
                        onClick={handleNativeRestore}
                        disabled={restoring}
                        variant="ghost"
                        className="w-full text-sm text-muted-foreground hover:text-foreground"
                      >
                        <RotateCcw className={cn("h-4 w-4 mr-2", restoring && "animate-spin")} />
                        {restoring ? 'Restoring...' : 'Restore Purchases'}
                      </Button>
                    )}
                  </div>
                )}
                
                {/* Subscription Terms - Required by Apple */}
                <div className="pt-4 space-y-3 border-t border-white/10">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Subscription auto-renews monthly at $5.00/month. Cancel anytime from your account settings or the App Store. 
                    No commitment required.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
                    <Link to="/privacy" className="text-amber-500 hover:text-amber-400 underline underline-offset-2">
                      Privacy Policy
                    </Link>
                    <span className="text-muted-foreground">•</span>
                    <Link to="/terms" className="text-amber-500 hover:text-amber-400 underline underline-offset-2">
                      Terms of Use
                    </Link>
                  </div>
                </div>
                
                {showStripe && (
                  <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest font-semibold">
                    Secure checkout via Stripe
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Features Detail grid */}
          <div className="lg:col-span-7 grid sm:grid-cols-2 gap-4">
            {features.map((feature, idx) => (
              <div 
                key={feature.title} 
                className="group p-6 rounded-2xl bg-card/40 border border-white/10 hover:bg-card/60 hover:border-amber-400/30 transition-all duration-300 backdrop-blur-sm"
              >
                <div className="h-12 w-12 rounded-xl bg-amber-400/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="h-6 w-6 text-amber-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Skins Preview Section */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-display font-bold mb-4">Exclusive Aesthetics</h2>
            <p className="text-muted-foreground">Premium skins feature custom color palettes and animated backgrounds.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {premiumSkins.map((skin) => (
              <div 
                key={skin.id}
                className="group relative rounded-2xl overflow-hidden aspect-[4/5] bg-card border border-white/10 hover:border-amber-400/50 transition-all duration-500 shadow-xl"
              >
                <div 
                  className="absolute inset-0 opacity-80 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: skin.colors.background }}
                >
                  {/* Skin Preview Rendering */}
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center text-white">
                    <span className="text-6xl mb-6 group-hover:scale-125 transition-transform duration-500">{skin.preview}</span>
                    <h4 className="text-xl font-bold mb-2">{skin.name}</h4>
                    <p className="text-xs opacity-70 mb-8">{skin.description}</p>
                    
                    <div className="flex gap-2">
                       <div className="h-4 w-4 rounded-full border border-white/20" style={{ backgroundColor: skin.colors.player1 }} />
                       <div className="h-4 w-4 rounded-full border border-white/20" style={{ backgroundColor: skin.colors.player2 }} />
                    </div>
                  </div>
                </div>
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-6">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Included with Plus</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Guarantee section */}
        <div className="text-center max-w-2xl mx-auto py-12 border-t border-white/5">
          <Shield className="h-10 w-10 text-amber-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Our Promise</h3>
          <p className="text-sm text-muted-foreground">
            We are committed to fair play and transparency. Subscribing helps us 
            keep The Open Board independent and ad-free. No pay-to-win, ever.
          </p>
        </div>

        {/* Platform Availability */}
        <div className="text-center max-w-2xl mx-auto pb-12">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-3">
            Available Platforms
          </p>
          <div className="flex items-center justify-center gap-4 text-sm">
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">iOS</span>
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">Web</span>
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">Discord</span>
          </div>
        </div>
      </div>
    </div>
  );
}

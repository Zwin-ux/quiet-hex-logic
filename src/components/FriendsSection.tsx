import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Puzzle, Eye, Archive, ArrowRight } from "lucide-react";

const FriendsSection = () => {
  const features = [
    {
      icon: Users,
      title: "Study Together",
      description: "Share puzzles and opening patterns with friends.",
      badge: "Collaborative"
    },
    {
      icon: Puzzle,
      title: "Casual Duels",
      description: "Invite via short code, no account required.",
      badge: "Quick Start"
    },
    {
      icon: Eye,
      title: "Spectator Room",
      description: "Watch two AIs or humans play slowly with commentary.",
      badge: "Observe"
    },
    {
      icon: Archive,
      title: "Friend Archive",
      description: "Every finished match gets saved with turn-by-turn replay.",
      badge: "Memory"
    }
  ];

  return (
    <section className="py-24 px-4 bg-gradient-to-b from-background to-accent/20">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="font-body text-5xl md:text-6xl font-semibold text-foreground mb-6">
            Quiet Camaraderie
          </h2>
          <p className="text-xl md:text-2xl text-muted-foreground font-body max-w-2xl mx-auto leading-relaxed">
            Academic companionship instead of hyper-competitive leaderboards.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={feature.title}
                className="p-8 hover:shadow-medium transition-all duration-500 border-2 border-border hover:border-indigo/30 group relative overflow-hidden"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo/10 transition-colors duration-500" />
                
                <div className="relative">
                  <div className="flex items-start justify-between mb-6">
                    <div className="p-3 bg-accent rounded-lg group-hover:bg-indigo/10 transition-colors duration-300">
                      <Icon className="h-6 w-6 text-indigo" />
                    </div>
                    <Badge variant="outline" className="font-mono text-xs border-graphite">
                      {feature.badge}
                    </Badge>
                  </div>
                  
                  <h3 className="font-body text-2xl font-semibold mb-3 text-foreground group-hover:text-indigo transition-colors duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed font-body text-lg">
                    {feature.description}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Example Friend Card */}
        <div className="max-w-md mx-auto">
          <Card className="p-8 border-2 border-indigo/20 shadow-paper hover:shadow-medium transition-all duration-300">
            <div className="flex items-start gap-4 mb-6">
              <Avatar className="h-16 w-16 border-2 border-indigo">
                <AvatarFallback className="bg-indigo text-primary-foreground text-xl font-body">
                  AM
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <h4 className="font-body text-xl font-semibold text-foreground mb-1">
                  A. Mathematician
                </h4>
                <p className="text-sm text-muted-foreground font-mono mb-2">
                  Favorite size: 11 × 11
                </p>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-ochre animate-gentle-pulse" />
                  <span className="text-xs font-mono text-muted-foreground">
                    Studying
                  </span>
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground font-mono mb-4">
                Last move: <span className="text-foreground">E7</span> → building bridge
              </p>
              <Button variant="outline" className="w-full gap-2 group">
                Watch Game
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default FriendsSection;

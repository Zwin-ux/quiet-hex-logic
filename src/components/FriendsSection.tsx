import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Eye, BookOpen, Archive } from "lucide-react";

const FriendsSection = () => {
  const features = [
    {
      icon: Users,
      title: "Study Together",
      description: "Share puzzles and opening patterns with friends.",
      badge: "Collaborative",
    },
    {
      icon: BookOpen,
      title: "Casual Duels",
      description: "Invite via short code, no account required.",
      badge: "Quick Start",
    },
    {
      icon: Eye,
      title: "Spectator Room",
      description: "Watch two AIs or humans play slowly with commentary.",
      badge: "Observe",
    },
    {
      icon: Archive,
      title: "Friend Archive",
      description: "Every finished match gets saved with turn-by-turn replay.",
      badge: "Memory",
    },
  ];

  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-ink mb-4">
            Quiet Camaraderie
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Academic companionship instead of hyper-competitive leaderboards.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={index}
                className="border-graphite/30 shadow-paper hover:shadow-medium transition-all duration-300 bg-card/95 backdrop-blur-sm"
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="p-3 bg-indigo/10 rounded-lg">
                      <Icon className="w-6 h-6 text-indigo" />
                    </div>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {feature.badge}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl text-ink">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base text-muted-foreground leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Example friend card */}
        <div className="mt-12 max-w-2xl mx-auto">
          <Card className="border-graphite/40 shadow-paper bg-card/95 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo/20 rounded-full flex items-center justify-center font-mono text-indigo font-semibold text-lg">
                    AM
                  </div>
                  <div>
                    <CardTitle className="text-lg">A. Mathematician</CardTitle>
                    <CardDescription className="font-mono text-sm">
                      Favorite size: 11 × 11
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="font-mono">
                  Studying
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-8 h-8 bg-graphite/20 rounded"></div>
                <span className="font-mono">Last move: E7 → building bridge</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default FriendsSection;

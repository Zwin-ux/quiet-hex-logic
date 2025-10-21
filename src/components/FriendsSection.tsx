import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Puzzle, Eye, Archive } from "lucide-react";

const FriendsSection = () => {
  const features = [
    {
      icon: Users,
      title: "Multiplayer",
      description: "Play with friends or online opponents",
      badge: "Social"
    },
    {
      icon: Puzzle,
      title: "AI Opponents",
      description: "Practice against AI with multiple difficulty levels",
      badge: "Practice"
    },
    {
      icon: Eye,
      title: "Spectate",
      description: "Watch live games",
      badge: "Watch"
    },
    {
      icon: Archive,
      title: "Match History",
      description: "Review past games",
      badge: "Replay"
    }
  ];

  return (
    <section className="py-24 px-4 bg-gradient-to-b from-background to-accent/20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-body text-4xl md:text-5xl font-semibold text-foreground mb-6">
            Features
          </h2>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-2 gap-6">
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
      </div>
    </section>
  );
};

export default FriendsSection;

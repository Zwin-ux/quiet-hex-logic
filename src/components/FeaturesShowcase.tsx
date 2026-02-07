import { Trophy, Users, Globe } from 'lucide-react';

const features = [
  {
    icon: Trophy,
    title: 'Ranked Matchmaking',
    description: 'Compete in ELO-rated matches across Hex, Chess, Checkers, and Connect 4.',
  },
  {
    icon: Users,
    title: 'Tournaments',
    description: 'Join community tournaments with prize pools and climb the leaderboard.',
  },
  {
    icon: Globe,
    title: 'Play Anywhere',
    description: 'Web, iOS, and Discord Activity. Your progress syncs everywhere.',
  },
];

export function FeaturesShowcase() {
  return (
    <section className="py-16 px-6 border-t border-border/30">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-display font-bold text-center mb-10">
          Built for Competition
        </h2>

        <div className="grid sm:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="flex flex-col items-center text-center p-6 rounded-2xl glass"
            >
              <div className="h-12 w-12 rounded-xl bg-game-hex/10 flex items-center justify-center mb-4">
                <f.icon className="h-6 w-6 text-game-hex" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

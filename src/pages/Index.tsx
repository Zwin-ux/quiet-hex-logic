import Hero from "@/components/Hero";
import FriendsSection from "@/components/FriendsSection";
import LearnMode from "@/components/LearnMode";
import { MultiplayerSimulation } from "@/components/MultiplayerSimulation";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="relative">
      <Hero />
      <FriendsSection />
      <LearnMode />
      
      {/* Developer Tools - Multiplayer Simulation */}
      {user && (
        <section className="py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <MultiplayerSimulation />
          </div>
        </section>
      )}
      
      {/* Footer */}
      <footer className="py-12 px-6 border-t border-graphite/30">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-muted-foreground font-mono text-sm">
            Hexology © 2025
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;

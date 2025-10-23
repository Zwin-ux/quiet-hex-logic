import Hero from "@/components/Hero";
import FriendsSection from "@/components/FriendsSection";
import LearnMode from "@/components/LearnMode";
import AutoPlayDemo from "@/components/AutoPlayDemo";

const Index = () => {
  return (
    <div className="relative">
      <Hero />
      <FriendsSection />
      <LearnMode />
      <AutoPlayDemo />
      
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

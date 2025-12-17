import { Link } from "react-router-dom";
import Hero from "@/components/Hero";
import AutoPlayDemo from "@/components/AutoPlayDemo";
import { TournamentBanner } from "@/components/TournamentBanner";

const Index = () => {
  return (
    <div className="relative">
      <TournamentBanner />
      <Hero />
      <AutoPlayDemo />
      
      {/* Footer */}
      <footer className="py-8 px-6 border-t border-graphite/30">
        <div className="max-w-6xl mx-auto text-center space-y-2">
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
            <span>•</span>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          </div>
          <p className="text-muted-foreground font-mono text-sm">
            Hexology © 2025 • <a href="https://www.bonelli.dev/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors underline">Bonelli.dev</a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;

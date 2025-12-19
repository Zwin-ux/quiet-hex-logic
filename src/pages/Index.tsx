import { Link } from "react-router-dom";
import Hero from "@/components/Hero";
import AutoPlayDemo from "@/components/AutoPlayDemo";

const Index = () => {
  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Launch Banner */}
      <div className="bg-indigo text-paper py-2.5 px-4 text-center text-xs sm:text-sm font-mono tracking-widest relative overflow-hidden border-b border-paper/10 shrink-0">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.05),transparent)] bg-[length:200%_100%] animate-gradient-x pointer-events-none" />
        <div className="relative z-10 flex items-center justify-center gap-3 sm:gap-6 flex-wrap">
          <span className="font-bold text-paper">OFFICIAL LAUNCH DEC 25TH</span>
          <span className="opacity-30 hidden sm:inline text-paper">|</span>
          <span className="font-bold text-accent">TOURNAMENT JAN 1ST $500</span>
        </div>
      </div>

      <div className="flex-grow">
        <Hero />
        <AutoPlayDemo />
      </div>
      
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

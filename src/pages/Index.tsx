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
          <span className="font-bold text-paper">OFFICIAL LAUNCH JAN 25TH</span>
          <span className="opacity-30 hidden sm:inline text-paper">|</span>
          <span className="font-bold text-accent">FIRST TOURNAMENT FEB 25TH $500</span>
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
            <a href="https://discord.gg/67EmmZu69q" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              Join Discord
            </a>
            <span>•</span>
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

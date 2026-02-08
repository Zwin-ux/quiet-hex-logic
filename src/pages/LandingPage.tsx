import { memo } from "react";
import { Link } from "react-router-dom";
import { NavBar } from "@/components/NavBar";
import Hero from "@/components/Hero";
import { GameGrid } from "@/components/GameGrid";
import { FeaturedMods } from "@/components/FeaturedMods";
import { FeaturesShowcase } from "@/components/FeaturesShowcase";

const LandingPage = memo(() => {
  return (
    <div className="relative min-h-screen flex flex-col">
      <NavBar />

      <main className="flex-grow pt-12">
        <Hero />
        <GameGrid />
        <FeaturedMods />
        <FeaturesShowcase />
      </main>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-white/5 bg-black/20">
        <div className="max-w-6xl mx-auto text-center space-y-6">
          <div className="flex items-center justify-center gap-6 text-sm font-mono uppercase tracking-widest text-muted-foreground">
            <a href="https://discord.gg/67EmmZu69q" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
              Discord
            </a>
            <span className="opacity-20">·</span>
            <Link to="/terms" className="hover:text-primary transition-colors">Terms</Link>
            <span className="opacity-20">·</span>
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
          </div>
          <p className="text-muted-foreground/40 font-mono text-[10px] uppercase tracking-[0.4em]">
            Hexology © 2026 boutique strategy hub
          </p>
        </div>
      </footer>
    </div>
  );
});

LandingPage.displayName = "LandingPage";

export default LandingPage;

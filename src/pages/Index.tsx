import Hero from "@/components/Hero";
import AutoPlayDemo from "@/components/AutoPlayDemo";

const Index = () => {
  return (
    <div className="relative">
      <Hero />
      <AutoPlayDemo />
      
      {/* Footer */}
      <footer className="py-8 px-6 border-t border-graphite/30">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-muted-foreground font-mono text-sm">
            Hexology © 2025 • <a href="https://www.bonelli.dev/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors underline">Bonelli.dev</a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;

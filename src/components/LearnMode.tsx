import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const LearnMode = () => {
  const steps = [
    { number: 1, title: "Place a stone", description: "Make your first move" },
    { number: 2, title: "Connect your sides", description: "Build a path from edge to edge" },
    { number: 3, title: "Win the game", description: "Complete your connection first" }
  ];

  const handleStartTutorial = () => {
    window.location.href = '/tutorial';
  };

  return (
    <section className="py-24 px-4 bg-gradient-to-b from-accent/20 to-background">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="font-body text-5xl md:text-6xl font-semibold text-foreground mb-12">
          Learn to Play
        </h2>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {steps.map((step, idx) => (
            <Card 
              key={step.number}
              className="p-8 text-left border-2 border-border hover:border-ochre/40 transition-all duration-500 hover:shadow-medium group relative overflow-hidden"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="absolute top-0 left-0 w-32 h-32 bg-ochre/5 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2 group-hover:bg-ochre/10 transition-colors duration-500" />
              
              <div className="relative">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo/10 to-ochre/10 flex items-center justify-center group-hover:from-indigo/20 group-hover:to-ochre/20 transition-all duration-300">
                    <span className="text-2xl font-body font-semibold text-indigo">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="font-body text-2xl font-semibold text-foreground group-hover:text-ochre transition-colors duration-300">
                    {step.title}
                  </h3>
                </div>
                <p className="text-muted-foreground text-lg font-body leading-relaxed">
                  {step.description}
                </p>
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-12 md:p-16 bg-gradient-to-br from-indigo/5 via-accent/10 to-ochre/5 border-2 border-indigo/20 shadow-paper relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxIDAgNiAyLjY5IDYgNnMtMi42OSA2LTYgNi02LTIuNjktNi02IDIuNjktNiA2LTZ6TTI0IDQyYzMuMzEgMCA2IDIuNjkgNiA2cy0yLjY5IDYtNiA2LTYtMi42OS02LTYgMi42OS02IDYtNnoiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLW9wYWNpdHk9Ii4wMiIvPjwvZz48L3N2Zz4=')] opacity-30" />
          
          <div className="relative">
            <Button 
              size="lg"
              className="text-lg px-10 py-7 h-auto font-body shadow-medium hover:shadow-soft transition-all duration-300"
              onClick={handleStartTutorial}
            >
              Start Tutorial
            </Button>
          </div>
        </Card>
      </div>
    </section>
  );
};

export default LearnMode;

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const LearnMode = () => {
  const steps = [
    {
      number: "1",
      title: "Place a stone",
      description: "Choose your side and make your first move",
    },
    {
      number: "2",
      title: "Connect your sides",
      description: "Build an unbroken path from edge to edge",
    },
    {
      number: "3",
      title: "The pie rule",
      description: "Balance ensures fairness from the first move",
    },
    {
      number: "4",
      title: "You're ready",
      description: "Every move is a question. The board will answer.",
    },
  ];

  return (
    <section className="py-24 px-6 bg-gradient-to-b from-background via-accent/5 to-background">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-ink mb-4">
            Learn the Language
          </h2>
          <p className="text-lg text-muted-foreground italic">
            "Every move is a question. The board will answer."
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {steps.map((step, index) => (
            <Card 
              key={index}
              className="border-graphite/30 shadow-paper bg-card/95 backdrop-blur-sm hover:shadow-medium transition-all duration-300"
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-indigo/10 flex items-center justify-center">
                    <span className="text-2xl font-bold text-indigo font-mono">
                      {step.number}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-ink mb-2">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Card className="inline-block border-ochre/40 bg-ochre/5 shadow-paper">
            <CardContent className="py-8 px-12">
              <p className="text-xl text-ink mb-6 italic">
                "Hexology doesn't reward speed. It rewards clarity."
              </p>
              <Button variant="hero" size="lg">
                Start Tutorial
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default LearnMode;

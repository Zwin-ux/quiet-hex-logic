import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, ArrowRight } from 'lucide-react';

interface TutorialStep {
  id: number;
  title: string;
  description: string;
  highlight?: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 1,
    title: 'Place a Stone',
    description: 'Click any empty hexagon to place your stone. Indigo connects West to East, Ochre connects North to South.',
    highlight: 'board'
  },
  {
    id: 2,
    title: 'Connect Your Sides',
    description: 'Build a continuous path of your color from one side to the opposite. Stones of the same color touching form connections.',
    highlight: 'edges'
  },
  {
    id: 3,
    title: 'The Pie Rule',
    description: 'After the first move, the second player may choose to swap colors. This keeps the game fair—first player advantage is nullified.',
    highlight: 'swap'
  },
  {
    id: 4,
    title: 'Win Condition',
    description: 'First to complete their connection wins. No draws are possible—every game reaches a conclusion. Simple, elegant, decisive.',
    highlight: 'victory'
  }
];

interface TutorialOverlayProps {
  onClose: () => void;
}

export const TutorialOverlay = ({ onClose }: TutorialOverlayProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const step = TUTORIAL_STEPS[currentStep];

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full p-8 shadow-lg relative animate-scale-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-muted rounded-full transition-colors"
        >
          <X className="h-5 w-5 text-muted-foreground" />
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            {TUTORIAL_STEPS.map((s, idx) => (
              <div
                key={s.id}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  idx <= currentStep 
                    ? idx === currentStep ? 'bg-indigo' : 'bg-ochre'
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>

          <div className="flex items-baseline gap-3 mb-2">
            <span className="font-mono text-sm text-muted-foreground">
              Step {step.id} of {TUTORIAL_STEPS.length}
            </span>
          </div>
          
          <h2 className="font-body text-3xl font-semibold text-foreground mb-3">
            {step.title}
          </h2>
          
          <p className="font-body text-lg text-muted-foreground leading-relaxed">
            {step.description}
          </p>
        </div>

        <div className="flex gap-3">
          {currentStep > 0 && (
            <Button
              variant="outline"
              onClick={handlePrevious}
              className="flex-1"
            >
              Previous
            </Button>
          )}
          
          <Button
            onClick={handleNext}
            className={`flex-1 gap-2 ${currentStep === 0 ? 'w-full' : ''}`}
          >
            {currentStep < TUTORIAL_STEPS.length - 1 ? (
              <>
                Next
                <ArrowRight className="h-4 w-4" />
              </>
            ) : (
              'Start Playing'
            )}
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-4 font-mono">
          Press ESC to skip
        </p>
      </Card>
    </div>
  );
};
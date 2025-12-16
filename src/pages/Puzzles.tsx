import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Target, Zap, Crown, Check, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { usePremium } from '@/hooks/usePremium';
import { usePuzzles, Puzzle } from '@/hooks/usePuzzles';
import PuzzleSolver from '@/components/PuzzleSolver';

const difficultyConfig = {
  beginner: { label: 'Beginner', color: 'bg-green-500', icon: Target },
  intermediate: { label: 'Intermediate', color: 'bg-yellow-500', icon: Zap },
  advanced: { label: 'Advanced', color: 'bg-orange-500', icon: Trophy },
  master: { label: 'Master', color: 'bg-red-500', icon: Crown },
};

export default function Puzzles() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPremium } = usePremium(user?.id);
  const { puzzles, attempts, loading } = usePuzzles(user?.id);
  const [selectedPuzzle, setSelectedPuzzle] = useState<Puzzle | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  const filteredPuzzles = activeTab === 'all' 
    ? puzzles 
    : puzzles.filter(p => p.difficulty === activeTab);

  const solvedCount = Object.values(attempts).filter(a => a.completed).length;

  if (selectedPuzzle) {
    return (
      <PuzzleSolver 
        puzzle={selectedPuzzle} 
        onBack={() => setSelectedPuzzle(null)}
        onComplete={(success) => {
          if (success) {
            // Refresh will happen via hook
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate('/');
            }
          }}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-bold mb-2">Puzzle Training</h1>
          <p className="text-muted-foreground">
            Sharpen your skills with tactical puzzles
          </p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <Badge variant="secondary" className="text-sm px-3 py-1">
              <Check className="h-4 w-4 mr-1" />
              {solvedCount} / {puzzles.length} Solved
            </Badge>
            {!isPremium && (
              <Badge variant="outline" className="text-amber-600 border-amber-400">
                <Lock className="h-3 w-3 mr-1" />
                3 puzzles/day (Free)
              </Badge>
            )}
          </div>
        </div>

        {/* Difficulty Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="beginner">Beginner</TabsTrigger>
            <TabsTrigger value="intermediate">Intermediate</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
            <TabsTrigger value="master">Master</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Puzzles Grid */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading puzzles...</div>
        ) : filteredPuzzles.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No puzzles found</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filteredPuzzles.map((puzzle) => {
              const config = difficultyConfig[puzzle.difficulty];
              const attempt = attempts[puzzle.id];
              const solved = attempt?.completed;
              const DifficultyIcon = config.icon;

              return (
                <Card 
                  key={puzzle.id} 
                  className={`cursor-pointer transition-all hover:border-primary/50 ${solved ? 'bg-green-500/5 border-green-500/30' : ''}`}
                  onClick={() => setSelectedPuzzle(puzzle)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {puzzle.title}
                          {solved && <Check className="h-4 w-4 text-green-500" />}
                        </CardTitle>
                        <CardDescription>{puzzle.description}</CardDescription>
                      </div>
                      <Badge className={`${config.color} text-white`}>
                        <DifficultyIcon className="h-3 w-3 mr-1" />
                        {config.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Rating: {puzzle.rating}</span>
                      <span>{puzzle.board_size}x{puzzle.board_size}</span>
                      <span className="capitalize">{puzzle.category}</span>
                    </div>
                    {attempt && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Attempts: {attempt.attempts}
                        {attempt.time_seconds && ` · Best: ${attempt.time_seconds}s`}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Premium Upsell */}
        {!isPremium && (
          <Card className="mt-8 border-amber-400/50 bg-gradient-to-br from-amber-500/5 to-yellow-400/5">
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <Crown className="h-5 w-5 text-amber-500" />
                  Unlimited Puzzles
                </h3>
                <p className="text-sm text-muted-foreground">
                  Get unlimited puzzle access with Hexology+
                </p>
              </div>
              <Button 
                onClick={() => navigate('/premium')}
                className="bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-950"
              >
                Upgrade
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

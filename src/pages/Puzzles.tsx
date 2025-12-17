import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Target, Zap, Crown, Check, Lock, Flame, Calendar, Star, Timer, Book } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { usePremium } from '@/hooks/usePremium';
import { usePuzzles, Puzzle } from '@/hooks/usePuzzles';
import PuzzleSolver from '@/components/PuzzleSolver';
import PuzzleRush from '@/components/PuzzleRush';
import OpeningBook from '@/components/OpeningBook';

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
  const { puzzles, dailyPuzzle, attempts, streakInfo, loading, recordAttempt, completeDailyPuzzle } = usePuzzles(user?.id);
  const [selectedPuzzle, setSelectedPuzzle] = useState<Puzzle | null>(null);
  const [activeTab, setActiveTab] = useState('daily');
  const [showRush, setShowRush] = useState(false);
  const [showOpenings, setShowOpenings] = useState(false);

  const filteredPuzzles = activeTab === 'all' 
    ? puzzles 
    : activeTab === 'daily'
    ? dailyPuzzle ? [dailyPuzzle] : []
    : puzzles.filter(p => p.difficulty === activeTab);

  const solvedCount = Object.values(attempts).filter(a => a.completed).length;

  const handlePuzzleComplete = async (success: boolean) => {
    if (success && selectedPuzzle && dailyPuzzle && selectedPuzzle.id === dailyPuzzle.id) {
      await completeDailyPuzzle();
    }
  };

  if (showRush) {
    return (
      <PuzzleRush 
        puzzles={puzzles}
        userId={user?.id}
        isPremium={isPremium}
        onBack={() => setShowRush(false)}
      />
    );
  }

  if (selectedPuzzle) {
    return (
      <PuzzleSolver 
        puzzle={selectedPuzzle} 
        onBack={() => setSelectedPuzzle(null)}
        onComplete={handlePuzzleComplete}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
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
          <div className="flex items-center justify-center gap-4 mt-4 flex-wrap">
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
          
          {/* Quick Actions */}
          <div className="flex gap-2 justify-center mt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowRush(true)}
              className="gap-2"
            >
              <Timer className="h-4 w-4" />
              Puzzle Rush
              {!isPremium && <Lock className="h-3 w-3 ml-1" />}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowOpenings(prev => !prev)}
              className="gap-2"
            >
              <Book className="h-4 w-4" />
              Opening Book
            </Button>
          </div>
        </div>

        {/* Opening Book Panel */}
        {showOpenings && (
          <div className="mb-6">
            <OpeningBook boardSize={11} ply={0} />
          </div>
        )}

        {/* Streak Card */}
        <Card className="mb-6 border-2 border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
          <CardContent className="py-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Flame className="h-7 w-7 text-amber-500" />
                </div>
                <div>
                  <div className="text-3xl font-bold">{streakInfo.currentStreak}</div>
                  <div className="text-sm text-muted-foreground">Day Streak</div>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="text-xl font-semibold">{streakInfo.bestStreak}</div>
                  <div className="text-xs text-muted-foreground">Best Streak</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {streakInfo.completedToday ? (
                      <Check className="h-5 w-5 text-green-500" />
                    ) : (
                      <span className="text-amber-500 font-medium">!</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {streakInfo.completedToday ? 'Done Today' : 'Do Today'}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily Puzzle Highlight */}
        {dailyPuzzle && !streakInfo.completedToday && (
          <Card 
            className="mb-6 border-2 border-indigo/50 bg-indigo/5 cursor-pointer hover:shadow-lg transition-all"
            onClick={() => setSelectedPuzzle(dailyPuzzle)}
          >
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-indigo/20 flex items-center justify-center">
                    <Star className="h-6 w-6 text-indigo" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Daily Puzzle</h3>
                    <p className="text-sm text-muted-foreground">{dailyPuzzle.title}</p>
                  </div>
                </div>
                <Button className="bg-indigo hover:bg-indigo/90">
                  Solve Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Difficulty Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="beginner">Beginner</TabsTrigger>
            <TabsTrigger value="intermediate">Medium</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
            <TabsTrigger value="master">Master</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Puzzles Grid */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading puzzles...</div>
        ) : filteredPuzzles.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {activeTab === 'daily' && streakInfo.completedToday 
              ? "You've completed today's puzzle! Come back tomorrow."
              : 'No puzzles found'}
          </div>
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
                          {puzzle.is_daily && <Star className="h-4 w-4 text-amber-500" />}
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

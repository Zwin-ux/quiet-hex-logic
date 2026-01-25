/**
 * Practice Mode Component
 * Allows position setup, handicap games, and unlimited undo
 */

import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Hex } from '@/lib/hex/engine';
import { DIFFICULTY_CONFIGS, getDifficultyLevels, type AIDifficultyLevel } from '@/lib/hex/aiDifficulty';
import { Play, RotateCcw, Target, Zap, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

interface PracticeModeProps {
  userId: string;
  onStartGame: (config: PracticeConfig) => void;
}

export interface PracticeConfig {
  boardSize: number;
  difficulty: AIDifficultyLevel;
  handicap: number; // AI starts with this many stones
  pieRule: boolean;
  unlimitedUndo: boolean;
  setupMoves?: number[]; // Pre-placed stones for position setup
}

export function PracticeMode({ onStartGame }: PracticeModeProps) {
  const [boardSize, setBoardSize] = useState(9);
  const [difficulty, setDifficulty] = useState<AIDifficultyLevel>('medium');
  const [handicap, setHandicap] = useState(0);
  const [pieRule, setPieRule] = useState(true);
  const [unlimitedUndo, setUnlimitedUndo] = useState(true);
  const [setupMode, setSetupMode] = useState(false);
  const [setupEngine, setSetupEngine] = useState<Hex | null>(null);
  const [setupMoves, setSetupMoves] = useState<number[]>([]);
  const [placingColor, setPlacingColor] = useState<1 | 2>(1);

  const difficultyConfig = DIFFICULTY_CONFIGS[difficulty];

  // Initialize setup board when entering setup mode
  const toggleSetupMode = useCallback(() => {
    if (!setupMode) {
      setSetupEngine(new Hex(boardSize, false));
      setSetupMoves([]);
    } else {
      setSetupEngine(null);
    }
    setSetupMode(!setupMode);
  }, [setupMode, boardSize]);

  // Handle click in setup mode
  const handleSetupClick = useCallback((cell: number) => {
    if (!setupEngine) return;
    
    // Toggle cell - if it's already occupied, clear it
    const currentOccupant = setupEngine.board[cell];
    
    if (currentOccupant > 0) {
      // Clear the cell
      const newEngine = new Hex(boardSize, false);
      const newMoves = setupMoves.filter(m => m !== cell);
      newMoves.forEach((m, i) => {
        newEngine.board[m] = (i % 2 === 0) ? 1 : 2;
      });
      setSetupEngine(newEngine);
      setSetupMoves(newMoves);
    } else {
      // Place stone
      const newEngine = setupEngine.clone();
      newEngine.board[cell] = placingColor;
      setSetupEngine(newEngine);
      setSetupMoves([...setupMoves, cell]);
    }
  }, [setupEngine, setupMoves, placingColor, boardSize]);

  // Clear setup board
  const clearSetup = useCallback(() => {
    setSetupEngine(new Hex(boardSize, false));
    setSetupMoves([]);
  }, [boardSize]);

  // Start the practice game
  const handleStart = useCallback(() => {
    const config: PracticeConfig = {
      boardSize,
      difficulty,
      handicap,
      pieRule: setupMode ? false : pieRule, // No pie rule with setup positions
      unlimitedUndo,
      setupMoves: setupMode ? setupMoves : undefined
    };

    onStartGame(config);
    toast.success('Starting practice game', {
      description: `${difficultyConfig.name} AI (${difficultyConfig.eloRange[0]}-${difficultyConfig.eloRange[1]} ELO)`
    });
  }, [boardSize, difficulty, handicap, pieRule, unlimitedUndo, setupMode, setupMoves, difficultyConfig, onStartGame]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo/10">
            <Target className="h-6 w-6 text-indigo" />
          </div>
          <div>
            <h2 className="font-body text-2xl font-semibold">Practice Mode</h2>
            <p className="text-sm text-muted-foreground">
              Customize your training session
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Settings Panel */}
        <Card className="p-6 space-y-6">
          {/* Difficulty Selection */}
          <div>
            <label className="text-sm font-medium mb-3 block flex items-center gap-2">
              <Zap className="h-4 w-4 text-indigo" />
              AI Difficulty
            </label>
            <div className="grid grid-cols-3 gap-2">
              {getDifficultyLevels().map((level) => {
                const config = DIFFICULTY_CONFIGS[level];
                const isSelected = difficulty === level;
                const isPremium = level === 'master';
                
                return (
                  <button
                    key={level}
                    onClick={() => !isPremium && setDifficulty(level)}
                    disabled={isPremium}
                    className={`
                      relative p-3 rounded-lg border-2 transition-all text-left
                      ${isSelected 
                        ? 'border-indigo bg-indigo/10' 
                        : 'border-border hover:border-indigo/50'
                      }
                      ${isPremium ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${config.color}`} />
                      <span className="font-medium text-sm">{config.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      ~{Math.floor((config.eloRange[0] + config.eloRange[1]) / 2)} ELO
                    </p>
                    {isPremium && (
                      <Badge className="absolute -top-2 -right-2 text-xs bg-gradient-to-r from-amber-500 to-orange-500">
                        Premium
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {difficultyConfig.description}
            </p>
          </div>

          {/* Board Size */}
          <div>
            <label className="text-sm font-medium mb-2 block">Board Size</label>
            <Select value={boardSize.toString()} onValueChange={(v) => setBoardSize(parseInt(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7×7 - Quick</SelectItem>
                <SelectItem value="9">9×9 - Standard</SelectItem>
                <SelectItem value="11">11×11 - Classic</SelectItem>
                <SelectItem value="13">13×13 - Extended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Handicap */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Handicap (AI starts with {handicap} stone{handicap !== 1 ? 's' : ''})
            </label>
            <Slider
              value={[handicap]}
              onValueChange={([v]) => setHandicap(v)}
              min={0}
              max={3}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>No handicap</span>
              <span>Maximum</span>
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
              <div>
                <p className="font-medium text-sm">Pie Rule</p>
                <p className="text-xs text-muted-foreground">Swap option on move 2</p>
              </div>
              <Switch 
                checked={pieRule} 
                onCheckedChange={setPieRule}
                disabled={setupMode}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
              <div>
                <p className="font-medium text-sm">Unlimited Undo</p>
                <p className="text-xs text-muted-foreground">Take back any move</p>
              </div>
              <Switch checked={unlimitedUndo} onCheckedChange={setUnlimitedUndo} />
            </div>

            <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
              <div>
                <p className="font-medium text-sm">Position Setup</p>
                <p className="text-xs text-muted-foreground">Place stones before playing</p>
              </div>
              <Switch checked={setupMode} onCheckedChange={toggleSetupMode} />
            </div>
          </div>

          {/* Start Button */}
          <Button 
            onClick={handleStart} 
            className="w-full h-12 text-lg gap-2"
          >
            <Play className="h-5 w-5" />
            Start Practice
          </Button>
        </Card>

        {/* Setup Board Preview */}
        {setupMode && setupEngine && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Settings2 className="h-5 w-5 text-indigo" />
                <span className="font-medium">Position Setup</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={placingColor === 1 ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPlacingColor(1)}
                  className="gap-1"
                >
                  <div className="w-3 h-3 rounded-full bg-indigo" />
                  Indigo
                </Button>
                <Button
                  variant={placingColor === 2 ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPlacingColor(2)}
                  className="gap-1"
                >
                  <div className="w-3 h-3 rounded-full bg-ochre" />
                  Ochre
                </Button>
                <Button variant="ghost" size="sm" onClick={clearSetup}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="aspect-square max-w-md mx-auto bg-accent/30 rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
              <div className="text-center p-6">
                <Settings2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  {setupMoves.length} stones placed
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Position setup available after starting
                </p>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground text-center mt-4">
              Setup stones will be applied when the game starts.
            </p>
          </Card>
        )}

        {/* Preview without setup mode */}
        {!setupMode && (
          <Card className="p-6 flex flex-col items-center justify-center">
            <div className="text-center space-y-4">
              <div className="p-4 rounded-full bg-indigo/10 mx-auto w-fit">
                <Target className="h-12 w-12 text-indigo" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Ready to Practice</h3>
                <p className="text-sm text-muted-foreground">
                  Configure your settings and start training
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                <Badge variant="outline">{boardSize}×{boardSize} board</Badge>
                <Badge className={difficultyConfig.color}>
                  {difficultyConfig.name}
                </Badge>
                {handicap > 0 && (
                  <Badge variant="secondary">{handicap} stone handicap</Badge>
                )}
                {unlimitedUndo && (
                  <Badge variant="secondary">Unlimited undo</Badge>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

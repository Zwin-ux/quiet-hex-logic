import { useState } from 'react';
import { Book, ChevronRight, Lightbulb, Target, Star } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NAMED_OPENINGS, OPENING_STRATEGIES, getOpeningRecommendations, Opening } from '@/lib/hex/openings';

interface OpeningBookProps {
  boardSize?: number;
  ply?: number;
  onSelectOpening?: (opening: Opening) => void;
}

export default function OpeningBook({ boardSize = 11, ply = 0, onSelectOpening }: OpeningBookProps) {
  const [selectedOpening, setSelectedOpening] = useState<Opening | null>(null);

  const recommendations = getOpeningRecommendations(boardSize, ply);
  const filteredOpenings = NAMED_OPENINGS.filter(o => o.boardSize === boardSize);

  const difficultyColor = {
    beginner: 'bg-green-500',
    intermediate: 'bg-yellow-500',
    advanced: 'bg-red-500',
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Book className="h-5 w-5" />
          Opening Book
        </CardTitle>
        <CardDescription>Learn common openings and strategies</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="recommend" className="w-full">
          <TabsList className="w-full grid grid-cols-3 mx-4" style={{ width: 'calc(100% - 2rem)' }}>
            <TabsTrigger value="recommend">Recommend</TabsTrigger>
            <TabsTrigger value="openings">Openings</TabsTrigger>
            <TabsTrigger value="strategy">Strategy</TabsTrigger>
          </TabsList>

          <TabsContent value="recommend" className="p-4 pt-2">
            {recommendations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Opening recommendations are available for moves 1-2.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-3">
                  Recommended moves for {ply === 0 ? 'first' : 'second'} player:
                </p>
                {recommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{rec.name}</span>
                          {rec.isCenter && <Star className="h-3 w-3 text-amber-500" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{rec.description}</p>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={rec.strength === 'strong' ? 'border-green-500 text-green-600' : ''}
                      >
                        {rec.strength}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="openings" className="p-4 pt-2">
            <ScrollArea className="h-[300px]">
              <div className="space-y-2 pr-4">
                {filteredOpenings.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No openings available for this board size.
                  </p>
                ) : (
                  filteredOpenings.map((opening) => (
                    <div
                      key={opening.id}
                      className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedOpening(opening);
                        onSelectOpening?.(opening);
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{opening.name}</span>
                            <Badge className={`${difficultyColor[opening.difficulty]} text-white text-xs`}>
                              {opening.difficulty}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {opening.description}
                          </p>
                          <div className="flex gap-1 mt-2">
                            {opening.tags.slice(0, 3).map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          {opening.winRate && (
                            <span className="text-xs text-muted-foreground">{opening.winRate}%</span>
                          )}
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="strategy" className="p-4 pt-2">
            <ScrollArea className="h-[300px]">
              <div className="space-y-4 pr-4">
                {OPENING_STRATEGIES.map((strategy, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-indigo" />
                      <span className="font-medium">{strategy.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{strategy.description}</p>
                    <div className="flex items-start gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/20">
                      <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-700 dark:text-amber-400">{strategy.tip}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

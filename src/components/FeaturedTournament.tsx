import React from 'react';
import { Trophy, Users, Clock, ArrowRight, Sparkles } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';

interface FeaturedTournamentProps {
  tournament: {
    id: string;
    name: string;
    description: string | null;
    prize_pool?: string;
    max_players: number;
    participant_count: number;
    board_size: number;
  };
  onView: () => void;
}

export const FeaturedTournament: React.FC<FeaturedTournamentProps> = ({ tournament, onView }) => {
  return (
    <Card className="relative overflow-hidden border-none bg-gradient-to-br from-amber-600/20 via-yellow-500/10 to-transparent backdrop-blur-xl group">
      {/* Animated Background Element */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl group-hover:bg-amber-500/20 transition-colors duration-700" />
      
      <div className="relative p-8 flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1 space-y-4 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
            <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-none px-3 py-1 flex items-center gap-1 animate-pulse">
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              FEATURED EVENT
            </Badge>
            {tournament.prize_pool && (
              <Badge variant="outline" className="border-amber-500/50 text-amber-500 font-mono text-lg px-3">
                PRIZE: {tournament.prize_pool}
              </Badge>
            )}
          </div>
          
          <h2 className="text-4xl md:text-5xl font-body font-bold tracking-tight text-foreground">
            {tournament.name}
          </h2>
          
          <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
            {tournament.description || "The ultimate test of strategy. Compete for the crown and claim the title of Hex Champion!"}
          </p>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 pt-2">
            <div className="flex items-center gap-2 text-foreground/80 font-medium">
              <Users className="h-5 w-5 text-amber-500" />
              <span>{tournament.participant_count} / {tournament.max_players} Registered</span>
            </div>
            <div className="flex items-center gap-2 text-foreground/80 font-medium">
              <Clock className="h-5 w-5 text-amber-500" />
              <span>{tournament.board_size}x{tournament.board_size} Board</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="h-40 w-40 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 p-1 shadow-2xl shadow-amber-500/20 transform group-hover:scale-105 transition-transform duration-500">
            <div className="h-full w-full rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center">
              <Trophy className="h-20 w-20 text-white drop-shadow-lg" />
            </div>
          </div>
          <Button onClick={onView} size="lg" className="bg-amber-500 hover:bg-amber-600 text-white shadow-xl shadow-amber-500/20 px-8 py-6 text-lg font-bold group">
            ENTER NOW
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

import React from 'react';
import { Card } from './ui/card';
import { Trophy, Star, Target, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TournamentStatsProps {
  stats: {
    activeTournaments: number;
    totalPoints: number;
    globalRank: number | string;
    wins: number;
  };
}

export const TournamentStats: React.FC<TournamentStatsProps> = ({ stats }) => {
  const statItems = [
    { label: 'Active Games', value: stats.activeTournaments, icon: Target, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Hex Points', value: stats.totalPoints, icon: Star, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Global Rank', value: stats.globalRank, icon: Crown, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Tournament Wins', value: stats.wins, icon: Trophy, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statItems.map((item, idx) => (
        <Card key={idx} className="p-4 bg-white/5 backdrop-blur-md border-white/10 hover:bg-white/10 transition-colors group">
          <div className="flex items-center gap-4">
            <div className={cn("p-3 rounded-xl transition-transform group-hover:scale-110", item.bg)}>
              <item.icon className={cn("h-6 w-6", item.color)} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-mono uppercase tracking-wider">{item.label}</p>
              <p className="text-2xl font-bold font-body">{item.value}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

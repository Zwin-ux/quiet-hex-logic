import { useMemo } from 'react';
import { Area, AreaChart, XAxis, YAxis, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import type { RatingHistoryEntry } from '@/hooks/useRatingHistory';
import { InlineErrorBoundary } from '@/components/InlineErrorBoundary';

interface RatingHistoryChartProps {
  history: RatingHistoryEntry[];
  currentRating: number;
}

const chartConfig = {
  rating: {
    label: 'ELO Rating',
    color: 'hsl(var(--indigo))',
  },
} satisfies ChartConfig;

function coerceNumber(n: unknown, fallback: number): number {
  const v = Number(n);
  return Number.isFinite(v) ? v : fallback;
}

export function RatingHistoryChart({ history, currentRating }: RatingHistoryChartProps) {
  const safeCurrentRating = coerceNumber(currentRating, 1200);

  const safeHistory = useMemo(() => {
    return (history ?? [])
      .filter((h) =>
        Number.isFinite(Number((h as any).old_rating)) &&
        Number.isFinite(Number((h as any).new_rating)) &&
        Number.isFinite(Number((h as any).rating_change)) &&
        typeof (h as any).created_at === 'string'
      )
      .map((h) => ({
        ...h,
        old_rating: Number((h as any).old_rating),
        new_rating: Number((h as any).new_rating),
        rating_change: Number((h as any).rating_change),
      })) as RatingHistoryEntry[];
  }, [history]);

  const chartData = useMemo(() => {
    if (safeHistory.length === 0) {
      return [{ date: 'Start', rating: 1200, change: 0, matchDate: null }, { date: 'Now', rating: safeCurrentRating, change: 0, matchDate: null }];
    }

    return [
      { date: 'Start', rating: safeHistory[0].old_rating, change: 0, matchDate: null },
      ...safeHistory.map((entry, index) => ({
        date: `#${index + 1}`,
        rating: entry.new_rating,
        change: entry.rating_change,
        matchDate: new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      })),
    ];
  }, [safeHistory, safeCurrentRating]);

  const stats = useMemo(() => {
    if (safeHistory.length === 0) return { change: 0, direction: 'neutral' as const, min: 1200, max: 1200 };
    const startRating = safeHistory[0].old_rating;
    const endRating = safeHistory[safeHistory.length - 1].new_rating;
    const change = endRating - startRating;
    const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';
    const allRatings = [startRating, ...safeHistory.map((h) => h.new_rating)].filter((n) => Number.isFinite(n));
    const min = allRatings.length ? Math.min(...allRatings) : safeCurrentRating;
    const max = allRatings.length ? Math.max(...allRatings) : safeCurrentRating;
    return { change, direction, min, max };
  }, [safeHistory, safeCurrentRating]);

  const yAxisDomain = useMemo(() => {
    const padding = 50;
    const lo = Number.isFinite(stats.min) ? stats.min : safeCurrentRating;
    const hi = Number.isFinite(stats.max) ? stats.max : safeCurrentRating;
    const a = Math.floor((lo - padding) / 50) * 50;
    const b = Math.ceil((hi + padding) / 50) * 50;
    return [Number.isFinite(a) ? a : 1100, Number.isFinite(b) ? b : 1300];
  }, [stats.min, stats.max, safeCurrentRating]);

  return (
    <Card className="relative p-6 bg-gradient-to-br from-indigo/5 via-background to-ochre/5 border-indigo/20 hover:border-indigo/40 transition-all duration-300 group overflow-hidden">
      <div className="relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-indigo/10 group-hover:bg-indigo/20 transition-all">
              <TrendingUp className="h-6 w-6 text-indigo" />
            </div>
            <div>
              <h3 className="font-body text-xl font-bold">Rating History</h3>
              <p className="text-sm text-muted-foreground font-mono">
                Last {safeHistory.length} ranked {safeHistory.length === 1 ? 'match' : 'matches'}
              </p>
            </div>
          </div>

          {safeHistory.length > 0 && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold ${
              stats.direction === 'up'
                ? 'bg-green-500/10 text-green-500'
                : stats.direction === 'down'
                ? 'bg-red-500/10 text-red-500'
                : 'bg-muted text-muted-foreground'
            }`}>
              {stats.direction === 'up' && <TrendingUp className="h-4 w-4" />}
              {stats.direction === 'down' && <TrendingDown className="h-4 w-4" />}
              {stats.direction === 'neutral' && <Minus className="h-4 w-4" />}
              <span>{stats.change > 0 ? '+' : ''}{stats.change} ELO</span>
            </div>
          )}
        </div>

        {safeHistory.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <div className="flex justify-center mb-3 opacity-40">
                <TrendingUp className="h-10 w-10" />
              </div>
              <p className="font-mono">Play ranked matches to track your rating</p>
            </div>
          </div>
        ) : (
          <InlineErrorBoundary
            fallback={
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <div className="flex justify-center mb-3 opacity-40">
                    <TrendingUp className="h-10 w-10" />
                  </div>
                  <p className="font-mono">Chart unavailable in this browser environment</p>
                </div>
              </div>
            }
          >
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="ratingGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--indigo))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--indigo))" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <YAxis domain={yAxisDomain} tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} width={45} />
                <ReferenceLine y={1200} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" strokeOpacity={0.3} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, _name, item) => {
                        const payload = (item as any)?.payload ?? {};
                        const change = coerceNumber(payload?.change, 0);
                        const matchDate = payload?.matchDate ?? null;
                        return (
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-foreground">{value} ELO</span>
                            {change !== 0 && (
                              <span className={`text-xs ${change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {change > 0 ? '+' : ''}{change}
                              </span>
                            )}
                            {matchDate && <span className="text-xs text-muted-foreground">{matchDate}</span>}
                          </div>
                        );
                      }}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="rating"
                  stroke="hsl(var(--indigo))"
                  strokeWidth={2}
                  fill="url(#ratingGradient)"
                  dot={(props: any) => {
                    const cx = props?.cx;
                    const cy = props?.cy;
                    const payload = props?.payload ?? {};
                    if (payload?.date === 'Start') return null;
                    if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
                    const isPositive = coerceNumber(payload?.change, 0) >= 0;
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill={isPositive ? 'hsl(142 76% 36%)' : 'hsl(0 84% 60%)'}
                        stroke="hsl(var(--background))"
                        strokeWidth={2}
                      />
                    );
                  }}
                  activeDot={{ r: 6, stroke: 'hsl(var(--indigo))', strokeWidth: 2, fill: 'hsl(var(--background))' }}
                />
              </AreaChart>
            </ChartContainer>
          </InlineErrorBoundary>
        )}

        {safeHistory.length > 0 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50 text-sm text-muted-foreground font-mono">
            <span>Low: {stats.min}</span>
            <span>High: {stats.max}</span>
          </div>
        )}
      </div>
    </Card>
  );
}



import { useMemo } from 'react';
import { Area, AreaChart, XAxis, YAxis, ReferenceLine } from 'recharts';
import { Card } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { RatingHistoryEntry } from '@/hooks/useRatingHistory';

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

export function RatingHistoryChart({ history, currentRating }: RatingHistoryChartProps) {
  const chartData = useMemo(() => {
    if (history.length === 0) {
      return [{ date: 'Start', rating: 1200 }, { date: 'Now', rating: currentRating }];
    }

    // Add a starting point before first match
    const dataPoints = [
      {
        date: 'Start',
        rating: history[0].old_rating,
        change: 0,
        matchDate: null,
      },
      ...history.map((entry, index) => ({
        date: `#${index + 1}`,
        rating: entry.new_rating,
        change: entry.rating_change,
        matchDate: new Date(entry.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
      })),
    ];

    return dataPoints;
  }, [history, currentRating]);

  const stats = useMemo(() => {
    if (history.length === 0) {
      return { change: 0, direction: 'neutral' as const, min: 1200, max: 1200 };
    }

    const startRating = history[0].old_rating;
    const endRating = history[history.length - 1].new_rating;
    const change = endRating - startRating;
    const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';

    const allRatings = [startRating, ...history.map(h => h.new_rating)];
    const min = Math.min(...allRatings);
    const max = Math.max(...allRatings);

    return { change, direction, min, max };
  }, [history]);

  const yAxisDomain = useMemo(() => {
    const padding = 50;
    return [
      Math.floor((stats.min - padding) / 50) * 50,
      Math.ceil((stats.max + padding) / 50) * 50,
    ];
  }, [stats.min, stats.max]);

  return (
    <Card className="relative p-6 bg-gradient-to-br from-indigo/5 via-background to-ochre/5 border-indigo/20 hover:border-indigo/40 transition-all duration-300 group overflow-hidden">
      <div className="absolute top-4 right-4 text-6xl opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
        {stats.direction === 'up' ? '📈' : stats.direction === 'down' ? '📉' : '📊'}
      </div>

      <div className="relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-indigo/10 group-hover:bg-indigo/20 transition-all">
              <TrendingUp className="h-6 w-6 text-indigo" />
            </div>
            <div>
              <h3 className="font-body text-xl font-bold">Rating History</h3>
              <p className="text-sm text-muted-foreground font-mono">
                Last {history.length} ranked {history.length === 1 ? 'match' : 'matches'}
              </p>
            </div>
          </div>

          {history.length > 0 && (
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
              <span>
                {stats.change > 0 ? '+' : ''}{stats.change} ELO
              </span>
            </div>
          )}
        </div>

        {history.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <div className="text-4xl mb-3 opacity-30">📊</div>
              <p className="font-mono">Play ranked matches to track your rating</p>
            </div>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="ratingGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--indigo))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--indigo))" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              />
              <YAxis
                domain={yAxisDomain}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                width={45}
              />
              <ReferenceLine
                y={1200}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="3 3"
                strokeOpacity={0.3}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name, item) => (
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-foreground">{value} ELO</span>
                        {item.payload.change !== 0 && (
                          <span className={`text-xs ${
                            item.payload.change > 0 ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {item.payload.change > 0 ? '+' : ''}{item.payload.change}
                          </span>
                        )}
                        {item.payload.matchDate && (
                          <span className="text-xs text-muted-foreground">
                            {item.payload.matchDate}
                          </span>
                        )}
                      </div>
                    )}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="rating"
                stroke="hsl(var(--indigo))"
                strokeWidth={2}
                fill="url(#ratingGradient)"
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  if (payload.date === 'Start') return null;
                  const isPositive = payload.change >= 0;
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
                activeDot={{
                  r: 6,
                  stroke: 'hsl(var(--indigo))',
                  strokeWidth: 2,
                  fill: 'hsl(var(--background))',
                }}
              />
            </AreaChart>
          </ChartContainer>
        )}

        {history.length > 0 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50 text-sm text-muted-foreground font-mono">
            <span>Low: {stats.min}</span>
            <span>High: {stats.max}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

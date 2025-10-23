import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Play, Square, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

interface SimulationMetrics {
  gamesStarted: number;
  movesAttempted: number;
  movesSuccessful: number;
  movesFailed: number;
  duplicatesDetected: number;
  rateLimitHits: number;
  concurrencyConflicts: number;
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
}

export function MultiplayerSimulation() {
  const [isRunning, setIsRunning] = useState(false);
  const [metrics, setMetrics] = useState<SimulationMetrics>({
    gamesStarted: 0,
    movesAttempted: 0,
    movesSuccessful: 0,
    movesFailed: 0,
    duplicatesDetected: 0,
    rateLimitHits: 0,
    concurrencyConflicts: 0,
    avgLatency: 0,
    p95Latency: 0,
    p99Latency: 0,
  });

  const createTestMatch = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return null;

    const { data: match, error } = await supabase
      .from('matches')
      .insert({
        size: 7,
        pie_rule: false,
        status: 'active',
        turn: 1,
        owner: user.user.id,
      })
      .select()
      .single();

    if (error || !match) {
      console.error('Failed to create match:', error);
      return null;
    }

    // Add player
    await supabase.from('match_players').insert({
      match_id: match.id,
      profile_id: user.user.id,
      color: 1,
    });

    return match.id;
  };

  const simulateMove = async (
    matchId: string,
    cell: number,
    actionId?: string
  ): Promise<{
    success: boolean;
    latency: number;
    errorType?: 'rate_limit' | 'concurrency' | 'duplicate' | 'other';
  }> => {
    const start = performance.now();
    const moveActionId = actionId || crypto.randomUUID();

    try {
      const { data, error } = await supabase.functions.invoke('apply-move', {
        body: {
          matchId,
          cell,
          actionId: moveActionId,
        },
      });

      const latency = performance.now() - start;

      if (error || !data?.success) {
        const errorMsg = error?.message || data?.error || '';
        let errorType: 'rate_limit' | 'concurrency' | 'duplicate' | 'other' = 'other';

        if (errorMsg.includes('Rate limit')) {
          errorType = 'rate_limit';
        } else if (errorMsg.includes('Match state changed')) {
          errorType = 'concurrency';
        } else if (errorMsg.includes('Duplicate')) {
          errorType = 'duplicate';
        }

        return { success: false, latency, errorType };
      }

      return { success: true, latency };
    } catch (error) {
      const latency = performance.now() - start;
      return { success: false, latency, errorType: 'other' };
    }
  };

  const runSimulation = async () => {
    setIsRunning(true);
    const latencies: number[] = [];
    let newMetrics: SimulationMetrics = { ...metrics };

    try {
      toast.info('Starting multiplayer stress test...');

      // Create test matches
      const matchIds: string[] = [];
      for (let i = 0; i < 3; i++) {
        const matchId = await createTestMatch();
        if (matchId) {
          matchIds.push(matchId);
          newMetrics.gamesStarted++;
        }
      }

      if (matchIds.length === 0) {
        toast.error('Failed to create test matches');
        setIsRunning(false);
        return;
      }

      // Test 1: Idempotency - send same move twice
      toast.info('Test 1: Idempotency check');
      const actionId = crypto.randomUUID();
      const result1 = await simulateMove(matchIds[0], 0, actionId);
      const result2 = await simulateMove(matchIds[0], 0, actionId); // Same action_id

      newMetrics.movesAttempted += 2;
      latencies.push(result1.latency, result2.latency);

      if (result1.success && result2.success) {
        newMetrics.movesSuccessful += 2;
        newMetrics.duplicatesDetected += 1;
        toast.success('✓ Idempotency working');
      } else {
        newMetrics.movesFailed += 1;
      }

      // Test 2: Rapid fire moves (rate limiting)
      toast.info('Test 2: Rate limit test');
      const rapidMoves = [];
      for (let i = 0; i < 12; i++) {
        rapidMoves.push(simulateMove(matchIds[1], i, crypto.randomUUID()));
      }

      const rapidResults = await Promise.all(rapidMoves);
      newMetrics.movesAttempted += rapidResults.length;

      rapidResults.forEach((r) => {
        latencies.push(r.latency);
        if (r.success) {
          newMetrics.movesSuccessful++;
        } else {
          newMetrics.movesFailed++;
          if (r.errorType === 'rate_limit') {
            newMetrics.rateLimitHits++;
          }
        }
      });

      if (newMetrics.rateLimitHits > 0) {
        toast.success(`✓ Rate limiting working (${newMetrics.rateLimitHits} blocked)`);
      }

      // Test 3: Concurrent moves (version conflicts)
      toast.info('Test 3: Concurrency conflict test');
      const concurrentMoves = [
        simulateMove(matchIds[2], 0, crypto.randomUUID()),
        simulateMove(matchIds[2], 1, crypto.randomUUID()),
        simulateMove(matchIds[2], 2, crypto.randomUUID()),
      ];

      const concurrentResults = await Promise.all(concurrentMoves);
      newMetrics.movesAttempted += concurrentResults.length;

      concurrentResults.forEach((r) => {
        latencies.push(r.latency);
        if (r.success) {
          newMetrics.movesSuccessful++;
        } else {
          newMetrics.movesFailed++;
          if (r.errorType === 'concurrency') {
            newMetrics.concurrencyConflicts++;
          }
        }
      });

      // Calculate latency metrics
      latencies.sort((a, b) => a - b);
      const sum = latencies.reduce((a, b) => a + b, 0);
      newMetrics.avgLatency = Math.round(sum / latencies.length);
      newMetrics.p95Latency = Math.round(latencies[Math.floor(latencies.length * 0.95)] || 0);
      newMetrics.p99Latency = Math.round(latencies[Math.floor(latencies.length * 0.99)] || 0);

      setMetrics(newMetrics);

      // Final report
      const successRate = ((newMetrics.movesSuccessful / newMetrics.movesAttempted) * 100).toFixed(1);
      toast.success(`Simulation complete! Success rate: ${successRate}%`, {
        description: `Avg: ${newMetrics.avgLatency}ms, P95: ${newMetrics.p95Latency}ms`,
      });
    } catch (error) {
      console.error('Simulation error:', error);
      toast.error('Simulation failed');
    } finally {
      setIsRunning(false);
    }
  };

  const resetMetrics = () => {
    setMetrics({
      gamesStarted: 0,
      movesAttempted: 0,
      movesSuccessful: 0,
      movesFailed: 0,
      duplicatesDetected: 0,
      rateLimitHits: 0,
      concurrencyConflicts: 0,
      avgLatency: 0,
      p95Latency: 0,
      p99Latency: 0,
    });
  };

  const MetricCard = ({
    label,
    value,
    icon,
    status,
  }: {
    label: string;
    value: number | string;
    icon: React.ReactNode;
    status?: 'success' | 'error' | 'warning';
  }) => (
    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
      <div className={`${status === 'success' ? 'text-green-500' : status === 'error' ? 'text-red-500' : 'text-yellow-500'}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Multiplayer Stress Test</h3>
          <p className="text-sm text-muted-foreground">
            Test idempotency, rate limiting, and concurrency control
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={runSimulation} disabled={isRunning} size="sm">
            {isRunning ? (
              <>
                <Square className="w-4 h-4 mr-2" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start Test
              </>
            )}
          </Button>
          <Button onClick={resetMetrics} variant="outline" size="sm" disabled={isRunning}>
            Reset
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Games Created"
          value={metrics.gamesStarted}
          icon={<Play className="w-5 h-5" />}
        />
        <MetricCard
          label="Moves Attempted"
          value={metrics.movesAttempted}
          icon={<AlertCircle className="w-5 h-5" />}
        />
        <MetricCard
          label="Successful"
          value={metrics.movesSuccessful}
          icon={<CheckCircle2 className="w-5 h-5" />}
          status="success"
        />
        <MetricCard
          label="Failed"
          value={metrics.movesFailed}
          icon={<XCircle className="w-5 h-5" />}
          status="error"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-muted/30 rounded-lg">
          <div className="text-sm font-medium mb-2">Duplicates Caught</div>
          <Badge variant={metrics.duplicatesDetected > 0 ? 'default' : 'outline'}>
            {metrics.duplicatesDetected}
          </Badge>
        </div>
        <div className="p-4 bg-muted/30 rounded-lg">
          <div className="text-sm font-medium mb-2">Rate Limits Hit</div>
          <Badge variant={metrics.rateLimitHits > 0 ? 'destructive' : 'outline'}>
            {metrics.rateLimitHits}
          </Badge>
        </div>
        <div className="p-4 bg-muted/30 rounded-lg">
          <div className="text-sm font-medium mb-2">Concurrency Conflicts</div>
          <Badge variant={metrics.concurrencyConflicts > 0 ? 'destructive' : 'outline'}>
            {metrics.concurrencyConflicts}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-muted/30 rounded-lg">
          <div className="text-sm font-medium mb-1">Avg Latency</div>
          <div className="text-2xl font-bold">{metrics.avgLatency}ms</div>
        </div>
        <div className="p-4 bg-muted/30 rounded-lg">
          <div className="text-sm font-medium mb-1">P95 Latency</div>
          <div className="text-2xl font-bold">{metrics.p95Latency}ms</div>
        </div>
        <div className="p-4 bg-muted/30 rounded-lg">
          <div className="text-sm font-medium mb-1">P99 Latency</div>
          <div className="text-2xl font-bold">{metrics.p99Latency}ms</div>
        </div>
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <p>• Tests idempotency by sending duplicate action_ids</p>
        <p>• Tests rate limiting by rapid-fire moves</p>
        <p>• Tests concurrency with simultaneous move attempts</p>
      </div>
    </Card>
  );
}

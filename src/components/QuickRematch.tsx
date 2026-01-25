import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Loader2, Check, X, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface QuickRematchProps {
  matchId: string;
  opponentId: string | null;
  opponentName?: string;
  currentUserId: string;
  onRematchCreated: (lobbyId: string) => void;
  isAiMatch?: boolean;
  aiDifficulty?: 'easy' | 'medium' | 'hard' | 'expert';
}

export function QuickRematch({
  matchId,
  opponentId,
  opponentName = 'Opponent',
  currentUserId,
  onRematchCreated,
  isAiMatch = false,
  aiDifficulty,
}: QuickRematchProps) {
  const [status, setStatus] = useState<'idle' | 'requesting' | 'waiting' | 'accepted' | 'declined'>('idle');
  const [countdown, setCountdown] = useState(30);
  const [incomingRequest, setIncomingRequest] = useState<string | null>(null);

  // Listen for incoming rematch requests
  useEffect(() => {
    if (!opponentId || isAiMatch) return;

    const channel = supabase
      .channel(`rematch-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rematch_requests',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const request = payload.new as any;
          if (request.recipient_id === currentUserId && request.status === 'pending') {
            setIncomingRequest(request.id);
            toast.info(`${opponentName} wants a rematch!`);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rematch_requests',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const request = payload.new as any;
          if (request.requester_id === currentUserId) {
            if (request.status === 'accepted') {
              setStatus('accepted');
              if (request.lobby_id) {
                onRematchCreated(request.lobby_id);
              }
            } else if (request.status === 'declined') {
              setStatus('declined');
              toast.error('Rematch declined');
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, opponentId, currentUserId, opponentName, isAiMatch, onRematchCreated]);

  // Countdown timer when waiting
  useEffect(() => {
    if (status !== 'waiting') return;

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setStatus('idle');
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

  const handleRequestRematch = async () => {
    if (isAiMatch) {
      // For AI matches, directly create a new match
      setStatus('requesting');
      try {
        // Invoke rematch-lobby edge function for AI
        const { data, error } = await supabase.functions.invoke('rematch-lobby', {
          body: { matchId, isAi: true, aiDifficulty },
        });

        if (error) throw error;

        toast.success('Starting new AI match!');
        if (data?.matchId) {
          onRematchCreated(data.matchId);
        }
      } catch (error: any) {
        console.error('Rematch error:', error);
        toast.error('Failed to create rematch');
        setStatus('idle');
      }
      return;
    }

    if (!opponentId) return;

    setStatus('requesting');
    try {
      const { error } = await supabase
        .from('rematch_requests')
        .insert({
          match_id: matchId,
          requester_id: currentUserId,
          recipient_id: opponentId,
          status: 'pending',
        });

      if (error) throw error;

      setStatus('waiting');
      setCountdown(30);
      toast.success('Rematch request sent!');
    } catch (error: any) {
      console.error('Rematch request error:', error);
      toast.error('Failed to send rematch request');
      setStatus('idle');
    }
  };

  const handleAcceptRematch = async () => {
    if (!incomingRequest) return;

    try {
      // Invoke the rematch-lobby edge function
      const { data, error } = await supabase.functions.invoke('rematch-lobby', {
        body: { matchId },
      });

      if (error) throw error;

      // Update the request with the new lobby
      await supabase
        .from('rematch_requests')
        .update({ 
          status: 'accepted',
          lobby_id: data?.lobbyId,
        })
        .eq('id', incomingRequest);

      toast.success('Rematch accepted!');
      if (data?.lobbyId) {
        onRematchCreated(data.lobbyId);
      }
    } catch (error: any) {
      console.error('Accept rematch error:', error);
      toast.error('Failed to accept rematch');
    }
  };

  const handleDeclineRematch = async () => {
    if (!incomingRequest) return;

    try {
      await supabase
        .from('rematch_requests')
        .update({ status: 'declined' })
        .eq('id', incomingRequest);

      setIncomingRequest(null);
      toast.info('Rematch declined');
    } catch (error) {
      console.error('Decline error:', error);
    }
  };

  // Incoming request UI
  if (incomingRequest) {
    return (
      <Card className="p-4 bg-indigo/5 border-indigo/30 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-indigo/20 flex items-center justify-center animate-pulse">
              <RefreshCw className="h-5 w-5 text-indigo" />
            </div>
            <div>
              <p className="font-medium text-foreground">{opponentName} wants a rematch!</p>
              <p className="text-sm text-muted-foreground">Colors will be swapped</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleDeclineRematch}
              className="gap-1"
            >
              <X className="h-4 w-4" />
              Decline
            </Button>
            <Button
              size="sm"
              onClick={handleAcceptRematch}
              className="gap-1 bg-indigo hover:bg-indigo/90"
            >
              <Check className="h-4 w-4" />
              Accept
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Button
      onClick={handleRequestRematch}
      disabled={status === 'requesting' || status === 'waiting' || status === 'accepted'}
      className={cn(
        'gap-2 transition-all',
        status === 'waiting' && 'animate-pulse'
      )}
      variant={status === 'declined' ? 'outline' : 'default'}
    >
      {status === 'idle' && (
        <>
          <RefreshCw className="h-4 w-4" />
          Rematch
        </>
      )}
      {status === 'requesting' && (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Requesting...
        </>
      )}
      {status === 'waiting' && (
        <>
          <Clock className="h-4 w-4" />
          Waiting ({countdown}s)
        </>
      )}
      {status === 'accepted' && (
        <>
          <Check className="h-4 w-4" />
          Starting...
        </>
      )}
      {status === 'declined' && (
        <>
          <RefreshCw className="h-4 w-4" />
          Try Again
        </>
      )}
    </Button>
  );
}

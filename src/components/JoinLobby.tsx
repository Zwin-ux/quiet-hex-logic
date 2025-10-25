import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type JoinLobbyProps = {
  userId: string;
};

export function JoinLobby({ userId }: JoinLobbyProps) {
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const navigate = useNavigate();

  const joinLobby = async (retryCount = 0) => {
    if (!code || code.length < 4) {
      toast.error('Please enter a valid lobby code');
      return;
    }

    setJoining(true);
    try {
      const { data, error } = await supabase.functions.invoke('join-lobby', {
        body: { code: code.toUpperCase() }
      });

      if (error) throw error;
      if (data?.error) {
        // Provide specific error messages for common failures
        const errorMsg = data.error.toLowerCase();
        if (errorMsg.includes('not found') || errorMsg.includes('already started')) {
          throw new Error('Invalid code or lobby already started');
        } else if (errorMsg.includes('full')) {
          throw new Error('This lobby already has 2 players');
        } else {
          throw new Error(data.error);
        }
      }

      if (!data?.lobby?.id) {
        throw new Error('Invalid response from server');
      }

      toast.success('Joined lobby!');
      // Ensure navigation happens
      navigate(`/lobby/${data.lobby.id}`);
    } catch (err: any) {
      const errorMessage = err.message || 'Unknown error occurred';

      // Check if it's a network error and retry
      if (
        retryCount < 2 &&
        (errorMessage.includes('network') ||
          errorMessage.includes('fetch') ||
          errorMessage.includes('timeout'))
      ) {
        // Exponential backoff: 500ms, 1000ms
        const delay = 500 * Math.pow(2, retryCount);
        toast.info(`Connection issue, retrying in ${delay}ms...`);

        setTimeout(() => {
          joinLobby(retryCount + 1);
        }, delay);
        return;
      }

      // Show user-friendly error
      toast.error('Failed to join lobby', {
        description: errorMessage
      });
      setJoining(false);
    }
  };

  return (
    <Card className="p-6 shadow-soft border-2 border-border hover:border-ochre/30 transition-all duration-300">
      <div className="flex items-center gap-3 mb-3">
        <LogIn className="h-5 w-5 text-ochre" />
        <h2 className="font-body text-xl font-semibold text-foreground">
          Join Lobby
        </h2>
      </div>
      
      <p className="text-muted-foreground mb-4 font-body text-sm leading-relaxed">
        Enter a code to join your friend
      </p>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium mb-1.5 block text-muted-foreground">
            Lobby Code
          </label>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={6}
            className="font-mono text-base tracking-wider text-center uppercase h-9"
          />
        </div>

        <Button 
          onClick={() => joinLobby()} 
          disabled={joining || code.length < 4}
          className="w-full h-9 font-medium"
          variant="secondary"
        >
          {joining ? 'Joining...' : 'Join Lobby'}
        </Button>
      </div>
    </Card>
  );
}

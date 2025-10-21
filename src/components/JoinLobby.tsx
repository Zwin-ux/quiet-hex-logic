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

  const joinLobby = async () => {
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
      if (data.error) throw new Error(data.error);

      toast.success('Joined lobby!');
      navigate(`/lobby/${data.lobby.id}`);
    } catch (err: any) {
      toast.error('Failed to join lobby', {
        description: err.message
      });
    } finally {
      setJoining(false);
    }
  };

  return (
    <Card className="p-8 shadow-paper border-2 border-border">
      <div className="flex items-center gap-3 mb-4">
        <LogIn className="h-6 w-6 text-ochre" />
        <h2 className="font-body text-2xl font-semibold text-foreground">
          Join Lobby
        </h2>
      </div>
      
      <p className="text-muted-foreground mb-6 font-body leading-relaxed">
        Enter a lobby code to join your friend
      </p>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block text-muted-foreground">
            Lobby Code
          </label>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={6}
            className="font-mono text-lg tracking-wider text-center uppercase"
          />
        </div>

        <Button 
          onClick={joinLobby} 
          disabled={joining || code.length < 4}
          className="w-full"
        >
          {joining ? 'Joining...' : 'Join Lobby'}
        </Button>
      </div>
    </Card>
  );
}

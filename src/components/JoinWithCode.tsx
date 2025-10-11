import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Hash } from 'lucide-react';

export const JoinWithCode = ({ userId }: { userId: string }) => {
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const navigate = useNavigate();

  const joinWithCode = async () => {
    if (!code || code.length !== 6) {
      toast.error('Invalid code', { description: 'Code must be 6 characters' });
      return;
    }

    setJoining(true);
    try {
      // Find match by code
      const { data: matches, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('status', 'waiting')
        .limit(100);

      if (matchError) throw matchError;

      // Match codes by checking each match
      let match = null;
      for (const m of matches || []) {
        const { data: matchCode } = await supabase.rpc('generate_match_code', { match_uuid: m.id });
        if (matchCode === code.toUpperCase()) {
          match = m;
          break;
        }
      }

      if (!match) {
        toast.error('Match not found', { description: 'Invalid code or match no longer available' });
        return;
      }

      // Check for blocks
      const { data: blocked } = await supabase.rpc('is_blocked', {
        _blocker: match.owner,
        _blocked: userId
      });

      if (blocked) {
        toast.error('Cannot join', { description: 'You are blocked by this user' });
        return;
      }

      // Join match
      const { error: joinError } = await supabase
        .from('match_players')
        .insert({
          match_id: match.id,
          profile_id: userId,
          color: 2,
        });

      if (joinError) throw joinError;

      await supabase
        .from('matches')
        .update({ status: 'active' })
        .eq('id', match.id);

      toast.success('Joined match!');
      navigate(`/match/${match.id}`);
    } catch (error: any) {
      toast.error('Failed to join', { description: error.message });
    } finally {
      setJoining(false);
    }
  };

  return (
    <Card className="p-8 shadow-paper border-2 border-border">
      <div className="flex items-center gap-3 mb-4">
        <Hash className="h-6 w-6 text-graphite" />
        <h2 className="font-body text-2xl font-semibold text-foreground">
          Join with Code
        </h2>
      </div>
      <p className="text-muted-foreground mb-6 font-body leading-relaxed">
        Enter a 6-character match code to join a friend's game.
      </p>
      <div className="flex gap-3">
        <Input
          placeholder="ABC123"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={6}
          className="font-mono text-lg tracking-wider"
        />
        <Button
          onClick={joinWithCode}
          disabled={joining || code.length !== 6}
        >
          Join
        </Button>
      </div>
    </Card>
  );
};

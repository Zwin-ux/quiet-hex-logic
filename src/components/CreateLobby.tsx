import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Users, Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type CreateLobbyProps = {
  userId: string;
};

export function CreateLobby({ userId }: CreateLobbyProps) {
  const [boardSize, setBoardSize] = useState(11);
  const [pieRule, setPieRule] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const createLobby = async () => {
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-lobby', {
        body: {
          boardSize,
          pieRule,
          turnTimer: 45
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setCreatedCode(data.code);

      // Auto-copy code
      await navigator.clipboard.writeText(data.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      toast.success('Lobby created!', {
        description: `Code: ${data.code} - Navigating to lobby...`,
        duration: 4000
      });

      console.log(`[CreateLobby] Successfully created lobby ${data.lobby.id}, navigating...`);

      // Navigate to lobby view - keep loading state during navigation
      navigate(`/lobby/${data.lobby.id}`);

      // Don't set creating to false - let the navigation happen
      // This prevents UI flickering during page transition
    } catch (err: any) {
      console.error('[CreateLobby] Error creating lobby:', err);
      toast.error('Failed to create lobby', {
        description: err.message
      });
      setCreating(false);
    }
  };

  const copyCode = async () => {
    if (createdCode) {
      await navigator.clipboard.writeText(createdCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Code copied!');
    }
  };

  return (
    <Card className="p-4 sm:p-6 shadow-soft border-2 border-border hover:border-indigo/30 transition-all duration-300">
      <div className="flex items-center gap-3 mb-3">
        <Users className="h-5 w-5 text-indigo" />
        <h2 className="font-body text-lg sm:text-xl font-semibold text-foreground">
          Create Lobby
        </h2>
      </div>
      
      <p className="text-muted-foreground mb-4 font-body text-xs sm:text-sm leading-relaxed">
        Start a private match and share the code
      </p>

      <div className="space-y-3 mb-4">
        <div>
          <label className="text-xs font-medium mb-1.5 block text-muted-foreground">
            Board Size
          </label>
          <Select value={boardSize.toString()} onValueChange={(v) => setBoardSize(parseInt(v))}>
            <SelectTrigger className="h-10 sm:h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7×7 - Quick</SelectItem>
              <SelectItem value="9">9×9 - Standard</SelectItem>
              <SelectItem value="11">11×11 - Classic</SelectItem>
              <SelectItem value="13">13×13 - Epic</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between p-3 border rounded-lg bg-card/50">
          <div className="flex-1">
            <p className="text-sm font-medium">Pie Rule</p>
            <p className="text-xs text-muted-foreground">Player 2 can swap colors</p>
          </div>
          <Switch checked={pieRule} onCheckedChange={setPieRule} />
        </div>
      </div>

      {createdCode ? (
        <div className="space-y-2">
          <div className="p-3 bg-indigo/5 rounded-lg border-2 border-indigo/20 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Lobby Code</p>
            <p className="text-2xl font-mono font-bold tracking-wider text-indigo break-all">
              {createdCode}
            </p>
          </div>
          <Button onClick={copyCode} className="w-full gap-2 h-11 touch-manipulation">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Copy Code'}
          </Button>
        </div>
      ) : (
        <Button 
          onClick={createLobby} 
          disabled={creating}
          className="w-full h-11 font-medium touch-manipulation"
        >
          {creating ? 'Creating...' : 'Create & Share'}
        </Button>
      )}
    </Card>
  );
}

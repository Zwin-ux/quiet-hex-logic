import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
        description: `Code: ${data.code} - Copied to clipboard!`,
        duration: 6000
      });

      // Navigate to lobby view
      navigate(`/lobby/${data.lobby.id}`);
    } catch (err: any) {
      toast.error('Failed to create lobby', {
        description: err.message
      });
    } finally {
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
    <Card className="p-8 shadow-paper border-2 border-border">
      <div className="flex items-center gap-3 mb-4">
        <Users className="h-6 w-6 text-indigo" />
        <h2 className="font-body text-2xl font-semibold text-foreground">
          Create Lobby
        </h2>
      </div>
      
      <p className="text-muted-foreground mb-6 font-body leading-relaxed">
        Create a private lobby and share the code with your friend
      </p>

      <div className="space-y-4 mb-6">
        <div>
          <label className="text-sm font-medium mb-2 block text-muted-foreground">
            Board Size
          </label>
          <Select value={boardSize.toString()} onValueChange={(v) => setBoardSize(parseInt(v))}>
            <SelectTrigger>
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

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <p className="font-medium">Pie Rule</p>
            <p className="text-sm text-muted-foreground">Second player can swap colors</p>
          </div>
          <Button
            variant={pieRule ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPieRule(!pieRule)}
          >
            {pieRule ? 'Enabled' : 'Disabled'}
          </Button>
        </div>
      </div>

      {createdCode ? (
        <div className="space-y-3">
          <div className="p-4 bg-primary/5 rounded-lg border-2 border-primary/20 text-center">
            <p className="text-sm text-muted-foreground mb-1">Lobby Code</p>
            <p className="text-3xl font-mono font-bold tracking-wider text-primary">
              {createdCode}
            </p>
          </div>
          <Button onClick={copyCode} className="w-full gap-2">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Copy Code'}
          </Button>
        </div>
      ) : (
        <Button 
          onClick={createLobby} 
          disabled={creating}
          className="w-full"
        >
          {creating ? 'Creating...' : 'Create Lobby'}
        </Button>
      )}
    </Card>
  );
}

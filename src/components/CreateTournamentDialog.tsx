import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateTournamentDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateTournamentDialog({ open, onClose, onSuccess }: CreateTournamentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    format: 'single_elimination',
    maxPlayers: 8,
    minPlayers: 4,
    boardSize: 11,
    pieRule: true,
    turnTimerSeconds: 45
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-tournament', {
        body: formData
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success('Tournament created!', {
        description: 'Players can now join your tournament'
      });
      onSuccess();
    } catch (error: any) {
      console.error('Failed to create tournament:', error);
      toast.error('Failed to create tournament', {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-body text-2xl">Create Tournament</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Tournament Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Summer Championship 2024"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description for your tournament"
                rows={3}
              />
            </div>
          </div>

          {/* Format */}
          <div>
            <Label htmlFor="format">Format</Label>
            <Select
              value={formData.format}
              onValueChange={(value) => setFormData({ ...formData, format: value })}
            >
              <SelectTrigger id="format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single_elimination">Single Elimination</SelectItem>
                <SelectItem value="round_robin">Round Robin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Player Count */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="minPlayers">Minimum Players</Label>
              <Input
                id="minPlayers"
                type="number"
                min={2}
                value={formData.minPlayers}
                onChange={(e) => setFormData({ ...formData, minPlayers: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="maxPlayers">Maximum Players</Label>
              <Input
                id="maxPlayers"
                type="number"
                min={formData.minPlayers}
                value={formData.maxPlayers}
                onChange={(e) => setFormData({ ...formData, maxPlayers: parseInt(e.target.value) })}
              />
            </div>
          </div>

          {/* Game Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="boardSize">Board Size</Label>
              <Select
                value={formData.boardSize.toString()}
                onValueChange={(value) => setFormData({ ...formData, boardSize: parseInt(value) })}
              >
                <SelectTrigger id="boardSize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7×7 (Quick)</SelectItem>
                  <SelectItem value="9">9×9 (Fast)</SelectItem>
                  <SelectItem value="11">11×11 (Standard)</SelectItem>
                  <SelectItem value="13">13×13 (Long)</SelectItem>
                  <SelectItem value="15">15×15 (Epic)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="turnTimer">Turn Timer (seconds)</Label>
              <Input
                id="turnTimer"
                type="number"
                min={30}
                max={300}
                value={formData.turnTimerSeconds}
                onChange={(e) => setFormData({ ...formData, turnTimerSeconds: parseInt(e.target.value) })}
              />
            </div>
          </div>

          {/* Pie Rule */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor="pieRule" className="cursor-pointer">Pie Rule</Label>
              <p className="text-sm text-muted-foreground">
                Allow color swap after first move
              </p>
            </div>
            <Switch
              id="pieRule"
              checked={formData.pieRule}
              onCheckedChange={(checked) => setFormData({ ...formData, pieRule: checked })}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Tournament'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

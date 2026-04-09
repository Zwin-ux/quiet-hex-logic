import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MetricLine } from '@/components/board/MetricLine';
import { toast } from 'sonner';
import { createWorld, type WorldVisibility } from '@/lib/worlds';

type CreateWorldDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: (worldId: string) => void;
  userId: string;
};

export function CreateWorldDialog({
  open,
  onClose,
  onSuccess,
  userId,
}: CreateWorldDialogProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<WorldVisibility>('public');

  const reset = () => {
    setName('');
    setDescription('');
    setVisibility('public');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!name.trim()) {
      toast.error('World name is required');
      return;
    }

    setLoading(true);

    try {
      const world = await createWorld({
        userId,
        name,
        description,
        visibility,
      });

      toast.success('World created', {
        description: 'You can now stage rooms and events inside it.',
      });

      reset();
      onSuccess(world.id);
    } catch (error: any) {
      toast.error('Failed to create world', {
        description: error?.message ?? 'Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-2xl overflow-hidden border-black/10 bg-[#fbfaf6] p-0 shadow-[0_32px_100px_rgba(0,0,0,0.16)]">
        <DialogHeader className="border-b border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,244,238,0.92))] px-6 py-6">
          <p className="board-rail-label">World creation</p>
          <DialogTitle className="mt-3 text-3xl font-black tracking-[-0.08em] text-[#0a0a0a]">
            Create world
          </DialogTitle>
          <p className="mt-3 max-w-xl text-sm leading-7 text-[#5d5d5d]">
            A world is a recurring venue. It gives rooms, events, members, and
            host identity one durable place to live together.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-5 px-6 py-6">
            <div className="space-y-2">
              <Label htmlFor="world-name">Name</Label>
              <Input
                id="world-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Northside Chess Club"
                maxLength={80}
                className="h-12 border-black/10 bg-white"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="world-description">Description</Label>
              <Textarea
                id="world-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Weekly classical chess nights, junior training, and local open events."
                rows={5}
                maxLength={280}
                className="border-black/10 bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="world-visibility">Visibility</Label>
              <Select
                value={visibility}
                onValueChange={(value) => setVisibility(value as WorldVisibility)}
              >
                <SelectTrigger
                  id="world-visibility"
                  className="h-12 border-black/10 bg-white"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public world</SelectItem>
                  <SelectItem value="private">Private world</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t border-black/10 pt-5">
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    reset();
                    onClose();
                  }}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create world'}
                </Button>
              </div>
            </div>
          </div>

          <aside className="border-t border-black/10 bg-[#f3f1ea] px-6 py-6 lg:border-l lg:border-t-0">
            <p className="board-rail-label">World role</p>
            <div className="mt-4 space-y-1">
              <MetricLine label="Host identity" value="persistent" />
              <MetricLine label="Rooms" value="attached" />
              <MetricLine label="Events" value="recurring" />
              <MetricLine label="Moderation" value="local" />
            </div>
            <div className="mt-6 border-t border-black/10 pt-5 text-sm leading-7 text-[#5d5d5d]">
              Good first worlds are recurring clubs, creator leagues, school programs,
              and local opens that need one place to stage rooms and event history.
            </div>
          </aside>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useManageableWorlds } from "@/hooks/useManageableWorlds";

const STANDALONE_WORLD_VALUE = "__standalone__";

interface CreateTournamentDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  worldId?: string;
}

export function CreateTournamentDialog({
  open,
  onClose,
  onSuccess,
  worldId,
}: CreateTournamentDialogProps) {
  const { user } = useAuth();
  const { worlds: manageableWorlds } = useManageableWorlds(worldId ? undefined : user?.id);
  const [loading, setLoading] = useState(false);
  const [selectedWorldValue, setSelectedWorldValue] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    format: "single_elimination",
    competitiveMode: false,
    maxPlayers: 8,
    minPlayers: 4,
    boardSize: 11,
    pieRule: true,
    turnTimerSeconds: 45,
  });

  useEffect(() => {
    if (worldId) {
      setSelectedWorldValue(worldId);
      return;
    }

    if (!manageableWorlds.length) {
      setSelectedWorldValue(STANDALONE_WORLD_VALUE);
      return;
    }

    const stillValid =
      selectedWorldValue === STANDALONE_WORLD_VALUE ||
      manageableWorlds.some((world) => world.id === selectedWorldValue);

    if (!selectedWorldValue || !stillValid) {
      setSelectedWorldValue(manageableWorlds[0].id);
    }
  }, [worldId, manageableWorlds, selectedWorldValue]);

  const resolvedWorldId =
    worldId ||
    (selectedWorldValue === STANDALONE_WORLD_VALUE ? undefined : selectedWorldValue);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-tournament", {
        body: { ...formData, worldId: resolvedWorldId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("Event created", {
        description: "Players can now join this competition.",
      });
      onSuccess();
    } catch (error: any) {
      console.error("Failed to create tournament:", error);
      toast.error("Failed to create event", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-black/10 bg-[#fbfaf6] p-0">
        <DialogHeader className="border-b border-black/10 px-6 py-5">
          <DialogTitle className="text-2xl font-bold tracking-[-0.05em] text-foreground">
            {worldId ? "Create world event" : "Create an event"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
          {!worldId && manageableWorlds.length > 0 ? (
            <Field label="World">
              <Select value={selectedWorldValue} onValueChange={setSelectedWorldValue}>
                <SelectTrigger className="h-11 border-black/10 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {manageableWorlds.map((world) => (
                    <SelectItem key={world.id} value={world.id}>
                      {world.name}
                    </SelectItem>
                  ))}
                  <SelectItem value={STANDALONE_WORLD_VALUE}>Standalone event</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          ) : null}

          <div className="grid gap-5 md:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              <Field label="Event name">
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Northside spring open"
                  className="h-11 border-black/10 bg-white"
                  required
                />
              </Field>

              <Field label="Description">
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional context for the event"
                  rows={5}
                  className="border-black/10 bg-white"
                />
              </Field>

              <Field label="Format">
                <Select
                  value={formData.format}
                  onValueChange={(value) => setFormData({ ...formData, format: value })}
                >
                  <SelectTrigger className="h-11 border-black/10 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single_elimination">Single elimination</SelectItem>
                    <SelectItem value="round_robin">Round robin</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <div className="border border-black/10 bg-white px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Mode</p>
                    <p className="mt-1 text-xs leading-6 text-muted-foreground">
                      Competitive events require human verification to enter. Casual events do not.
                    </p>
                  </div>
                  <Switch
                    checked={formData.competitiveMode}
                    onCheckedChange={(checked) => setFormData({ ...formData, competitiveMode: checked })}
                  />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, competitiveMode: false })}
                    className={`border px-3 py-2 text-xs font-medium uppercase tracking-[0.16em] ${
                      !formData.competitiveMode ? "border-black bg-[#efebe3]" : "border-black/10 bg-[#fbfaf6]"
                    }`}
                  >
                    Casual
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, competitiveMode: true })}
                    className={`border px-3 py-2 text-xs font-medium uppercase tracking-[0.16em] ${
                      formData.competitiveMode ? "border-black bg-[#efebe3]" : "border-black/10 bg-[#fbfaf6]"
                    }`}
                  >
                    Competitive
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Min players">
                  <Input
                    type="number"
                    min={2}
                    value={formData.minPlayers}
                    onChange={(e) => setFormData({ ...formData, minPlayers: parseInt(e.target.value, 10) })}
                    className="h-11 border-black/10 bg-white"
                  />
                </Field>
                <Field label="Max players">
                  <Input
                    type="number"
                    min={formData.minPlayers}
                    value={formData.maxPlayers}
                    onChange={(e) => setFormData({ ...formData, maxPlayers: parseInt(e.target.value, 10) })}
                    className="h-11 border-black/10 bg-white"
                  />
                </Field>
              </div>

              <Field label="Board size">
                <Select
                  value={formData.boardSize.toString()}
                  onValueChange={(value) => setFormData({ ...formData, boardSize: parseInt(value, 10) })}
                >
                  <SelectTrigger className="h-11 border-black/10 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7x7 quick</SelectItem>
                    <SelectItem value="9">9x9 fast</SelectItem>
                    <SelectItem value="11">11x11 standard</SelectItem>
                    <SelectItem value="13">13x13 long</SelectItem>
                    <SelectItem value="15">15x15 epic</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Turn timer">
                <Input
                  type="number"
                  min={30}
                  max={300}
                  value={formData.turnTimerSeconds}
                  onChange={(e) => setFormData({ ...formData, turnTimerSeconds: parseInt(e.target.value, 10) })}
                  className="h-11 border-black/10 bg-white"
                />
              </Field>

              <div className="flex items-center justify-between border border-black/10 bg-white px-4 py-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Pie rule</p>
                  <p className="text-xs text-muted-foreground">Allow a color swap after the first move</p>
                </div>
                <Switch
                  checked={formData.pieRule}
                  onCheckedChange={(checked) => setFormData({ ...formData, pieRule: checked })}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-black/10 pt-5">
            <div className="mb-5 border border-black/10 bg-white px-4 py-4">
              <p className="board-rail-label">Event note</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Events are orchestration layers. Competitive mode is a trust contract, not just a badge.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create event"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="mb-2 block text-sm font-medium text-foreground">{label}</Label>
      {children}
    </div>
  );
}

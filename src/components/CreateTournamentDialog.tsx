import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import { useWorkshopMods } from "@/hooks/useWorkshopMods";
import { listGames } from "@/lib/engine/registry";
import { groupVariantsForGame, type AccessType } from "@/lib/variants";

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
  const games = useMemo(() => listGames().filter((game) => game.key !== "ttt"), []);
  const [loading, setLoading] = useState(false);
  const [selectedWorldValue, setSelectedWorldValue] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    gameKey: "hex",
    format: "single_elimination",
    competitiveMode: false,
    maxPlayers: 8,
    minPlayers: 4,
    boardSize: 11,
    pieRule: true,
    turnTimerSeconds: 45,
    registrationUrl: "",
    accessType: "public" as AccessType,
    accessCode: "",
    modVersionId: "__none__",
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

  const { mods } = useWorkshopMods({
    gameKey: formData.gameKey,
    worldId: resolvedWorldId,
    includeUnavailable: false,
  });
  const variantGroups = groupVariantsForGame(mods, formData.gameKey, resolvedWorldId);

  const selectedGame = games.find((game) => game.key === formData.gameKey) ?? games[0];

  useEffect(() => {
    setFormData((current) => ({
      ...current,
      boardSize: selectedGame?.configurableBoardSize
        ? current.boardSize
        : (selectedGame?.defaultBoardSize ?? current.boardSize),
      pieRule: selectedGame?.supportsPieRule ?? false,
      modVersionId: "__none__",
    }));
  }, [formData.gameKey, selectedGame?.configurableBoardSize, selectedGame?.defaultBoardSize, selectedGame?.supportsPieRule]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-tournament", {
        body: {
          ...formData,
          worldId: resolvedWorldId,
          registrationUrl: formData.registrationUrl || null,
          accessCode: formData.accessType === "access_code" ? formData.accessCode || null : null,
          modVersionId: formData.modVersionId === "__none__" ? null : formData.modVersionId,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("Event created", {
        description: "Bracket open.",
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
                  placeholder="Short context for the room map"
                  rows={5}
                  className="border-black/10 bg-white"
                />
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Game">
                  <Select
                    value={formData.gameKey}
                    onValueChange={(value) => setFormData({ ...formData, gameKey: value })}
                  >
                    <SelectTrigger className="h-11 border-black/10 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {games.map((game) => (
                        <SelectItem key={game.key} value={game.key}>
                          {game.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              </div>

              <Field label="Variant">
                <Select
                  value={formData.modVersionId}
                  onValueChange={(value) => setFormData({ ...formData, modVersionId: value })}
                >
                  <SelectTrigger className="h-11 border-black/10 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Standard</SelectItem>
                    {variantGroups.official.map((mod) => (
                      <SelectItem
                        key={mod.id}
                        value={mod.latest_version_id ?? `__missing__${mod.id}`}
                        disabled={!mod.latest_version_id}
                      >
                        {`Official / ${mod.name}`}
                      </SelectItem>
                    ))}
                    {variantGroups.club.map((mod) => (
                      <SelectItem
                        key={mod.id}
                        value={mod.latest_version_id ?? `__missing__${mod.id}`}
                        disabled={!mod.latest_version_id}
                      >
                        {`Club / ${mod.name}`}
                      </SelectItem>
                    ))}
                    {variantGroups.workshop.map((mod) => (
                      <SelectItem
                        key={mod.id}
                        value={mod.latest_version_id ?? `__missing__${mod.id}`}
                        disabled={!mod.latest_version_id}
                      >
                        {`Workshop / ${mod.name}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <div className="border border-black/10 bg-white px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Mode</p>
                    <p className="mt-1 text-xs leading-6 text-muted-foreground">
                      Competitive = World ID.
                    </p>
                  </div>
                  <Switch
                    checked={formData.competitiveMode}
                    onCheckedChange={(checked) => setFormData({ ...formData, competitiveMode: checked })}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Registration URL">
                  <Input
                    value={formData.registrationUrl}
                    onChange={(event) => setFormData({ ...formData, registrationUrl: event.target.value })}
                    placeholder="Optional external signup link"
                    className="h-11 border-black/10 bg-white"
                  />
                </Field>

                <Field label="Access">
                  <Select
                    value={formData.accessType}
                    onValueChange={(value: AccessType) => setFormData({ ...formData, accessType: value })}
                  >
                    <SelectTrigger className="h-11 border-black/10 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="world_members">World members</SelectItem>
                      <SelectItem value="access_code">Access code</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              {formData.accessType === "access_code" ? (
                <Field label="Access code">
                  <Input
                    value={formData.accessCode}
                    onChange={(event) => setFormData({ ...formData, accessCode: event.target.value })}
                    placeholder="Share this with paid or invited players"
                    className="h-11 border-black/10 bg-white"
                    required
                  />
                </Field>
              ) : null}
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

              {selectedGame?.configurableBoardSize ? (
                <Field label="Board size">
                  <Select
                    value={formData.boardSize.toString()}
                    onValueChange={(value) => setFormData({ ...formData, boardSize: parseInt(value, 10) })}
                  >
                    <SelectTrigger className="h-11 border-black/10 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(selectedGame.boardSizeOptions ?? []).map((option) => (
                        <SelectItem key={option.value} value={String(option.value)}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              ) : (
                <div className="border border-black/10 bg-white px-4 py-4">
                  <p className="text-sm font-medium text-foreground">Board size</p>
                  <p className="mt-1 text-xs leading-6 text-muted-foreground">
                    Fixed by the game or variant.
                  </p>
                </div>
              )}

              <Field label="Turn timer">
                <Input
                  type="number"
                  min={10}
                  max={600}
                  value={formData.turnTimerSeconds}
                  onChange={(e) => setFormData({ ...formData, turnTimerSeconds: parseInt(e.target.value, 10) })}
                  className="h-11 border-black/10 bg-white"
                />
              </Field>

              {selectedGame?.supportsPieRule ? (
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
              ) : null}
            </div>
          </div>

          <div className="border-t border-black/10 pt-5">
            <div className="mb-5 border border-black/10 bg-white px-4 py-4">
              <p className="board-rail-label">Event note</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Pick the board. Attach the rules. Open the bracket.
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
  children: ReactNode;
}) {
  return (
    <div>
      <Label className="mb-2 block text-sm font-medium text-foreground">{label}</Label>
      {children}
    </div>
  );
}

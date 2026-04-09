import { useState, useMemo, useEffect } from "react";
import { Check, Copy, RadioTower } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getGame, listGames } from "@/lib/engine/registry";
import { useManageableWorlds } from "@/hooks/useManageableWorlds";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const STANDALONE_WORLD_VALUE = "__standalone__";

type CreateLobbyProps = {
  userId: string;
  worldId?: string;
};

export function CreateLobby({ userId, worldId }: CreateLobbyProps) {
  const games = useMemo(() => listGames(), []);
  const { worlds: manageableWorlds } = useManageableWorlds(worldId ? undefined : userId);
  const [gameKey, setGameKey] = useState(games[0]?.key ?? "hex");
  const [boardSize, setBoardSize] = useState(games[0]?.defaultBoardSize ?? 7);
  const [pieRule, setPieRule] = useState(true);
  const [selectedWorldValue, setSelectedWorldValue] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const gameDef = useMemo(() => getGame(gameKey), [gameKey]);
  const resolvedWorldId =
    worldId ||
    (selectedWorldValue === STANDALONE_WORLD_VALUE ? undefined : selectedWorldValue);

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

  const handleGameChange = (key: string) => {
    setGameKey(key);
    const def = getGame(key);
    setBoardSize(def.defaultBoardSize);
    if (!def.supportsPieRule) setPieRule(false);
  };

  const createLobby = async () => {
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-lobby", {
        body: {
          gameKey,
          boardSize,
          worldId: resolvedWorldId,
          pieRule: gameDef.supportsPieRule ? pieRule : false,
          turnTimer: 45,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setCreatedCode(data.code);

      await navigator.clipboard.writeText(data.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      toast.success("Room created", {
        description: `Code: ${data.code}`,
        duration: 4000,
      });

      navigate(`/lobby/${data.lobby.id}`);
    } catch (err: any) {
      console.error("[CreateLobby] Error creating lobby:", err);
      toast.error("Failed to create room", { description: err.message });
      setCreating(false);
    }
  };

  const copyCode = async () => {
    if (!createdCode) return;
    await navigator.clipboard.writeText(createdCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Code copied");
  };

  const sizeOptions =
    gameDef.boardSizeOptions ?? [{ value: gameDef.defaultBoardSize, label: `${gameDef.defaultBoardSize}` }];
  const displayedSize = gameDef.configurableBoardSize ? boardSize : gameDef.defaultBoardSize;

  return (
    <section className="board-panel board-panel-cut rounded-[1.6rem] bg-white/92 p-5 md:p-6">
      <div className="flex items-center gap-3 border-b border-black/10 pb-4">
        <RadioTower className="h-4 w-4 text-foreground" />
        <div>
          <p className="board-rail-label text-[10px]">{worldId ? "World instance" : "Direct room"}</p>
          <h2 className="mt-1 text-2xl font-bold tracking-[-0.05em] text-foreground">
            {worldId ? "Stage a live room" : "Create a live room"}
          </h2>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        {!worldId && manageableWorlds.length > 0 ? (
          <Field label="World">
            <Select value={selectedWorldValue} onValueChange={setSelectedWorldValue}>
              <SelectTrigger className="h-11 border-black/10 bg-[#faf9f4]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {manageableWorlds.map((world) => (
                  <SelectItem key={world.id} value={world.id}>
                    {world.name}
                  </SelectItem>
                ))}
                <SelectItem value={STANDALONE_WORLD_VALUE}>Standalone room</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        ) : null}

        <Field label="Game">
          <Select value={gameKey} onValueChange={handleGameChange}>
            <SelectTrigger className="h-11 border-black/10 bg-[#faf9f4]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {games.map((g) => (
                <SelectItem key={g.key} value={g.key}>
                  {g.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <Field label="Board size">
            <Select
              value={displayedSize.toString()}
              onValueChange={(v) => setBoardSize(parseInt(v, 10))}
              disabled={!gameDef.configurableBoardSize}
            >
              <SelectTrigger className="h-11 border-black/10 bg-[#faf9f4]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sizeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value.toString()}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="flex items-end justify-between gap-4 border border-black/10 bg-[#faf9f4] px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Pie rule</p>
              <p className="text-xs text-muted-foreground">Allow color swap</p>
            </div>
            <Switch
              checked={gameDef.supportsPieRule ? pieRule : false}
              onCheckedChange={setPieRule}
              disabled={!gameDef.supportsPieRule}
            />
          </div>
        </div>

        {createdCode ? (
          <div className="border-t border-black/10 pt-5">
            <p className="board-rail-label">Room code</p>
            <div className="mt-3 flex items-center justify-between border border-black bg-black px-4 py-4 text-white">
              <span className="font-mono text-2xl tracking-[0.28em]">{createdCode}</span>
              <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/15" onClick={copyCode}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={createLobby} disabled={creating} className="clip-stage h-12 w-full">
            {creating ? "Creating..." : "Create room"}
          </Button>
        )}
      </div>
    </section>
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
      <p className="mb-2 text-sm font-medium text-foreground">{label}</p>
      {children}
    </div>
  );
}

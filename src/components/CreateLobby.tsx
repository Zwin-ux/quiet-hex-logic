import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Check, Copy, RadioTower } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { UtilityPill, UtilityStrip } from "@/components/board/SystemSurface";
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
    worldId || (selectedWorldValue === STANDALONE_WORLD_VALUE ? undefined : selectedWorldValue);

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
  }, [manageableWorlds, selectedWorldValue, worldId]);

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
  const headerState = worldId ? "world-hosted" : resolvedWorldId ? "world-linked" : "standalone";

  return (
    <section className="system-section">
      <div className="system-section__head">
        <div className="system-section__copy">
          <p className="system-section__label">{worldId ? "World instance" : "Command window"}</p>
          <h2 className="system-section__title">{worldId ? "Stage live room" : "Create live room"}</h2>
        </div>
        <div className="system-section__actions">
          <UtilityPill strong>{headerState}</UtilityPill>
        </div>
      </div>

      <div>
        <UtilityStrip className="mb-4">
          <UtilityPill>{gameDef.displayName}</UtilityPill>
          <UtilityPill>{displayedSize} desk</UtilityPill>
          <UtilityPill strong={gameDef.supportsPieRule && pieRule}>
            {gameDef.supportsPieRule && pieRule ? "swap on" : "swap off"}
          </UtilityPill>
        </UtilityStrip>

        <div className="grid gap-4">
          {!worldId && manageableWorlds.length > 0 ? (
            <Field label="Venue target">
              <Select value={selectedWorldValue} onValueChange={setSelectedWorldValue}>
                <SelectTrigger className="h-11 bg-white">
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

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Field label="Game">
              <Select value={gameKey} onValueChange={handleGameChange}>
                <SelectTrigger className="h-11 bg-white">
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

            <Field label="Board size">
              <Select
                value={displayedSize.toString()}
                onValueChange={(value) => setBoardSize(parseInt(value, 10))}
                disabled={!gameDef.configurableBoardSize}
              >
                <SelectTrigger className="h-11 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sizeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-[1.2rem] bg-[#f3efe6] px-4 py-4">
            <div className="flex items-center gap-2">
              <RadioTower className="h-4 w-4" />
              <span className="text-sm font-medium text-foreground">Swap rule</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-[0.14em] text-black/58">
                {gameDef.supportsPieRule ? "allow color swap" : "not used here"}
              </span>
              <Switch
                checked={gameDef.supportsPieRule ? pieRule : false}
                onCheckedChange={setPieRule}
                disabled={!gameDef.supportsPieRule}
              />
            </div>
          </div>

          {createdCode ? (
            <div className="flex items-center justify-between gap-4 rounded-[1.2rem] bg-[#090909] px-4 py-3 text-[#f6f4f0]">
              <span className="font-mono text-base tracking-[0.24em]">{createdCode}</span>
              <Button
                variant="outline"
                onClick={copyCode}
                className="border-white/20 bg-transparent text-[#f6f4f0] hover:bg-white/10"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          ) : (
            <Button onClick={createLobby} disabled={creating} variant="hero" className="h-12 w-full">
              {creating ? "Creating..." : "Create room"}
            </Button>
          )}
        </div>
      </div>
    </section>
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
      <p className="mb-2 board-rail-label">{label}</p>
      {children}
    </div>
  );
}

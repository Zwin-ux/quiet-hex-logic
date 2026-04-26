import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CopyPlus, Loader2, PackageOpen, Wrench } from "lucide-react";
import { importModFromFile } from "@/lib/mods/import";
import { SiteFrame } from "@/components/board/SiteFrame";
import { StateTag } from "@/components/board/StateTag";
import { VenuePanel } from "@/components/board/VenuePanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useWorkshopMods } from "@/hooks/useWorkshopMods";
import { supabase } from "@/integrations/supabase/client";
import { canManageWorld, loadWorldOverview, type WorldOverview } from "@/lib/worlds";
import {
  OFFICIAL_VARIANT_SEEDS,
  buildSimpleEditorManifest,
  gameDisplayName,
  groupVariantsForGame,
  type VariantScope,
} from "@/lib/variants";
import { toast } from "sonner";

type EditorState = {
  gameKey: string;
  name: string;
  description: string;
  boardSize: number;
  pieRule: boolean;
  turnTimerSeconds: number;
  startFen: string;
  mandatoryCapture: boolean;
  drawWindow: number;
  connectLength: number;
};

const INITIAL_EDITOR_STATE: EditorState = {
  gameKey: "hex",
  name: "",
  description: "",
  boardSize: 11,
  pieRule: true,
  turnTimerSeconds: 45,
  startFen: "",
  mandatoryCapture: true,
  drawWindow: 40,
  connectLength: 4,
};

export default function WorldVariants() {
  useDocumentTitle("World Variants");

  const { worldId } = useParams<{ worldId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [overview, setOverview] = useState<WorldOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [packageScope, setPackageScope] = useState<VariantScope>("world_private");
  const [refreshToken, setRefreshToken] = useState(0);
  const [editor, setEditor] = useState<EditorState>(INITIAL_EDITOR_STATE);
  const { mods, loading: modsLoading } = useWorkshopMods({
    worldId,
    includeUnavailable: true,
    refreshToken,
  });

  const load = useCallback(async () => {
    if (!worldId) return;

    setLoading(true);

    try {
      const nextOverview = await loadWorldOverview(worldId, user?.id);
      if (!canManageWorld(nextOverview.world)) {
        toast.error("Only hosts can edit variants");
        navigate(`/worlds/${worldId}`);
        return;
      }

      setOverview(nextOverview);
    } catch (error: any) {
      toast.error("Failed to load world variants", {
        description: error?.message ?? "Please try again.",
      });
      navigate("/worlds");
    } finally {
      setLoading(false);
    }
  }, [navigate, user?.id, worldId]);

  useEffect(() => {
    void load();
  }, [load]);

  const currentGroups = useMemo(() => {
    return {
      hex: groupVariantsForGame(mods, "hex", worldId),
      chess: groupVariantsForGame(mods, "chess", worldId),
      checkers: groupVariantsForGame(mods, "checkers", worldId),
      connect4: groupVariantsForGame(mods, "connect4", worldId),
    };
  }, [mods, worldId]);

  const publishManifest = async (args: {
    manifest: Record<string, unknown>;
    gameKey: string;
    scope: VariantScope;
    sourceKind: "official_seed" | "simple_editor" | "package_upload";
  }) => {
    if (!worldId) return;

    const { data, error } = await supabase.functions.invoke("workshop-publish-mod", {
      body: {
        manifest: args.manifest,
        gameKey: args.gameKey,
        worldId,
        scope: args.scope,
        sourceKind: args.sourceKind,
      },
    });

    if (error) throw error;
    if ((data as any)?.error) throw new Error((data as any).error);
  };

  const handleCloneOfficial = async (manifestId: string) => {
    if (!worldId) return;

    const seed = OFFICIAL_VARIANT_SEEDS.find((item) => item.manifestId === manifestId);
    if (!seed) return;
    if (!seed.hostedEnabled) {
      toast.error("This preset is still behind an engine gate");
      return;
    }

    setPublishing(true);

    try {
      await publishManifest({
        manifest: {
          id: `world-${worldId}-${seed.manifestId}`,
          name: seed.name,
          version: seed.version,
          description: seed.description,
          author: "BOARD",
          games: {
            [seed.gameKey]: {
              rules: seed.rules,
            },
          },
        },
        gameKey: seed.gameKey,
        scope: "world_private",
        sourceKind: "official_seed",
      });

      toast.success("Official preset added", {
        description: `${seed.name} is now in this world's private variant set.`,
      });
      setRefreshToken((current) => current + 1);
    } catch (error: any) {
      toast.error("Failed to add preset", {
        description: error?.message ?? "Please try again.",
      });
    } finally {
      setPublishing(false);
    }
  };

  const handleSaveEditor = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!worldId) return;

    const rules =
      editor.gameKey === "hex"
        ? {
            boardSize: editor.boardSize,
            pieRule: editor.pieRule,
            turnTimerSeconds: editor.turnTimerSeconds,
          }
        : editor.gameKey === "chess"
          ? {
              startFen: editor.startFen.trim() || undefined,
              turnTimerSeconds: editor.turnTimerSeconds,
            }
          : editor.gameKey === "checkers"
            ? {
                mandatoryCapture: editor.mandatoryCapture,
                draw: { noCaptureHalfMoves: editor.drawWindow },
                turnTimerSeconds: editor.turnTimerSeconds,
              }
            : {
                connect: editor.connectLength,
                turnTimerSeconds: editor.turnTimerSeconds,
              };

    setPublishing(true);

    try {
      const manifest = buildSimpleEditorManifest({
        worldId,
        gameKey: editor.gameKey,
        name: editor.name,
        description: editor.description,
        rules,
      });

      await publishManifest({
        manifest,
        gameKey: editor.gameKey,
        scope: "world_private",
        sourceKind: "simple_editor",
      });

      toast.success("Variant saved", {
        description: "World-private rules preset published.",
      });
      setRefreshToken((current) => current + 1);

      setEditor((current) => ({
        ...current,
        name: "",
        description: "",
        startFen: "",
      }));
    } catch (error: any) {
      toast.error("Failed to save variant", {
        description: error?.message ?? "Please try again.",
      });
    } finally {
      setPublishing(false);
    }
  };

  const handlePackageUpload = async (file: File | null) => {
    if (!file) return;

    setPublishing(true);

    try {
      const manifest = await importModFromFile(file);
      const gameKeys = Object.keys(manifest.games ?? {});
      const primaryGameKey = gameKeys[0];

      if (!primaryGameKey) {
        throw new Error("Package has no rules payload");
      }

      await publishManifest({
        manifest: {
          ...manifest,
          id: `${packageScope === "public_registry" ? "public" : `world-${worldId}`}-${manifest.id}`,
        },
        gameKey: primaryGameKey,
        scope: packageScope,
        sourceKind: "package_upload",
      });

      toast.success("Package published", {
        description:
          packageScope === "public_registry"
            ? "Variant is now in the public workshop."
            : "Variant is now private to this world.",
      });
      setRefreshToken((current) => current + 1);
    } catch (error: any) {
      toast.error("Failed to publish package", {
        description: error?.message ?? "Please try again.",
      });
    } finally {
      setPublishing(false);
    }
  };

  if (loading || !overview) {
    return (
      <SiteFrame>
        <div className="flex min-h-[420px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </SiteFrame>
    );
  }

  return (
    <SiteFrame>
      <div className="board-page-width mx-auto space-y-6">
        <Button variant="outline" size="sm" onClick={() => navigate(`/worlds/${overview.world.id}`)}>
          <ArrowLeft className="h-4 w-4" />
          Back to world
        </Button>

        <section className="border border-[#0e0e0f] bg-[#090909] px-6 py-6 text-[#f3efe6] md:px-8 md:py-8">
          <div className="flex flex-wrap gap-2">
            <StateTag>World variants</StateTag>
            <StateTag tone="success">surface edit</StateTag>
            <StateTag>package publish</StateTag>
          </div>

          <h1 className="mt-8 max-w-[720px] text-[clamp(3rem,5vw,4.8rem)] font-black leading-[0.9] tracking-[-0.07em]">
            Shape the rules on web. Run the matches everywhere.
          </h1>
          <p className="mt-5 max-w-[38rem] text-[17px] leading-8 text-white/72">
            Use the browser for safe rule edits and package versions. Mobile and Discord only operate the finished rooms.
          </p>
        </section>

        <Tabs defaultValue="official" className="space-y-6">
          <TabsList className="grid h-auto grid-cols-3 border border-black/12 bg-[#fbfaf8] p-1">
            <TabsTrigger value="official">Official pack</TabsTrigger>
            <TabsTrigger value="surface">Surface editor</TabsTrigger>
            <TabsTrigger value="packages">Package flow</TabsTrigger>
          </TabsList>

          <TabsContent value="official" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_318px]">
              <VenuePanel
                eyebrow="Curated pack"
                title="Featured variants for the big four"
                description="Keep the hosted network curated. Clone an official preset into this world, then attach it to lobbies or events."
              >
                <div className="grid gap-3">
                  {OFFICIAL_VARIANT_SEEDS.map((seed) => (
                    <div key={seed.manifestId} className="border border-black/12 bg-white px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <StateTag>{gameDisplayName(seed.gameKey)}</StateTag>
                        <StateTag tone={seed.hostedEnabled ? "success" : "warning"}>
                          {seed.hostedEnabled ? "hosted" : "engine gate"}
                        </StateTag>
                      </div>
                      <h3 className="mt-3 text-xl font-black tracking-[-0.04em] text-foreground">
                        {seed.name}
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">{seed.description}</p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Button
                          variant="outline"
                          onClick={() => handleCloneOfficial(seed.manifestId)}
                          disabled={publishing || !seed.hostedEnabled}
                        >
                          <CopyPlus className="h-4 w-4" />
                          Add to world
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </VenuePanel>

              <VenuePanel
                eyebrow="World library"
                title="Current private variants"
                description={modsLoading ? "Loading current variants." : "Everything here can be attached to a lobby or event."}
              >
                <div className="space-y-4 text-sm leading-7 text-muted-foreground">
                  {(["hex", "chess", "checkers", "connect4"] as const).map((gameKey) => {
                    const group = currentGroups[gameKey];
                    return (
                      <div key={gameKey}>
                        <p className="board-rail-label text-black/55">{gameDisplayName(gameKey)}</p>
                        <p className="mt-2">
                          {group.club.length > 0
                            ? group.club.map((item) => item.name).join(", ")
                            : "No private variants yet."}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </VenuePanel>
            </div>
          </TabsContent>

          <TabsContent value="surface" className="space-y-6">
            <VenuePanel
              eyebrow="Safe editing"
              title="Surface editor"
              description="Forms write structured rules JSON. No code editor. No browser engine patching."
              titleBarEnd={<Wrench className="h-4 w-4 text-foreground" />}
            >
              <form onSubmit={handleSaveEditor} className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Game">
                    <Select
                      value={editor.gameKey}
                      onValueChange={(value) => setEditor((current) => ({ ...current, gameKey: value }))}
                    >
                      <SelectTrigger className="h-11 border-black/10 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hex">Hex</SelectItem>
                        <SelectItem value="chess">Chess</SelectItem>
                        <SelectItem value="checkers">Checkers</SelectItem>
                        <SelectItem value="connect4">Connect 4</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Variant name">
                    <Input
                      value={editor.name}
                      onChange={(event) => setEditor((current) => ({ ...current, name: event.target.value }))}
                      className="h-11 border-black/10 bg-white"
                      placeholder="Friday finals rules"
                      required
                    />
                  </Field>
                </div>

                <Field label="Description">
                  <Textarea
                    value={editor.description}
                    onChange={(event) => setEditor((current) => ({ ...current, description: event.target.value }))}
                    className="border-black/10 bg-white"
                    rows={3}
                  />
                </Field>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {editor.gameKey === "hex" ? (
                    <>
                      <Field label="Board size">
                        <Select
                          value={String(editor.boardSize)}
                          onValueChange={(value) =>
                            setEditor((current) => ({ ...current, boardSize: parseInt(value, 10) }))
                          }
                        >
                          <SelectTrigger className="h-11 border-black/10 bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="9">9x9</SelectItem>
                            <SelectItem value="11">11x11</SelectItem>
                            <SelectItem value="13">13x13</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Pie rule">
                        <Select
                          value={editor.pieRule ? "on" : "off"}
                          onValueChange={(value) =>
                            setEditor((current) => ({ ...current, pieRule: value === "on" }))
                          }
                        >
                          <SelectTrigger className="h-11 border-black/10 bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="on">On</SelectItem>
                            <SelectItem value="off">Off</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                    </>
                  ) : null}

                  {editor.gameKey === "chess" ? (
                    <Field label="Start FEN">
                      <Input
                        value={editor.startFen}
                        onChange={(event) => setEditor((current) => ({ ...current, startFen: event.target.value }))}
                        className="h-11 border-black/10 bg-white"
                        placeholder="Optional opening layout"
                      />
                    </Field>
                  ) : null}

                  {editor.gameKey === "checkers" ? (
                    <>
                      <Field label="Mandatory capture">
                        <Select
                          value={editor.mandatoryCapture ? "on" : "off"}
                          onValueChange={(value) =>
                            setEditor((current) => ({ ...current, mandatoryCapture: value === "on" }))
                          }
                        >
                          <SelectTrigger className="h-11 border-black/10 bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="on">On</SelectItem>
                            <SelectItem value="off">Off</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Draw window">
                        <Input
                          type="number"
                          min={10}
                          max={200}
                          value={editor.drawWindow}
                          onChange={(event) =>
                            setEditor((current) => ({
                              ...current,
                              drawWindow: parseInt(event.target.value, 10) || 40,
                            }))
                          }
                          className="h-11 border-black/10 bg-white"
                        />
                      </Field>
                    </>
                  ) : null}

                  {editor.gameKey === "connect4" ? (
                    <Field label="Connect length">
                      <Select
                        value={String(editor.connectLength)}
                        onValueChange={(value) =>
                          setEditor((current) => ({ ...current, connectLength: parseInt(value, 10) }))
                        }
                      >
                        <SelectTrigger className="h-11 border-black/10 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="4">4</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  ) : null}

                  <Field label="Turn timer">
                    <Input
                      type="number"
                      min={10}
                      max={600}
                      value={editor.turnTimerSeconds}
                      onChange={(event) =>
                        setEditor((current) => ({
                          ...current,
                          turnTimerSeconds: parseInt(event.target.value, 10) || 45,
                        }))
                      }
                      className="h-11 border-black/10 bg-white"
                    />
                  </Field>
                </div>

                {editor.gameKey === "chess" ? (
                  <div className="border border-black/12 bg-white px-4 py-4 text-sm leading-7 text-muted-foreground">
                    Freestyle Chess stays behind an engine gate for now. The hosted editor only exposes timer and start FEN until castling support is verified end to end.
                  </div>
                ) : null}

                <Button type="submit" disabled={publishing}>
                  {publishing ? "Publishing..." : "Save private variant"}
                </Button>
              </form>
            </VenuePanel>
          </TabsContent>

          <TabsContent value="packages" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_318px]">
              <VenuePanel
                eyebrow="Package flow"
                title="Upload an .openboardmod"
                description="Deeper mod packages are managed on web. The browser validates the manifest, then the hosted registry stores the version."
                titleBarEnd={<PackageOpen className="h-4 w-4 text-foreground" />}
              >
                <div className="space-y-5">
                  <Field label="Publish scope">
                    <Select
                      value={packageScope}
                      onValueChange={(value: VariantScope) => setPackageScope(value)}
                    >
                      <SelectTrigger className="h-11 border-black/10 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="world_private">World private</SelectItem>
                        <SelectItem value="public_registry">Public workshop</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  <div className="border border-black/12 bg-white px-4 py-4">
                    <input
                      type="file"
                      accept=".zip,.openboardmod,.json"
                      disabled={publishing}
                      onChange={(event) => handlePackageUpload(event.target.files?.[0] ?? null)}
                    />
                  </div>
                </div>
              </VenuePanel>

              <VenuePanel
                eyebrow="Current registry"
                title="Attachable now"
                description={modsLoading ? "Loading variants." : "These are already available to lobbies and events."}
              >
                <div className="space-y-4 text-sm leading-7 text-muted-foreground">
                  {mods
                    .filter((mod) => mod.latest_version_id)
                    .slice(0, 8)
                    .map((mod) => (
                      <div key={mod.id}>
                        <p className="font-semibold text-foreground">{mod.name}</p>
                        <p>{mod.scope ?? "public_registry"} / {gameDisplayName(mod.game_key)}</p>
                      </div>
                    ))}
                </div>
              </VenuePanel>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </SiteFrame>
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
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      {children}
    </div>
  );
}

import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Bot, Cpu, Library, Wrench } from "lucide-react";
import { SiteFrame } from "@/components/board/SiteFrame";
import { SectionRail } from "@/components/board/SectionRail";
import { VenuePanel } from "@/components/board/VenuePanel";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function Docs() {
  useDocumentTitle("Builder Manual");

  const navigate = useNavigate();

  return (
    <SiteFrame>
      <div className="space-y-8">
        <SectionRail
          eyebrow="Builder manual"
          title="The contract between BOARD, bots, and new rulesets."
          description={
            <>
              BOARD is not just a place to play. It is the engine surface behind
              worlds, live instances, bot runners, and new game logic.
            </>
          }
          meta={
            <>
              <span className="board-meta-chip">Audience / builders</span>
              <span className="board-meta-chip">Focus / runners, rulesets, protocol</span>
              <span className="board-meta-chip">Status / active reference docs</span>
            </>
          }
          actions={
            <>
              <Button variant="outline" onClick={() => navigate("/workbench")}>
                Open runner lab
              </Button>
              <Button onClick={() => navigate("/arena")}>
                Bot arena
              </Button>
            </>
          }
        />

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <VenuePanel
            eyebrow="Bot flow"
            title="Create a bot, run it locally, then let it take seats in the arena."
          >
            <div className="board-ledger">
              <div className="board-ledger-row md:grid-cols-[56px_minmax(0,1fr)_160px]">
                <div className="board-rail-label pt-1 text-[10px] text-black/45">01</div>
                <div className="min-w-0">
                  <h3 className="text-xl font-bold tracking-[-0.05em] text-foreground">Create a bot</h3>
                  <p className="board-copy mt-3">
                    Start in the arena. BOARD issues a token once, then treats your
                    runner as an external participant in the match loop.
                  </p>
                </div>
                <div className="flex justify-start md:justify-end">
                  <Button variant="outline" size="sm" onClick={() => navigate("/arena")}>
                    Arena
                  </Button>
                </div>
              </div>

              <div className="board-ledger-row md:grid-cols-[56px_minmax(0,1fr)_160px]">
                <div className="board-rail-label pt-1 text-[10px] text-black/45">02</div>
                <div className="min-w-0">
                  <h3 className="text-xl font-bold tracking-[-0.05em] text-foreground">Run the reference worker</h3>
                  <p className="board-copy mt-3">
                    Use the runner lab to boot the reference worker, then replace the
                    move-picker with your own engine or model.
                  </p>
                </div>
                <div className="flex justify-start md:justify-end">
                  <Button variant="outline" size="sm" onClick={() => navigate("/workbench")}>
                    Runner lab
                  </Button>
                </div>
              </div>

              <div className="board-ledger-row md:grid-cols-[56px_minmax(0,1fr)_160px]">
                <div className="board-rail-label pt-1 text-[10px] text-black/45">03</div>
                <div className="min-w-0">
                  <h3 className="text-xl font-bold tracking-[-0.05em] text-foreground">Review matches and ladder movement</h3>
                  <p className="board-copy mt-3">
                    Arena matches are public-spectate. Ladder rating stays bot-only so
                    human rooms and competitive worlds keep their own identity.
                  </p>
                </div>
                <div className="flex justify-start md:justify-end">
                  <Button variant="outline" size="sm" onClick={() => navigate("/events")}>
                    Event directory
                  </Button>
                </div>
              </div>
            </div>
          </VenuePanel>

          <div className="grid gap-6">
            <VenuePanel eyebrow="Protocol" title="Reference runner contract">
              <div className="space-y-4 text-sm leading-7 text-muted-foreground">
                <p>
                  The runner polls <span className="font-mono text-foreground">bot-poll</span> with
                  <span className="font-mono text-foreground"> Authorization: Bot &lt;token&gt;</span>.
                </p>
                <p>
                  When BOARD returns a request, the runner selects one legal move and
                  submits it to <span className="font-mono text-foreground">bot-submit-move</span>.
                </p>
                <p>
                  The payload shape is game-aware, but the loop stays consistent so new
                  rulesets do not force a new runner architecture.
                </p>
              </div>
            </VenuePanel>

            <VenuePanel eyebrow="Scaffold" title="Add a new game without hand-wiring the whole stack.">
              <div className="space-y-4">
                <pre className="overflow-auto border border-black/10 bg-[#faf9f4] p-4 text-xs leading-6 text-foreground"><code>npm run scaffold:game -- --key centerwin --name "Center Win"</code></pre>
                <p className="text-sm leading-7 text-muted-foreground">
                  The scaffold generates engine, adapter, board UI, and server validation,
                  then patches the registries so the new ruleset can enter the same BOARD loop.
                </p>
              </div>
            </VenuePanel>
          </div>
        </div>

        <VenuePanel eyebrow="Builder surfaces" title="Where to go next">
          <div className="grid gap-4 md:grid-cols-3">
            <BuilderLink
              icon={Wrench}
              title="Runner lab"
              description="Reference worker, env contract, and local launch path."
              onClick={() => navigate("/workbench")}
            />
            <BuilderLink
              icon={Bot}
              title="Bot arena"
              description="Create bots, rotate tokens, and start bot-vs-bot matches."
              onClick={() => navigate("/arena")}
            />
            <BuilderLink
              icon={Library}
              title="Game registry"
              description="See how BOARD extends beyond a single game without fragmenting the engine."
              onClick={() => navigate("/play")}
            />
          </div>
        </VenuePanel>
      </div>
    </SiteFrame>
  );
}

function BuilderLink({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: typeof Bot;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="board-ledger-row w-full text-left transition-colors hover:bg-black/[0.025] md:grid-cols-[40px_minmax(0,1fr)_32px]"
    >
      <div className="flex h-10 w-10 items-center justify-center border border-black/10 bg-[#faf9f4] text-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <h3 className="text-lg font-bold tracking-[-0.04em] text-foreground">{title}</h3>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-start justify-end pt-1 text-foreground">
        <ArrowUpRight className="h-4 w-4" />
      </div>
    </button>
  );
}

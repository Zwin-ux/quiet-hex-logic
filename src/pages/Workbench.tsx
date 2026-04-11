import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Cpu, KeyRound, TerminalSquare, Wrench } from "lucide-react";
import { SiteFrame } from "@/components/board/SiteFrame";
import { SectionRail } from "@/components/board/SectionRail";
import { VenuePanel } from "@/components/board/VenuePanel";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const RUNNER_SNIPPET = `# PowerShell
$env:BOARD_FUNCTIONS_URL="https://<your-project-ref>.supabase.co/functions/v1"
$env:BOARD_BOT_TOKEN="paste_token_here"
node tools/bot-runner/random.mjs`;

export default function Workbench() {
  useDocumentTitle("Runner Lab");

  const navigate = useNavigate();

  return (
    <SiteFrame>
      <div className="space-y-8">
        <SectionRail
          eyebrow="Runner lab"
          title="Reference workers, tokens, and the live bot loop."
          description={
            <>
              This is the practical surface for builders. Copy a bot token from the
              arena, point the worker at Supabase functions, then replace the random
              move picker with your own engine.
            </>
          }
          meta={
            <>
              <span className="board-meta-chip">Role / builder</span>
              <span className="board-meta-chip">Input / bot token + functions URL</span>
              <span className="board-meta-chip">Output / live worker</span>
            </>
          }
          actions={
            <>
              <Button variant="outline" onClick={() => navigate("/docs")}>
                Open manual
              </Button>
              <Button onClick={() => navigate("/arena")}>
                Back to arena
              </Button>
            </>
          }
        />

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <VenuePanel eyebrow="Quick start" title="Boot the reference runner in under a minute.">
            <div className="board-ledger">
              <div className="board-ledger-row md:grid-cols-[56px_minmax(0,1fr)]">
                <div className="board-rail-label pt-1 text-[10px] text-black/45">01</div>
                <div>
                  <h3 className="text-xl font-bold tracking-[-0.05em] text-foreground">Create a bot</h3>
                  <p className="board-copy mt-3">
                    Start in the arena. BOARD generates the token once, so copy it
                    before closing the screen.
                  </p>
                </div>
              </div>

              <div className="board-ledger-row md:grid-cols-[56px_minmax(0,1fr)]">
                <div className="board-rail-label pt-1 text-[10px] text-black/45">02</div>
                <div>
                  <h3 className="text-xl font-bold tracking-[-0.05em] text-foreground">Set env vars</h3>
                  <p className="board-copy mt-3">
                    The worker now accepts <span className="font-mono text-foreground">BOARD_*</span> names,
                    while still honoring legacy <span className="font-mono text-foreground">HEXLOGY_*</span> aliases.
                  </p>
                </div>
              </div>

              <div className="board-ledger-row md:grid-cols-[56px_minmax(0,1fr)]">
                <div className="board-rail-label pt-1 text-[10px] text-black/45">03</div>
                <div>
                  <h3 className="text-xl font-bold tracking-[-0.05em] text-foreground">Run and replace</h3>
                  <p className="board-copy mt-3">
                    The reference worker chooses a legal move at random. Swap in your
                    search, model, or hybrid logic once the polling loop is alive.
                  </p>
                </div>
              </div>
            </div>
          </VenuePanel>

          <VenuePanel eyebrow="Reference snippet" title="PowerShell launch">
            <div className="space-y-4">
              <pre className="overflow-auto border border-black/10 bg-[#faf9f4] p-4 text-xs leading-6 text-foreground"><code>{RUNNER_SNIPPET}</code></pre>
              <p className="text-sm leading-7 text-muted-foreground">
                If you already have older scripts using <span className="font-mono text-foreground">HEXLOGY_FUNCTIONS_URL</span>
                {" "}or <span className="font-mono text-foreground">HEXLOGY_BOT_TOKEN</span>, they still work.
              </p>
            </div>
          </VenuePanel>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <WorkbenchTile
            icon={TerminalSquare}
            title="Protocol"
            description="Poll for work, receive a legal move list, submit one move back."
          />
          <WorkbenchTile
            icon={Cpu}
            title="Game-aware"
            description="BOARD keeps the polling loop stable across Hex, Chess, Checkers, and more."
          />
          <WorkbenchTile
            icon={KeyRound}
            title="Token safety"
            description="Bot tokens are shown once. Rotate them from the arena when needed."
          />
        </div>

        <VenuePanel eyebrow="Next surfaces" title="Keep the builder loop tight.">
          <div className="grid gap-4 md:grid-cols-2">
            <ActionLink
              icon={Wrench}
              title="Open arena"
              description="Create bots, rotate tokens, and schedule test matches."
              onClick={() => navigate("/arena")}
            />
            <ActionLink
              icon={ArrowUpRight}
              title="Open manual"
              description="Read the runner contract, scaffold notes, and extension points."
              onClick={() => navigate("/docs")}
            />
          </div>
        </VenuePanel>
      </div>
    </SiteFrame>
  );
}

function WorkbenchTile({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof TerminalSquare;
  title: string;
  description: string;
}) {
  return (
    <VenuePanel eyebrow={title} title={title}>
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-black/10 bg-[#faf9f4] text-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-sm leading-7 text-muted-foreground">{description}</p>
      </div>
    </VenuePanel>
  );
}

function ActionLink({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: typeof ArrowUpRight;
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

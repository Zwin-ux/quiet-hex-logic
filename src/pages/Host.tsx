import { useNavigate } from "react-router-dom";
import { ArrowRight, ExternalLink, Layers3, ShieldCheck, Wrench } from "lucide-react";
import { SiteFrame } from "@/components/board/SiteFrame";
import { StateTag } from "@/components/board/StateTag";
import { VenuePanel } from "@/components/board/VenuePanel";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function Host() {
  useDocumentTitle("Host");

  const navigate = useNavigate();

  return (
    <SiteFrame>
      <div className="board-page-width mx-auto space-y-6">
        <section className="border border-[#0e0e0f] bg-[#090909] px-6 py-6 text-[#f3efe6] md:px-8 md:py-8">
          <div className="flex flex-wrap gap-2">
            <StateTag>Hosted network</StateTag>
            <StateTag tone="success">hosts keep event revenue</StateTag>
            <StateTag>web authoring</StateTag>
          </div>

          <h1 className="mt-8 max-w-[720px] text-[clamp(3rem,5vw,4.9rem)] font-black leading-[0.9] tracking-[-0.07em]">
            Run the venue on web. Play everywhere else.
          </h1>
          <p className="mt-5 max-w-[36rem] text-[17px] leading-8 text-white/72">
            Worlds, events, variants, and package publishing stay here. Mobile and Discord stay focused on joining, playing, spectating, and light host controls.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="hero" onClick={() => navigate("/worlds")}>
              <ArrowRight className="h-4 w-4" />
              Open worlds
            </Button>
            <Button variant="outline" onClick={() => navigate("/events")}>
              Open events
            </Button>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-3">
          <VenuePanel
            eyebrow="Surface split"
            title="Web"
            description="Create worlds, brand the venue, build variants, publish packages, and run the deeper organizer flow."
            titleBarEnd={<StateTag>authoring</StateTag>}
          >
            <div className="space-y-3 text-sm leading-7 text-muted-foreground">
              <div className="flex items-center gap-3">
                <Wrench className="h-4 w-4 text-foreground" />
                Surface rules editor
              </div>
              <div className="flex items-center gap-3">
                <Layers3 className="h-4 w-4 text-foreground" />
                Package upload and versioning
              </div>
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 text-foreground" />
                World settings and publishing
              </div>
            </div>
          </VenuePanel>

          <VenuePanel
            eyebrow="Surface split"
            title="iOS / Android / Discord"
            description="Quickplay, live matches, spectating, invite copying, readiness, and match starts. No deep editing."
            titleBarEnd={<StateTag tone="warning">host-lite</StateTag>}
          >
            <div className="space-y-2 text-sm leading-7 text-muted-foreground">
              <p>Quickplay</p>
              <p>Join live rooms</p>
              <p>Copy invites and start an existing session</p>
              <p>Open on web for variants, branding, and package publishing</p>
            </div>
          </VenuePanel>

          <VenuePanel
            eyebrow="Rules model"
            title="Two editing modes"
            description="Safe knob editing lives in the browser. Deeper mod packages can be uploaded and versioned on web. Full engine code stays in the open-source dev kit."
            titleBarEnd={<StateTag>engine split</StateTag>}
          >
            <div className="space-y-3">
              <Button variant="outline" onClick={() => navigate("/mods")}>
                <ExternalLink className="h-4 w-4" />
                Open mod registry
              </Button>
            </div>
          </VenuePanel>
        </div>
      </div>
    </SiteFrame>
  );
}

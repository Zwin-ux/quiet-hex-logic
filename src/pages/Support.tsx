import { MessageCircle, Mail, Shield } from "lucide-react";
import { SiteFrame } from "@/components/board/SiteFrame";
import { SectionRail } from "@/components/board/SectionRail";
import { VenuePanel } from "@/components/board/VenuePanel";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function Support() {
  useDocumentTitle("Support");

  return (
    <SiteFrame>
      <div className="space-y-8">
        <SectionRail
          eyebrow="Support"
          title="Help for players, hosts, and builders."
          description={
            <>
              If something breaks, feels confusing, or blocks a live event, start here.
              The fastest path is still Discord.
            </>
          }
          meta={
            <>
              <span className="board-meta-chip">Channels / Discord + email</span>
              <span className="board-meta-chip">Audience / players, hosts, builders</span>
            </>
          }
        />

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <VenuePanel eyebrow="Fastest help" title="Join the Discord">
            <p className="text-sm leading-7 text-muted-foreground">
              For live questions, setup problems, and event-day issues, Discord is the
              quickest way to reach us and the rest of the BOARD community.
            </p>
            <div className="mt-6">
              <a href="https://discord.gg/67EmmZu69q" target="_blank" rel="noopener noreferrer">
                <Button className="bg-[#5865F2] text-white hover:bg-[#4752C4]">
                  <MessageCircle className="h-4 w-4" />
                  Join Discord
                </Button>
              </a>
            </div>
          </VenuePanel>

          <VenuePanel eyebrow="Contact" title="Email for technical or business issues">
            <p className="text-sm leading-7 text-muted-foreground">
              Use email when you need a paper trail, have infrastructure questions, or
              want to talk about running BOARD in a real venue or club context.
            </p>
            <div className="mt-6">
              <a href="mailto:community@hexology.me" className="inline-flex items-center gap-2 text-sm font-semibold text-foreground hover:opacity-70">
                <Mail className="h-4 w-4" />
                community@hexology.me
              </a>
            </div>
          </VenuePanel>
        </div>

        <VenuePanel eyebrow="Common questions" title="The short version">
          <div className="board-ledger">
            <div className="board-ledger-row md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div>
                <h3 className="text-lg font-bold tracking-[-0.04em] text-foreground">How do I play?</h3>
              </div>
              <p className="text-sm leading-7 text-muted-foreground">
                Start from Play for solo practice or open Worlds for host-run rooms and events.
              </p>
            </div>

            <div className="board-ledger-row md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div>
                <h3 className="text-lg font-bold tracking-[-0.04em] text-foreground">What is BOARD+?</h3>
              </div>
              <p className="text-sm leading-7 text-muted-foreground">
                It is the optional supporter plan for extra analysis, aesthetics, and funding the product without ads.
              </p>
            </div>

            <div className="board-ledger-row md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div>
                <h3 className="text-lg font-bold tracking-[-0.04em] text-foreground">Where do events live?</h3>
              </div>
              <p className="text-sm leading-7 text-muted-foreground">
                Recurring competitions should come from Worlds. The Events page is the network-wide directory.
              </p>
            </div>

            <div className="board-ledger-row md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-foreground" />
                <h3 className="text-lg font-bold tracking-[-0.04em] text-foreground">Fair play</h3>
              </div>
              <p className="text-sm leading-7 text-muted-foreground">
                BOARD stays pay-to-host, not pay-to-win. Competitive trust matters more than cosmetic upsells.
              </p>
            </div>
          </div>
        </VenuePanel>
      </div>
    </SiteFrame>
  );
}

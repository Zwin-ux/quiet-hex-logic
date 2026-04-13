import { MessageCircle, Mail, Shield } from "lucide-react";
import { SupportFrame } from "@/components/support/SupportFrame";
import { SupportPanel } from "@/components/support/SupportPanel";
import { SupportSoon } from "@/components/support/SupportSoon";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function Support() {
  useDocumentTitle("Support");

  return (
    <SupportFrame>
      <div className="space-y-8">
        <SupportPanel
          tone="dark"
          eyebrow="Support desk"
          title="Need help."
          description="Join Discord for live issues. Use email when it needs a record."
          motionIndex={0}
          motionVariant="hero"
        >
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="support-chip">Discord</span>
            <span className="support-chip support-chip--light">email</span>
            <span className="support-chip support-chip--light">hosts + players</span>
          </div>
        </SupportPanel>

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <SupportPanel
            tone="light"
            eyebrow="Fastest help"
            title="Join the Discord"
            description="Use this for setup trouble, event-day issues, and short questions."
            titleBarEnd={<span className="support-chip support-chip--light">live support</span>}
            motionIndex={1}
          >
            <div className="grid gap-3 pt-1 sm:grid-cols-2">
              <div className="support-grid-stat">
                <p className="support-mini-label text-white/58">response path</p>
                <p className="mt-2 text-lg font-semibold text-white">discord</p>
              </div>
              <div className="support-grid-stat">
                <p className="support-mini-label text-white/58">best for</p>
                <p className="mt-2 text-lg font-semibold text-white">live issues</p>
              </div>
            </div>
            <div className="mt-8">
              <a href="https://discord.gg/67EmmZu69q" target="_blank" rel="noopener noreferrer">
                <Button variant="support">
                  <MessageCircle className="h-4 w-4" />
                  Join Discord
                </Button>
              </a>
            </div>
          </SupportPanel>

          <SupportPanel
            tone="paper"
            eyebrow="Contact"
            title="Email questions"
            titleBarEnd={<span className="support-chip support-chip--paper">paper trail</span>}
            motionIndex={2}
          >
            <div className="support-note">
              Use email for venue questions, technical details, or follow-up that should stay in writing.
            </div>
            <div className="grid gap-3 pt-1 sm:grid-cols-2">
              <div className="support-grid-stat">
                <p className="support-mini-label text-black/58">channel</p>
                <p className="mt-2 text-lg font-semibold text-black">email</p>
              </div>
              <div className="support-grid-stat">
                <p className="support-mini-label text-black/58">best for</p>
                <p className="mt-2 text-lg font-semibold text-black">technical</p>
              </div>
            </div>
            <div className="support-inline-card support-inline-card--paper mt-8">
              <a href="mailto:community@hexology.me" className="inline-flex items-center gap-2 text-sm font-semibold text-black hover:opacity-70">
                <Mail className="h-4 w-4" />
                community@hexology.me
              </a>
            </div>
          </SupportPanel>
        </div>

        <SupportPanel
          tone="light"
          eyebrow="Quick answers"
          title="Quick answers"
          titleBarEnd={<span className="support-chip support-chip--light">reference</span>}
          motionIndex={3}
          motionVariant="hero"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="support-inline-card">
              <p className="support-mini-label text-white/58">How do I play?</p>
              <p className="mt-3 text-base leading-7 text-white">Open Play for local boards. Open Worlds for hosted rooms and events.</p>
            </div>
            <div className="support-inline-card">
              <p className="support-mini-label text-white/58">What is BOARD+?</p>
              <SupportSoon className="mt-3" detail="BOARD+ notes land here after the core launch pass." />
            </div>
            <div className="support-inline-card">
              <p className="support-mini-label text-white/58">Where do events live?</p>
              <p className="mt-3 text-base leading-7 text-white">Run recurring events from Worlds. Use Events as the public board.</p>
            </div>
            <div className="support-inline-card">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-[#ffe600]" />
                <p className="support-mini-label text-white/58">Fair play</p>
              </div>
              <p className="mt-3 text-base leading-7 text-white">World ID gates competitive entry. Casual play stays open.</p>
            </div>
          </div>
        </SupportPanel>
      </div>
    </SupportFrame>
  );
}

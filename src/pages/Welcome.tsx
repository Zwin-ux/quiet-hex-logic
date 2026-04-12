import { useEffect } from "react";
import { ArrowRight, DoorOpen, Globe, Swords } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BoardWordmark } from "@/components/board/BoardWordmark";
import { CounterBlock } from "@/components/board/CounterBlock";
import { SectionRail } from "@/components/board/SectionRail";
import { SiteFrame } from "@/components/board/SiteFrame";
import { StateTag } from "@/components/board/StateTag";
import { VenuePanel } from "@/components/board/VenuePanel";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAuthConnections } from "@/hooks/useAuthConnections";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useWorldID } from "@/hooks/useWorldID";
import { buildAuthRoute, markPostAuthWelcomeSeen } from "@/lib/authRedirect";

export default function Welcome() {
  useDocumentTitle("Welcome");

  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { connections, loading: connectionsLoading } = useAuthConnections();
  const { isVerified, isLoading: worldIdLoading } = useWorldID();

  useEffect(() => {
    if (loading) return;

    if (!user || user.is_anonymous) {
      navigate(buildAuthRoute("/welcome"), { replace: true });
    }
  }, [loading, navigate, user]);

  const connectedMethods = Math.max(connections.length + (user?.email ? 1 : 0), 1);
  const verificationLabel = worldIdLoading
    ? "checking"
    : isVerified
      ? "competitive ready"
      : "verify next";
  const connectionLabel = connectionsLoading ? "loading" : `${connectedMethods} methods`;

  const goTo = (path: string) => {
    markPostAuthWelcomeSeen();
    navigate(path);
  };

  return (
    <SiteFrame contentClassName="pt-24">
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <BoardWordmark className="text-[#0e0e0f]" />
          <div className="retro-status-strip">
            <span>{connectionLabel}</span>
            <span>{verificationLabel}</span>
          </div>
        </div>

        <SectionRail
          eyebrow="Entry desk"
          title="Pick the next move."
          description="Identity is live. Now either host a world, verify for competitive play, or stay local. Extra providers can wait until after entry."
          meta={
            <>
              <CounterBlock label="account" value={user?.email ? "live" : "new"} />
              <CounterBlock label="methods" value={connectedMethods} />
              <CounterBlock label="trust" value={isVerified ? "ready" : "open"} />
            </>
          }
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="grid gap-6 md:grid-cols-3">
            <VenuePanel
              eyebrow="Host"
              title="Host a world"
              description="Create the venue, land in setup mode, open the first room, then queue the first event."
              footer={
                <Button variant="hero" className="w-full justify-between" onClick={() => goTo("/worlds?create=true")}>
                  <span>Open world setup</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              }
            >
              <div className="retro-status-strip w-fit">
                <span>rooms</span>
                <span>events</span>
                <span>invite</span>
              </div>
            </VenuePanel>

            <VenuePanel
              eyebrow="Trust"
              title="Verify for competitive"
              description="Competitive events and ranked queues require World ID. Casual hosting and local practice do not."
              footer={
                <Button
                  variant={isVerified ? "secondary" : "outline"}
                  className="w-full justify-between"
                  onClick={() => goTo("/profile#identity")}
                >
                  <span>{isVerified ? "Review trust state" : "Open verification"}</span>
                  <Globe className="h-4 w-4" />
                </Button>
              }
            >
              <div className="retro-status-strip w-fit">
                <span>{isVerified ? "verified" : "required for ranked"}</span>
              </div>
            </VenuePanel>

            <VenuePanel
              eyebrow="Practice"
              title="Local practice"
              description="Stay outside the hosted stack. Open a board immediately and learn the game without touching event or membership state."
              footer={
                <Button variant="outline" className="w-full justify-between" onClick={() => goTo("/play")}>
                  <span>Open play desk</span>
                  <Swords className="h-4 w-4" />
                </Button>
              }
            >
              <div className="retro-status-strip w-fit">
                <span>no gate</span>
                <span>instant board</span>
              </div>
            </VenuePanel>
          </div>

          <VenuePanel
            eyebrow="Account rule"
            title="One BOARD account."
            description="Use Google or email to get in quickly. Add more sign-in methods later from Profile so worlds, ratings, and moderation state stay on one identity."
            footer={
              <Button variant="quiet" className="w-full justify-between" onClick={() => goTo("/profile#identity")}>
                <span>Review account connections</span>
                <DoorOpen className="h-4 w-4" />
              </Button>
            }
          >
            <div className="space-y-3">
              <StateTag tone="success">Google / email first</StateTag>
              <StateTag>connect more providers later</StateTag>
              <StateTag tone={isVerified ? "success" : "warning"}>
                {isVerified ? "competitive unlocked" : "competitive still gated"}
              </StateTag>
            </div>
          </VenuePanel>
        </div>
      </div>
    </SiteFrame>
  );
}

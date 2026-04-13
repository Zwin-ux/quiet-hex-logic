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
      ? "ranked ready"
      : "verify now";
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
          title="Choose next."
          description="Host. Verify. Or play local."
          meta={
            <>
              <CounterBlock label="account" value={user?.email ? "live" : "new"} />
              <CounterBlock label="methods" value={connectedMethods} />
              <CounterBlock label="trust" value={isVerified ? "ready" : "locked"} />
            </>
          }
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.28fr)_340px]">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <VenuePanel
              eyebrow="Host"
              title="Host a world"
              description="Create a world. Open a room. Queue an event."
              className="md:row-span-2"
              footer={
                <Button variant="hero" className="w-full justify-between" onClick={() => goTo("/worlds?create=true")}>
                  <span>Create world</span>
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
              eyebrow="Ranked"
              title="Verify for ranked"
              description="Use World ID. Join ranked queues. Join competitive events."
              footer={
                <Button
                  variant={isVerified ? "secondary" : "outline"}
                  className="w-full justify-between"
                  onClick={() => goTo("/profile#identity")}
                >
                  <span>{isVerified ? "Check status" : "Open verify"}</span>
                  <Globe className="h-4 w-4" />
                </Button>
              }
            >
              <div className="retro-status-strip w-fit">
                <span>{isVerified ? "verified" : "required"}</span>
              </div>
            </VenuePanel>

            <VenuePanel
              eyebrow="Practice"
              title="Local practice"
              description="Open a board. Play local. No sign-in."
              footer={
                <Button variant="outline" className="w-full justify-between" onClick={() => goTo("/play")}>
                  <span>Open play</span>
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
            description="Sign in once. Link more logins later."
            footer={
              <Button variant="quiet" className="w-full justify-between" onClick={() => goTo("/profile#identity")}>
                <span>Open account links</span>
                <DoorOpen className="h-4 w-4" />
              </Button>
            }
          >
            <div className="space-y-3">
              <StateTag tone="success">Google or email</StateTag>
              <StateTag>link more logins later</StateTag>
              <StateTag tone={isVerified ? "success" : "warning"}>
                {isVerified ? "ranked ready" : "ranked locked"}
              </StateTag>
            </div>
          </VenuePanel>
        </div>
      </div>
    </SiteFrame>
  );
}

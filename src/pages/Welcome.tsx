import { useEffect } from "react";
import { ArrowRight, DoorOpen, Globe, Swords } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BoardWordmark } from "@/components/board/BoardWordmark";
import { SupportFrame } from "@/components/support/SupportFrame";
import { SupportPanel } from "@/components/support/SupportPanel";
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
    <SupportFrame contentClassName="pt-24">
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <BoardWordmark className="text-white" />
          <div className="flex flex-wrap gap-2">
            <span className="support-chip">{connectionLabel}</span>
            <span className="support-chip support-chip--light">{verificationLabel}</span>
          </div>
        </div>

        <SupportPanel
          tone="dark"
          eyebrow="Choice desk"
          title="Pick next."
          description="Host a room. Verify for ranked. Or open a local board."
          motionIndex={0}
          motionVariant="hero"
        >
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="support-chip">account {user?.email ? "live" : "new"}</span>
            <span className="support-chip support-chip--light">{connectedMethods} methods</span>
            <span className="support-chip support-chip--light">{isVerified ? "ranked ready" : "ranked locked"}</span>
          </div>
        </SupportPanel>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.28fr)_340px]">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <SupportPanel
              tone="light"
              eyebrow="Host"
              title="Host a world"
              description="Create a world. Open a room. Queue an event."
              className="md:row-span-2"
              motionIndex={1}
              motionVariant="hero"
              footer={
                <Button variant="support" className="w-full justify-between" onClick={() => goTo("/worlds?create=true")}>
                  <span>Create world</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              }
            >
              <div className="flex flex-wrap gap-2">
                <span className="support-chip support-chip--light">rooms</span>
                <span className="support-chip support-chip--light">events</span>
                <span className="support-chip support-chip--light">invite</span>
              </div>
            </SupportPanel>

            <SupportPanel
              tone="paper"
              eyebrow="Ranked"
              title="Verify for ranked"
              description="Use World ID. Join ranked queues. Join competitive events."
              motionIndex={2}
              footer={
                <Button
                  variant={isVerified ? "supportGhost" : "supportOutline"}
                  className="w-full justify-between"
                  onClick={() => goTo("/profile#identity")}
                >
                  <span>{isVerified ? "Check status" : "Open verify"}</span>
                  <Globe className="h-4 w-4" />
                </Button>
              }
            >
              <div className="flex flex-wrap gap-2">
                <span className="support-chip support-chip--paper">{isVerified ? "verified" : "required"}</span>
              </div>
            </SupportPanel>

            <SupportPanel
              tone="paper"
              eyebrow="Practice"
              title="Local practice"
              description="Open a board. Play local. No sign-in."
              motionIndex={3}
              footer={
                <Button variant="supportOutline" className="w-full justify-between" onClick={() => goTo("/play")}>
                  <span>Open play</span>
                  <Swords className="h-4 w-4" />
                </Button>
              }
            >
              <div className="flex flex-wrap gap-2">
                <span className="support-chip support-chip--paper">no gate</span>
                <span className="support-chip support-chip--paper">instant board</span>
              </div>
            </SupportPanel>
          </div>

          <SupportPanel
            tone="dark"
            eyebrow="Account rule"
            title="One BOARD account."
            description="Sign in once. Link more logins later."
            motionIndex={4}
            motionVariant="aside"
            footer={
              <Button variant="supportGhost" className="w-full justify-between" onClick={() => goTo("/profile#identity")}>
                <span>Open account links</span>
                <DoorOpen className="h-4 w-4" />
              </Button>
            }
          >
            <div className="flex flex-wrap gap-2">
              <span className="support-chip">Google or email</span>
              <span className="support-chip support-chip--light">link more later</span>
              <span className="support-chip support-chip--light">
                {isVerified ? "ranked ready" : "ranked locked"}
              </span>
            </div>
          </SupportPanel>
        </div>
      </div>
    </SupportFrame>
  );
}

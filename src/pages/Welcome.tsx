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

  const accountLabel = connectionsLoading
    ? "Checking account."
    : connections.length + (user?.email ? 1 : 0) > 1
      ? "Backups linked."
      : "Add backups later.";
  const verifyLabel = worldIdLoading
    ? "Checking ranked."
    : isVerified
      ? "Ranked ready."
      : "Verify for ranked.";

  const goTo = (path: string) => {
    markPostAuthWelcomeSeen();
    navigate(path);
  };

  return (
    <SupportFrame contentClassName="pt-24">
      <div className="space-y-8">
        <BoardWordmark className="text-white" />

        <SupportPanel
          tone="dark"
          title="Pick next."
          description="Host. Verify. Practice."
          motionIndex={0}
          motionVariant="hero"
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.28fr)_340px]">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <SupportPanel
              tone="light"
              eyebrow="Host"
              title="Host a world"
              description="Create world. Open room. Queue event."
              className="md:row-span-2"
              motionIndex={1}
              motionVariant="hero"
              footer={
                <Button variant="support" className="w-full justify-between" onClick={() => goTo("/worlds?create=true")}>
                  <span>Create world</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              }
            />

            <SupportPanel
              tone="paper"
              eyebrow="Ranked"
              title="Verify for ranked"
              description="World ID required."
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
            />

            <SupportPanel
              tone="paper"
              eyebrow="Practice"
              title="Local practice"
              description="Open board. Play."
              motionIndex={3}
              footer={
                <Button variant="supportOutline" className="w-full justify-between" onClick={() => goTo("/play")}>
                  <span>Open play</span>
                  <Swords className="h-4 w-4" />
                </Button>
              }
            />
          </div>

          <SupportPanel
            tone="dark"
            title="One BOARD account."
            description={`${accountLabel} ${verifyLabel}`}
            motionIndex={4}
            motionVariant="aside"
            footer={
              <Button variant="supportGhost" className="w-full justify-between" onClick={() => goTo("/profile#identity")}>
                <span>Open account links</span>
                <DoorOpen className="h-4 w-4" />
              </Button>
            }
          />
        </div>
      </div>
    </SupportFrame>
  );
}

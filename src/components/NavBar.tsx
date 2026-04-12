import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LogOut, User, Wrench } from "lucide-react";
import { BoardLogo } from "@/components/BoardLogo";
import { StateTag } from "@/components/board/StateTag";
import { useAuth } from "@/hooks/useAuth";
import { buildAuthRoute } from "@/lib/authRedirect";
import { cn } from "@/lib/utils";

const PRIMARY_LINKS = [
  { label: "Worlds", path: "/worlds" },
  { label: "Play", path: "/play" },
  { label: "Events", path: "/events" },
];

const ROUTE_LABELS: Array<{ match: RegExp; label: string }> = [
  { match: /^\/$/, label: "Live board worlds" },
  { match: /^\/auth/, label: "Entry gate" },
  { match: /^\/worlds/, label: "World directory" },
  { match: /^\/play|^\/lobby/, label: "Play desk" },
  { match: /^\/events|^\/tournaments|^\/tournament/, label: "Event directory" },
  { match: /^\/match|^\/replay/, label: "Live instance" },
  { match: /^\/docs/, label: "Builder manual" },
  { match: /^\/workbench/, label: "Runner lab" },
  { match: /^\/arena/, label: "Bot arena" },
  { match: /^\/tutorial/, label: "Learn Hex" },
  { match: /^\/premium/, label: "Support BOARD" },
];

export function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();

  const isLanding = location.pathname === "/";
  const currentLabel =
    ROUTE_LABELS.find((route) => route.match.test(location.pathname))?.label ?? "BOARD";

  const isActive = (path: string) =>
    location.pathname === path || (path !== "/" && location.pathname.startsWith(path));

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 text-foreground md:px-5">
      <div className="board-page-width mx-auto retro-window">
        <div className="retro-window__titlebar">
          <div className="flex min-w-0 items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="text-white no-underline transition-none hover:text-[#ffff00]"
              aria-label="Go to home"
            >
              <BoardLogo tone="dark" />
            </button>
            <div className="hidden min-w-0 border-l border-white/30 pl-4 lg:block">
              <p className="retro-window__eyebrow">
                {isLanding ? "Live board worlds" : currentLabel}
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <StateTag tone="success">Network live</StateTag>
            <StateTag>{currentLabel}</StateTag>
          </div>
        </div>

        <div className="retro-window__body m-[6px] !bg-white px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <nav className="hidden items-center gap-2 md:flex">
              {PRIMARY_LINKS.map((link) => (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className={cn(
                    "border border-transparent px-2 py-1 font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-black no-underline transition-none hover:bg-[#000080] hover:text-white",
                    isActive(link.path) && "border-black bg-[#000080] text-white",
                  )}
                >
                  {link.label}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/docs")}
                className="hidden px-2 py-1 font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-black no-underline hover:bg-[#ffff00] lg:inline-flex"
              >
                Manual
              </button>
              {user ? (
                <>
                  <IconRailButton onClick={() => navigate("/profile")} label="Profile">
                    <User className="h-4 w-4" />
                  </IconRailButton>
                  <IconRailButton onClick={() => navigate("/workbench")} label="Workbench">
                    <Wrench className="h-4 w-4" />
                  </IconRailButton>
                  <IconRailButton
                    onClick={() => {
                      signOut();
                      navigate(buildAuthRoute());
                    }}
                    label="Sign out"
                  >
                    <LogOut className="h-4 w-4" />
                  </IconRailButton>
                </>
              ) : (
                <button
                  onClick={() => navigate(buildAuthRoute())}
                  className="border-2 border-black bg-[#00aa00] px-4 py-2 font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-white no-underline [border-color:#00ff00_#006600_#006600_#00ff00] [box-shadow:inset_-1px_-1px_0_#404040,inset_1px_1px_0_#dfdfdf] hover:bg-[#00c000] active:translate-x-px active:translate-y-px active:[border-color:#006600_#00ff00_#00ff00_#006600] active:[box-shadow:inset_1px_1px_0_#404040,inset_-1px_-1px_0_#dfdfdf]"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>

          <div className="scrollbar-hide mt-3 flex gap-2 overflow-x-auto border-t-2 border-black pt-3 md:hidden">
            {PRIMARY_LINKS.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={cn(
                  "whitespace-nowrap border border-transparent px-2 py-1 font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-black",
                  isActive(link.path) && "border-black bg-[#000080] text-white",
                )}
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

function IconRailButton({
  children,
  label,
  onClick,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center border-2 border-black bg-[#c0c0c0] text-foreground transition-none [border-color:#ffffff_#808080_#808080_#ffffff] [box-shadow:inset_-1px_-1px_0_#404040,inset_1px_1px_0_#dfdfdf] hover:bg-[#d0d0d0] active:translate-x-px active:translate-y-px active:[border-color:#808080_#ffffff_#ffffff_#808080] active:[box-shadow:inset_1px_1px_0_#404040,inset_-1px_-1px_0_#dfdfdf]"
    >
      {children}
    </button>
  );
}

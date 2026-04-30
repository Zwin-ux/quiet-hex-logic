import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LogOut, User, Wrench } from "lucide-react";
import { BoardLogo } from "@/components/BoardLogo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { buildAuthRoute } from "@/lib/authRedirect";
import { useSurfaceCapabilities } from "@/lib/surfaces";
import { cn } from "@/lib/utils";

const WEB_PRIMARY_LINKS = [
  { label: "Worlds", path: "/worlds" },
  { label: "Play", path: "/play" },
  { label: "Events", path: "/events" },
];

const PLAY_PRIMARY_LINKS = [
  { label: "Play", path: "/play" },
  { label: "Events", path: "/events" },
  { label: "Worlds", path: "/worlds" },
];

const ROUTE_LABELS: Array<{ match: RegExp; label: string }> = [
  { match: /^\/$/, label: "Home" },
  { match: /^\/auth/, label: "Enter" },
  { match: /^\/worlds\/[^/]+\/settings/, label: "World Settings" },
  { match: /^\/worlds\/[^/]+\/variants/, label: "World Variants" },
  { match: /^\/worlds/, label: "World Directory" },
  { match: /^\/play|^\/lobby/, label: "Play Network" },
  { match: /^\/events|^\/tournaments|^\/tournament/, label: "Event Rail" },
  { match: /^\/host/, label: "Host" },
  { match: /^\/hiring/, label: "Hiring" },
  { match: /^\/match|^\/replay/, label: "Live Surface" },
  { match: /^\/docs/, label: "Manual" },
  { match: /^\/workbench/, label: "Workbench" },
  { match: /^\/arena/, label: "Arena" },
  { match: /^\/tutorial/, label: "Learn" },
  { match: /^\/premium/, label: "Support" },
];

type NavBarProps = {
  variant?: "default" | "landing";
  visualMode?: "default" | "mono" | "world";
};

export function NavBar({ variant = "default", visualMode = "default" }: NavBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { can, isAuthoringSurface } = useSurfaceCapabilities();
  const primaryLinks = isAuthoringSurface ? WEB_PRIMARY_LINKS : PLAY_PRIMARY_LINKS;
  const postAuthPath = isAuthoringSurface ? "/worlds" : "/play";

  const currentLabel =
    ROUTE_LABELS.find((route) => route.match.test(location.pathname))?.label ?? "BOARD";
  const showCurrentLabel = Boolean(user) && currentLabel !== "Home";
  const isFlatVisual = visualMode === "mono" || visualMode === "world";

  const isActive = (path: string) =>
    location.pathname === path || (path !== "/" && location.pathname.startsWith(path));

  if (variant === "landing") {
    const enterPath = user ? postAuthPath : buildAuthRoute(postAuthPath);

    return (
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 px-4 pt-4 md:px-6",
          isFlatVisual
            ? "bg-[#f7f4ed] md:bg-[#f7f4ed]/98"
            : "bg-[#f6f4f0]/84 backdrop-blur-[16px]",
        )}
      >
        <div className="mx-auto max-w-[1520px]">
          <div className="system-nav-shell system-nav-shell--landing">
            <div className="system-nav-row">
              <button
                onClick={() => navigate("/")}
                className="shrink-0 w-[132px] text-[#0e0e0f] transition-colors duration-150 hover:text-[#2d2d30] sm:w-[142px] md:w-auto"
                aria-label="Go to home"
              >
                <>
                  <BoardLogo
                    variant="wordmark"
                    tone="dark"
                    className="md:hidden"
                    wordmarkClassName="text-[29px]"
                  />
                  <BoardLogo
                    tone="dark"
                    className="hidden md:inline-flex"
                    wordmarkClassName="text-[34px]"
                  />
                </>
              </button>

              <nav className="system-nav-links" aria-label="Primary">
                {primaryLinks.map((link) => (
                  <button
                    key={link.path}
                    onClick={() => navigate(link.path)}
                    className={cn(
                      "board-public-label transition-colors duration-150 hover:text-[#0e0e0f]",
                      isActive(link.path) ? "text-[#0e0e0f]" : "text-black/58",
                    )}
                  >
                    {link.label}
                  </button>
                ))}
              </nav>

              <Button
                variant="hero"
                className="system-nav-enter min-w-[92px] md:min-w-[108px]"
                onClick={() => navigate(enterPath)}
              >
                Enter
              </Button>
            </div>

            <nav className="system-nav-links-mobile" aria-label="Primary mobile">
              {primaryLinks.map((link) => (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className={cn(
                    "board-public-label whitespace-nowrap transition-colors duration-150 hover:text-[#0e0e0f]",
                    isActive(link.path) ? "text-[#0e0e0f]" : "text-black/58",
                  )}
                >
                  {link.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 px-4 pt-4 md:px-6",
        isFlatVisual
          ? "bg-[#f7f4ed] md:bg-[#f7f4ed]/98"
          : "bg-[#f6f4f0]/84 backdrop-blur-[16px]",
      )}
    >
      <div className="board-page-width mx-auto">
        <div className="system-nav-shell">
          <div className="system-nav-row">
          <button
            onClick={() => navigate("/")}
            className="min-w-0 shrink whitespace-nowrap text-[#0e0e0f] transition-colors duration-150 hover:text-[#2d2d30]"
            aria-label="Go to home"
          >
            <>
              <BoardLogo
                variant="wordmark"
                tone="dark"
                className="sm:hidden"
                wordmarkClassName="text-[1.45rem]"
              />
              <BoardLogo
                tone="dark"
                className="hidden sm:inline-flex"
                wordmarkClassName="text-[1.8rem] md:text-[2.25rem]"
              />
            </>
          </button>

          <nav className="system-nav-links" aria-label="Primary">
            {primaryLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={cn(
                  "board-rail-label text-[11px] tracking-[0.14em] text-black/58 transition-colors duration-150 hover:text-[#0e0e0f]",
                  isActive(link.path) && "text-[#0e0e0f]",
                )}
              >
                {link.label}
              </button>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
            {showCurrentLabel ? (
              <span className="system-nav-context hidden md:inline-flex">{currentLabel}</span>
            ) : null}
            {user ? (
              <>
                <UtilityButton
                  onClick={() => navigate("/profile")}
                  label="Profile"
                  visualMode={visualMode}
                >
                  <User className="h-4 w-4" />
                </UtilityButton>
                {can("useWorkbench") ? (
                  <UtilityButton
                    onClick={() => navigate("/workbench")}
                    label="Workbench"
                    visualMode={visualMode}
                  >
                    <Wrench className="h-4 w-4" />
                  </UtilityButton>
                ) : null}
                <UtilityButton
                  onClick={() => {
                    signOut();
                    navigate(buildAuthRoute(postAuthPath));
                  }}
                  label="Sign out"
                  visualMode={visualMode}
                >
                  <LogOut className="h-4 w-4" />
                </UtilityButton>
              </>
            ) : (
              <button
                onClick={() => navigate(buildAuthRoute(postAuthPath))}
                className="system-nav-enter"
              >
                Enter
              </button>
            )}
          </div>
        </div>

        <div className="system-nav-links-mobile md:hidden">
          {primaryLinks.map((link) => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={cn(
                "board-rail-label whitespace-nowrap text-[11px] tracking-[0.14em] text-black/58",
                isActive(link.path) && "text-[#0e0e0f]",
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

function UtilityButton({
  children,
  label,
  onClick,
  visualMode = "default",
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  visualMode?: "default" | "mono" | "world";
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        "system-nav-utility",
        (visualMode === "mono" || visualMode === "world") && "system-nav-utility--mono",
      )}
    >
      {children}
    </button>
  );
}

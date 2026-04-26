import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LogOut, User, Wrench } from "lucide-react";
import { BoardLogo } from "@/components/BoardLogo";
import { Button } from "@/components/ui/button";
import { StateTag } from "@/components/board/StateTag";
import { useAuth } from "@/hooks/useAuth";
import { buildAuthRoute } from "@/lib/authRedirect";
import { useSurfaceCapabilities } from "@/lib/surfaces";
import { cn } from "@/lib/utils";

const PRIMARY_LINKS = [
  { label: "Worlds", path: "/worlds" },
  { label: "Play", path: "/play" },
  { label: "Events", path: "/events" },
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
};

export function NavBar({ variant = "default" }: NavBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { can } = useSurfaceCapabilities();

  const currentLabel =
    ROUTE_LABELS.find((route) => route.match.test(location.pathname))?.label ?? "BOARD";
  const showCurrentLabel = Boolean(user) || currentLabel !== "Enter";

  const isActive = (path: string) =>
    location.pathname === path || (path !== "/" && location.pathname.startsWith(path));

  if (variant === "landing") {
    const enterPath = user ? "/worlds" : buildAuthRoute("/worlds");

    return (
      <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 md:px-6">
        <div className="mx-auto max-w-[1520px]">
          <div className="landing-nav-shell">
            <div className="landing-nav-row">
              <button
                onClick={() => navigate("/")}
                className="shrink-0 w-[132px] text-[#0e0e0f] transition-colors duration-150 hover:text-[#525257] sm:w-[142px] md:w-auto"
                aria-label="Go to home"
              >
                <BoardLogo tone="dark" wordmarkClassName="text-[29px] md:text-[34px]" />
              </button>

              <nav className="landing-nav-links" aria-label="Primary">
                {PRIMARY_LINKS.map((link) => (
                  <button
                    key={link.path}
                    onClick={() => navigate(link.path)}
                    className={cn(
                      "board-public-label transition-colors duration-150 hover:text-[#0e0e0f]",
                      isActive(link.path) ? "text-[#0e0e0f]" : "text-[#5d5d5d]",
                    )}
                  >
                    {link.label}
                  </button>
                ))}
              </nav>

              <Button
                variant="hero"
                className="min-w-[98px] bg-[#0a0a0a] px-4 text-[#f8f6ef] hover:bg-[#23252b] md:min-w-[116px]"
                onClick={() => navigate(enterPath)}
              >
                Enter
              </Button>
            </div>

            <nav className="landing-nav-links-mobile" aria-label="Primary mobile">
              {PRIMARY_LINKS.map((link) => (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className={cn(
                    "board-public-label whitespace-nowrap transition-colors duration-150 hover:text-[#0e0e0f]",
                    isActive(link.path) ? "text-[#0e0e0f]" : "text-[#5d5d5d]",
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
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 md:px-6">
      <div className="board-page-width mx-auto border border-[#0e0e0f] bg-[#f6f4f0]/90 backdrop-blur-[8px]">
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-4 sm:py-3 md:px-5">
          <button
            onClick={() => navigate("/")}
            className="min-w-0 shrink whitespace-nowrap text-[#0e0e0f] transition-colors duration-150 hover:text-[#525257]"
            aria-label="Go to home"
          >
            <BoardLogo tone="dark" wordmarkClassName="text-[1.5rem] sm:text-[1.8rem] md:text-[2.25rem]" />
          </button>

          <nav className="hidden items-center gap-6 md:flex">
            {PRIMARY_LINKS.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={cn(
                  "board-rail-label text-[11px] tracking-[0.14em] text-[#525257] transition-colors duration-150 hover:text-[#0e0e0f]",
                  isActive(link.path) && "text-[#0e0e0f]",
                )}
              >
                {link.label}
              </button>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
            {showCurrentLabel ? (
              <StateTag className="hidden md:inline-flex">{currentLabel}</StateTag>
            ) : null}
            {user ? (
              <>
                <UtilityButton onClick={() => navigate("/profile")} label="Profile">
                  <User className="h-4 w-4" />
                </UtilityButton>
                {can("useWorkbench") ? (
                  <UtilityButton onClick={() => navigate("/workbench")} label="Workbench">
                    <Wrench className="h-4 w-4" />
                  </UtilityButton>
                ) : null}
                <UtilityButton
                  onClick={() => {
                    signOut();
                    navigate(buildAuthRoute());
                  }}
                  label="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </UtilityButton>
              </>
            ) : (
              <button
                onClick={() => navigate(buildAuthRoute())}
                className="inline-flex h-9 items-center justify-center whitespace-nowrap bg-[#0e0e0f] px-2.5 text-[12px] font-medium text-[#f6f4f0] transition-colors duration-150 hover:bg-[#202124] sm:h-10 sm:px-3 sm:text-[13px] md:px-4 md:text-[14px]"
              >
                Enter
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 overflow-x-auto border-t border-[#0e0e0f]/12 px-4 py-3 md:hidden">
          {PRIMARY_LINKS.map((link) => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={cn(
                "board-rail-label whitespace-nowrap text-[11px] tracking-[0.14em] text-[#525257]",
                isActive(link.path) && "text-[#0e0e0f]",
              )}
            >
              {link.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

function UtilityButton({
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
      className="inline-flex h-10 w-10 items-center justify-center border border-[#0e0e0f]/12 bg-white/62 text-[#0e0e0f] transition-colors duration-150 hover:bg-[#efebe3]"
    >
      {children}
    </button>
  );
}

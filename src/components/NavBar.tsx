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
  { match: /^\/$/, label: "Home" },
  { match: /^\/auth/, label: "Enter" },
  { match: /^\/worlds/, label: "World Directory" },
  { match: /^\/play|^\/lobby/, label: "Play Network" },
  { match: /^\/events|^\/tournaments|^\/tournament/, label: "Event Rail" },
  { match: /^\/match|^\/replay/, label: "Live Surface" },
  { match: /^\/docs/, label: "Manual" },
  { match: /^\/workbench/, label: "Workbench" },
  { match: /^\/arena/, label: "Arena" },
  { match: /^\/tutorial/, label: "Learn" },
  { match: /^\/premium/, label: "Support" },
];

export function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();

  const currentLabel =
    ROUTE_LABELS.find((route) => route.match.test(location.pathname))?.label ?? "BOARD";

  const isActive = (path: string) =>
    location.pathname === path || (path !== "/" && location.pathname.startsWith(path));

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 md:px-6">
      <div className="board-page-width mx-auto border border-[#0e0e0f] bg-[#f6f4f0]/90 backdrop-blur-[8px]">
        <div className="flex items-center justify-between gap-4 px-4 py-3 md:px-5">
          <button
            onClick={() => navigate("/")}
            className="shrink-0 text-[#0e0e0f] transition-colors duration-150 hover:text-[#525257]"
            aria-label="Go to home"
          >
            <BoardLogo tone="dark" />
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

          <div className="flex items-center gap-2">
            <StateTag className="hidden md:inline-flex">{currentLabel}</StateTag>
            {user ? (
              <>
                <UtilityButton onClick={() => navigate("/profile")} label="Profile">
                  <User className="h-4 w-4" />
                </UtilityButton>
                <UtilityButton onClick={() => navigate("/workbench")} label="Workbench">
                  <Wrench className="h-4 w-4" />
                </UtilityButton>
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
                className="inline-flex h-10 items-center justify-center border border-[#0e0e0f] bg-[#0e0e0f] px-4 text-[14px] font-medium text-[#f6f4f0] transition-colors duration-150 hover:bg-[#202124]"
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
          <span className="board-rail-label ml-auto whitespace-nowrap text-[11px] tracking-[0.14em] text-[#0e0e0f]">
            {currentLabel}
          </span>
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
      className="inline-flex h-10 w-10 items-center justify-center border border-[#0e0e0f] bg-[#fbfaf8] text-[#0e0e0f] transition-colors duration-150 hover:bg-[#efebe3]"
    >
      {children}
    </button>
  );
}

import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, User, Wrench } from "lucide-react";
import { BoardLogo } from "@/components/BoardLogo";
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
    location.pathname === path ||
    (path !== "/" && location.pathname.startsWith(path));

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-black/10 bg-background/86 text-foreground backdrop-blur-xl">
      <div className="board-page-width mx-auto px-5 md:px-8 lg:px-10">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="transition-opacity hover:opacity-75"
              aria-label="Go to home"
            >
              <BoardLogo tone="dark" />
            </button>
            <div className="hidden min-w-0 border-l border-black/10 pl-4 lg:block">
              <p className="board-rail-label text-[10px]">{isLanding ? "Live board worlds" : currentLabel}</p>
            </div>
          </div>

          <nav className="hidden items-center gap-8 md:flex">
            {PRIMARY_LINKS.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={cn(
                  "relative text-sm font-semibold tracking-[-0.02em] text-muted-foreground transition-colors hover:text-foreground",
                  isActive(link.path) && "text-foreground",
                )}
              >
                {link.label}
                <span
                  className={cn(
                    "absolute -bottom-2 left-0 h-px bg-foreground transition-all duration-300",
                    isActive(link.path) ? "w-full opacity-100" : "w-0 opacity-0",
                  )}
                />
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/docs")}
              className="hidden text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground lg:inline-flex"
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
                    navigate("/auth");
                  }}
                  label="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </IconRailButton>
              </>
            ) : (
              <button
                onClick={() => navigate("/auth")}
                className="clip-stage border border-black bg-black px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1b1c20]"
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        <div className="scrollbar-hide flex gap-5 overflow-x-auto border-t border-black/10 pb-3 pt-2 md:hidden">
          {PRIMARY_LINKS.map((link) => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={cn(
                "whitespace-nowrap text-sm font-semibold text-muted-foreground transition-colors",
                isActive(link.path) && "text-foreground",
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

function IconRailButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-[0.9rem] border border-black/10 bg-white/80 text-foreground transition-colors hover:bg-black hover:text-white"
    >
      {children}
    </button>
  );
}

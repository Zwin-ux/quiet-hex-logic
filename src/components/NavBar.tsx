import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, User, Wrench } from "lucide-react";
import { BoardLogo } from "@/components/BoardLogo";
import { cn } from "@/lib/utils";

const LANDING_LINKS = [
  { label: "Worlds", path: "/lobby" },
  { label: "Events", path: "/tournaments" },
  { label: "Arena", path: "/arena" },
  { label: "Docs", path: "/docs" },
];

const APP_LINKS = [
  { label: "Lobby", path: "/lobby" },
  { label: "Arena", path: "/arena" },
  { label: "Events", path: "/tournaments" },
  { label: "Docs", path: "/docs" },
] as const;

export function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();

  const isLanding = location.pathname === "/";
  const links = isLanding ? LANDING_LINKS : APP_LINKS;

  return (
    <div
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b backdrop-blur-xl",
        isLanding
          ? "border-black/10 bg-[#f5f4ef]/90 text-[#0a0a0a]"
          : "border-border/60 bg-background/85 text-foreground",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <button
          onClick={() => navigate("/")}
          className="transition-opacity hover:opacity-80"
          aria-label="Go to home"
        >
          <BoardLogo tone={isLanding ? "dark" : "light"} />
        </button>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Button
              key={link.path}
              variant="ghost"
              size="sm"
              onClick={() => navigate(link.path)}
              className={cn(
                "rounded-full px-4 text-sm font-semibold",
                isLanding
                  ? "text-[#222] hover:bg-black/5 hover:text-black"
                  : "text-foreground/85 hover:bg-accent",
              )}
            >
              {link.label}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              {isLanding && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/lobby")}
                  className="hidden rounded-full border-black/10 bg-white px-4 font-semibold text-black hover:bg-black/5 md:inline-flex"
                >
                  Open App
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/profile")}
                className={cn(
                  "h-10 w-10 rounded-full",
                  isLanding ? "text-black hover:bg-black/5" : "text-foreground",
                )}
              >
                <User className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/workbench")}
                className={cn(
                  "h-10 w-10 rounded-full",
                  isLanding ? "text-black hover:bg-black/5" : "text-foreground",
                )}
              >
                <Wrench className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  signOut();
                  navigate("/auth");
                }}
                className={cn(
                  "h-10 w-10 rounded-full",
                  isLanding ? "text-black hover:bg-black/5" : "text-foreground",
                )}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              {!isLanding && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/")}
                  className="hidden rounded-full px-4 font-semibold md:inline-flex"
                >
                  Home
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => navigate("/auth")}
                className={cn(
                  "rounded-full px-5 font-semibold shadow-none",
                  isLanding
                    ? "bg-[#0a0a0a] text-white hover:bg-[#1a1a1a]"
                    : "",
                )}
              >
                Sign In
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

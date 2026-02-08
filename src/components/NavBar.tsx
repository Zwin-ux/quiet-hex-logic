import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Trophy, Package, Target, LogOut, User, Crown, Hexagon, Swords, BookOpen, Wrench } from 'lucide-react';

export function NavBar() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  return (
    <div className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 font-display text-xl font-bold hover:text-primary transition-colors"
        >
          <Hexagon className="h-5 w-5 text-game-hex" />
          Hexology
        </button>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => navigate('/lobby')} className="hidden sm:inline-flex text-sm">
            Play
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate('/arena')} className="hidden sm:inline-flex text-sm">
            Arena
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate('/docs')} className="hidden sm:inline-flex text-sm">
            Docs
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate('/leaderboard')} className="hidden sm:inline-flex text-sm">
            Leaderboard
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate('/mods')} className="hidden sm:inline-flex text-sm">
            Mods
          </Button>
          {user && (
            <>
              {[
                { icon: User, path: '/profile' },
                { icon: Swords, path: '/arena', className: 'sm:hidden' },
                { icon: BookOpen, path: '/docs', className: 'sm:hidden' },
                { icon: Trophy, path: '/leaderboard', className: 'sm:hidden' },
                { icon: Package, path: '/mods', className: 'sm:hidden' },
                { icon: Wrench, path: '/workbench' },
                { icon: Target, path: '/puzzles' },
                { icon: Crown, path: '/premium', className: 'text-amber-500' },
              ].map(({ icon: Icon, path, className }) => (
                <Button
                  key={path}
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(path)}
                  className={`h-9 w-9 ${className || ''}`}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              ))}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { signOut(); navigate('/auth'); }}
                className="h-9 w-9 text-muted-foreground"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
          {!user && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/docs')} className="hidden sm:inline-flex text-sm">
                Docs
              </Button>
              <Button onClick={() => navigate('/auth')} size="sm">
                Sign In
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

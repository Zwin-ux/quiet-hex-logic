import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { UserAvatar } from '@/components/UserAvatar';
import { Check } from 'lucide-react';
import { NavBar } from '@/components/NavBar';
import { toast } from 'sonner';

const avatarColors = [
  'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
  'red', 'orange', 'amber', 'yellow', 'lime', 'green',
  'emerald', 'teal', 'cyan', 'sky', 'blue'
] as const;

export default function EditProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarColor, setAvatarColor] = useState<string>('indigo');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    loadProfile();
  }, [user, navigate]);

  const loadProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('username, bio, avatar_color')
      .eq('id', user.id)
      .single();

    if (data) {
      setUsername(data.username);
      setBio(data.bio || '');
      setAvatarColor(data.avatar_color || 'indigo');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: username.trim(),
          bio: bio.trim(),
          avatar_color: avatarColor,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profile updated successfully');
      navigate('/profile');
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="p-4 pt-14">
      {/* Hero Header */}
      <div className="relative bg-gradient-to-br from-indigo/10 via-background to-ochre/10 border-b border-border/50 mb-8 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-[15%] text-5xl opacity-5 animate-float">✏️</div>
          <div className="absolute top-20 right-[10%] text-6xl opacity-5 animate-float" style={{ animationDelay: '1s' }}>🎨</div>
        </div>

        <div className="relative max-w-2xl mx-auto py-8">
          <h1 className="font-body text-5xl font-bold mb-3 bg-gradient-to-br from-indigo via-indigo/80 to-ochre bg-clip-text text-transparent">
            Edit Profile
          </h1>
          <p className="text-muted-foreground font-mono text-lg">Customize your Hexology identity</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Live Preview Card */}
        <div className="mb-8 p-8 bg-gradient-to-br from-indigo/5 via-background to-ochre/5 border border-indigo/20 rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <p className="text-sm text-muted-foreground font-mono mb-4 flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-indigo rounded-full animate-gentle-pulse"></span>
            Live Preview
          </p>
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo to-ochre rounded-full blur-xl opacity-30 animate-gentle-pulse"></div>
              <UserAvatar 
                username={username || 'Player'}
                color={avatarColor}
                size="xl"
                className="relative transition-all duration-300"
              />
            </div>
            <div className="flex-1">
              <h2 className="font-body text-3xl font-bold mb-2 transition-all duration-300">
                {username || 'Your Name'}
              </h2>
              <p className="text-muted-foreground transition-all duration-300">
                {bio || 'Your bio will appear here...'}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 bg-card border border-border/50 rounded-2xl p-8 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
          <div className="space-y-3">
            <Label htmlFor="username" className="text-base font-semibold flex items-center gap-2">
              Username
              <span className="text-xs text-muted-foreground font-normal">(2-24 characters)</span>
            </Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="player_name"
              className="h-12 text-lg transition-all focus:scale-[1.02]"
              required
              minLength={2}
              maxLength={24}
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="bio" className="text-base font-semibold flex items-center gap-2">
              Bio
              <span className="text-xs text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              className="resize-none text-base transition-all focus:scale-[1.01]"
              rows={4}
              maxLength={160}
            />
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground font-mono">
                {bio.length}/160 characters
              </p>
              {bio.length >= 150 && (
                <p className="text-xs text-ochre font-mono animate-gentle-pulse">
                  Almost at limit!
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-base font-semibold block">
              Avatar Color
              <span className="text-sm text-muted-foreground font-normal ml-2">
                Pick your favorite!
              </span>
            </Label>
            <div className="grid grid-cols-6 sm:grid-cols-9 gap-3">
              {avatarColors.map((color, index) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAvatarColor(color)}
                  className="relative aspect-square rounded-xl border-2 hover:scale-110 active:scale-95 transition-all duration-200 group animate-in fade-in zoom-in"
                  style={{
                    borderColor: avatarColor === color ? 'hsl(var(--indigo))' : 'hsl(var(--border))',
                    animationDelay: `${index * 30}ms`,
                    boxShadow: avatarColor === color ? '0 0 20px hsl(var(--indigo) / 0.3)' : 'none'
                  }}
                  title={color.charAt(0).toUpperCase() + color.slice(1)}
                >
                  <UserAvatar 
                    username={username || 'AA'} 
                    color={color} 
                    size="md"
                    className="w-full h-full group-hover:scale-90 transition-transform"
                  />
                  {avatarColor === color && (
                    <div className="absolute -top-1 -right-1 bg-gradient-to-br from-indigo to-ochre rounded-full p-1 animate-in zoom-in duration-200">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground font-mono text-center">
              ✨ Click any color to try it out
            </p>
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              className="flex-1 h-12 text-lg bg-gradient-to-r from-indigo to-ochre hover:from-indigo/90 hover:to-ochre/90 transition-all hover:scale-[1.02] active:scale-95"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="animate-gentle-pulse">Saving...</span>
                </>
              ) : (
                <>
                  <Check className="h-5 w-5 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/profile')}
              className="h-12 px-8 hover:bg-muted transition-all"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
}
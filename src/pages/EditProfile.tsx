import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { UserAvatar } from '@/components/UserAvatar';
import { ArrowLeft, Check } from 'lucide-react';
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
    <div className="min-h-screen bg-paper p-4">
      <div className="max-w-2xl mx-auto py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/profile')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Profile
          </Button>
          <h1 className="font-body text-4xl text-ink mb-2">Edit Profile</h1>
          <p className="text-ink/60">Customize your Hexology identity</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-card border rounded-xl p-6">
          <div>
            <Label htmlFor="username" className="text-ink">Username</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="player_name"
              className="mt-1"
              required
              minLength={2}
              maxLength={24}
            />
          </div>

          <div>
            <Label htmlFor="bio" className="text-ink">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              className="mt-1 resize-none"
              rows={3}
              maxLength={160}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {bio.length}/160 characters
            </p>
          </div>

          <div>
            <Label className="text-ink mb-3 block">Avatar Color</Label>
            <div className="grid grid-cols-6 sm:grid-cols-9 gap-3">
              {avatarColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAvatarColor(color)}
                  className="relative aspect-square rounded-lg border-2 hover:scale-110 transition-transform"
                  style={{
                    borderColor: avatarColor === color ? 'var(--primary)' : 'var(--border)'
                  }}
                >
                  <UserAvatar 
                    username={username || 'AA'} 
                    color={color} 
                    size="md"
                    className="w-full h-full"
                  />
                  {avatarColor === color && (
                    <div className="absolute -top-1 -right-1 bg-primary rounded-full p-0.5">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              type="submit"
              variant="hero"
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/profile')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
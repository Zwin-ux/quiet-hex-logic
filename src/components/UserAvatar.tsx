import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from 'lucide-react';

interface UserAvatarProps {
  username?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  imageUrl?: string | null;
  discordId?: string | null;
  discordAvatar?: string | null;
}

const colorClasses = {
  indigo: 'bg-indigo-500 text-white',
  violet: 'bg-violet-500 text-white',
  purple: 'bg-purple-500 text-white',
  fuchsia: 'bg-fuchsia-500 text-white',
  pink: 'bg-pink-500 text-white',
  rose: 'bg-rose-500 text-white',
  red: 'bg-red-500 text-white',
  orange: 'bg-orange-500 text-white',
  amber: 'bg-amber-500 text-white',
  yellow: 'bg-yellow-500 text-gray-900',
  lime: 'bg-lime-500 text-gray-900',
  green: 'bg-green-500 text-white',
  emerald: 'bg-emerald-500 text-white',
  teal: 'bg-teal-500 text-white',
  cyan: 'bg-cyan-500 text-gray-900',
  sky: 'bg-sky-500 text-white',
  blue: 'bg-blue-500 text-white',
  discord: 'bg-[#5865F2] text-white',
};

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl',
};

export function UserAvatar({ 
  username, 
  color = 'indigo', 
  size = 'md', 
  className = '',
  imageUrl,
  discordId,
  discordAvatar,
}: UserAvatarProps) {
  const colorClass = colorClasses[color as keyof typeof colorClasses] || colorClasses.indigo;
  const sizeClass = sizeClasses[size];
  
  // Build Discord avatar URL if available
  const discordAvatarUrl = discordId && discordAvatar 
    ? `https://cdn.discordapp.com/avatars/${discordId}/${discordAvatar}.png?size=128`
    : null;
  const avatarSrc = imageUrl || discordAvatarUrl;

  return (
    <Avatar className={`${sizeClass} border-2 border-border ${className}`}>
      {avatarSrc && (
        <AvatarImage 
          src={avatarSrc} 
          alt={username || 'User avatar'}
          className="object-cover"
        />
      )}
      <AvatarFallback className={colorClass}>
        {username ? username.slice(0, 2).toUpperCase() : <User className="h-4 w-4" />}
      </AvatarFallback>
    </Avatar>
  );
}

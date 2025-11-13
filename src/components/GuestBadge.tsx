import { UserCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface GuestBadgeProps {
  username: string;
}

export function GuestBadge({ username }: GuestBadgeProps) {
  return (
    <Badge variant="outline" className="gap-1.5 bg-violet/10 border-violet/30 text-violet hover:bg-violet/20">
      <UserCircle className="h-3.5 w-3.5" />
      <span className="text-xs">{username}</span>
    </Badge>
  );
}

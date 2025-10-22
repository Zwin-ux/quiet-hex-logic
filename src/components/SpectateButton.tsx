import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SpectateButtonProps {
  matchId: string;
}

export const SpectateButton = ({ matchId }: SpectateButtonProps) => {
  const navigate = useNavigate();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => navigate(`/match/${matchId}`)}
      className="gap-1.5 h-8 text-xs font-medium hover:bg-ochre/10 hover:text-ochre hover:border-ochre transition-colors"
    >
      <Eye className="h-3.5 w-3.5" />
      Spectate
    </Button>
  );
};

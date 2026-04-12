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
      className="h-8 gap-1.5"
    >
      <Eye className="h-3.5 w-3.5" />
      Spectate
    </Button>
  );
};

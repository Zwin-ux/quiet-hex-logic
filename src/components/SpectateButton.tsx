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
      className="gap-2"
    >
      <Eye className="h-4 w-4" />
      Spectate
    </Button>
  );
};

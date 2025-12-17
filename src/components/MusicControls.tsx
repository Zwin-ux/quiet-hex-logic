import { Music, Volume2, VolumeX, Volume1 } from 'lucide-react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

interface MusicControlsProps {
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  onToggleMusic: () => void;
  onToggleMute: () => void;
  onVolumeChange: (volume: number) => void;
}

export function MusicControls({
  isPlaying,
  volume,
  isMuted,
  onToggleMusic,
  onToggleMute,
  onVolumeChange,
}: MusicControlsProps) {
  const VolumeIcon = isMuted || volume === 0 
    ? VolumeX 
    : volume < 0.5 
    ? Volume1 
    : Volume2;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={isPlaying ? "default" : "outline"}
          size="sm"
          className="gap-2"
        >
          <Music className={`h-4 w-4 ${isPlaying ? 'animate-pulse' : ''}`} />
          <span className="hidden sm:inline">Music</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Ambient Music</span>
            <Button
              variant={isPlaying ? "default" : "outline"}
              size="sm"
              onClick={onToggleMusic}
            >
              {isPlaying ? 'Stop' : 'Play'}
            </Button>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Volume</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onToggleMute}
              >
                <VolumeIcon className="h-4 w-4" />
              </Button>
            </div>
            <Slider
              value={[isMuted ? 0 : volume * 100]}
              max={100}
              step={1}
              onValueChange={([v]) => onVolumeChange(v / 100)}
              disabled={!isPlaying}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>{Math.round((isMuted ? 0 : volume) * 100)}%</span>
              <span>100%</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Procedural ambient soundscape to enhance your gaming experience.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

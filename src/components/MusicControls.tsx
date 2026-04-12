import { Music, Volume1, Volume2, VolumeX } from "lucide-react";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

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
  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant={isPlaying ? "success" : "outline"} size="sm" className="gap-2">
          <Music className="h-4 w-4" />
          <span className="hidden sm:inline">Audio</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <div className="retro-window__body !m-0 !bg-white">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="board-rail-label">Room audio</p>
                <p className="mt-2 text-sm text-black">Ambient bed for long sessions.</p>
              </div>
              <Button variant={isPlaying ? "success" : "outline"} size="sm" onClick={onToggleMusic}>
                {isPlaying ? "Stop" : "Play"}
              </Button>
            </div>

            <div className="space-y-3 border-t border-black pt-4">
              <div className="flex items-center justify-between">
                <span className="board-rail-label">Volume</span>
                <Button variant="quiet" size="icon" className="h-8 w-8" onClick={onToggleMute}>
                  <VolumeIcon className="h-4 w-4" />
                </Button>
              </div>
              <Slider
                value={[isMuted ? 0 : volume * 100]}
                max={100}
                step={1}
                onValueChange={([value]) => onVolumeChange(value / 100)}
                disabled={!isPlaying}
                className="w-full"
              />
              <div className="retro-status-strip justify-between bg-[#e8e8e8] px-3 py-2">
                <span>Level</span>
                <span>{Math.round((isMuted ? 0 : volume) * 100)}%</span>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

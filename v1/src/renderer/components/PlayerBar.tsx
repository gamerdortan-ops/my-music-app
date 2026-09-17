import * as React from 'react';
import { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Maximize2 } from 'lucide-react';

interface PlayerBarProps {
  isPlaying: boolean;
  togglePlay: () => void;
  trackTitle?: string;
  trackArtist?: string;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  isPlaying,
  togglePlay,
  trackTitle = "No Track Selected",
  trackArtist = "Unknown Artist"
}) => {
  const [volume, setVolume] = useState<number>(80);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);

  // Simulated slider track timeline movement for styling visualization
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((prev) => (prev >= 100 ? 0 : prev + 0.5));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className="w-full h-20 bg-zinc-900 border-t border-zinc-800 px-6 flex items-center justify-between text-white select-none z-10">
      
      {/* Left Section: Track Information metadata */}
      <div className="flex items-center w-1/4 min-w-[180px]">
        <div className="w-12 h-12 bg-zinc-800 rounded-md border border-zinc-700 flex items-center justify-center mr-3 flex-shrink-0 shadow-md">
          <div className="w-6 h-6 rounded-full border-2 border-dashed border-zinc-600 animate-spin [animation-duration:12s]" />
        </div>
        <div className="truncate">
          <h4 className="text-sm font-semibold truncate text-zinc-100">{trackTitle}</h4>
          <p className="text-xs text-zinc-400 truncate mt-0.5">{trackArtist}</p>
        </div>
      </div>

      {/* Middle Section: Media Controls & Timeline Sliders */}
      <div className="flex flex-col items-center flex-1 max-w-xl px-4">
        {/* Playback Buttons */}
        <div className="flex items-center gap-5 mb-1.5">
          <button className="text-zinc-400 hover:text-white transition-colors" title="Previous">
            <SkipBack className="w-5 h-5 fill-current" />
          </button>
          
          <button 
            onClick={togglePlay}
            className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current text-black" />
            ) : (
              <Play className="w-4 h-4 fill-current text-black translate-x-0.5" />
            )}
          </button>

          <button className="text-zinc-400 hover:text-white transition-colors" title="Next">
            <SkipForward className="w-5 h-5 fill-current" />
          </button>
        </div>

        {/* Dynamic Track Progress Timeline Bar */}
        <div className="w-full flex items-center gap-3 text-xs text-zinc-400">
          <span>0:00</span>
          <div className="flex-1 h-1 bg-zinc-700 rounded-full relative group cursor-pointer">
            <div 
              className="h-full bg-purple-500 rounded-full group-hover:bg-purple-400 transition-colors" 
              style={{ width: `${progress}%` }}
            />
            <div 
              className="absolute w-3 h-3 bg-white rounded-full border border-purple-600 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `calc(${progress}% - 6px)` }}
            />
          </div>
          <span>3:30</span>
        </div>
      </div>

      {/* Right Section: Volume Slider & Layout Extras */}
      <div className="flex items-center justify-end gap-3 w-1/4 min-w-[180px]">
        <button 
          onClick={() => setIsMuted(!isMuted)} 
          className="text-zinc-400 hover:text-white transition-colors"
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="w-4 h-4 text-red-400" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </button>

        {/* Volume Sliders */}
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={isMuted ? 0 : volume} 
          onChange={(e) => {
            setVolume(Number(e.target.value));
            if(isMuted) setIsMuted(false);
          }}
          className="w-24 accent-purple-500 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer range-sm"
          title="Volume Control"
        />

        <div className="w-px h-4 bg-zinc-800 mx-2" />
        
        <button className="text-zinc-400 hover:text-white transition-colors" title="Fullscreen Visualizer">
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};

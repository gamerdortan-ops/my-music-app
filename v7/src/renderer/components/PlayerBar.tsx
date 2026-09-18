import * as React from 'react';
import { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Maximize2 } from 'lucide-react';

interface PlayerBarProps {
  onNext: () => void;
  onPrev: () => void;
  tracks: any[];
  isPlaying: boolean;
  currentTrack: string | null;
  currentTime: number;
  duration: number;
  volume: number;
  onPlayToggle: () => void;
  onSeek: (timeInSeconds: number) => void;
  onVolumeChange: (value: number) => void;
}

const formatTimeHelper = (secs: number): string => {
  if (!secs || isNaN(secs) || secs < 0) return "0:00";
  const minutes = Math.floor(secs / 60);
  const seconds = Math.floor(secs % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

export const PlayerBar: React.FC<PlayerBarProps> = ({
  onNext,
  onPrev,
  tracks = [],
  isPlaying,
  currentTrack,
  currentTime,
  duration,
  volume,
  onPlayToggle,
  onSeek,
  onVolumeChange
}) => {
  const [preMuteVolume, setPreMuteVolume] = useState<number>(0.8);
  const [trackMetadata, setTrackMetadata] = useState({ title: "No Track Selected", artist: "Unknown Artist" });

  useEffect(() => {
    if (!currentTrack) {
      setTrackMetadata({ title: "No Track Selected", artist: "Unknown Artist" });
      return;
    }
    const filename = currentTrack.split('/').pop() || currentTrack.split('\\').pop() || "";
    const cleanFilename = filename.replace(/\.[^/.]+\$/, "");
    const matchedSong = tracks.find(t => (t.file_path || t.path) === currentTrack);
    
    setTrackMetadata({
      title: matchedSong?.title || cleanFilename,
      artist: matchedSong?.artist || "Unknown Artist"
    });
  }, [currentTrack, tracks]);

  const isMuted = volume === 0;
  const sliderValue = Math.round(volume * 100);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handlePlayToggle = () => {
    onPlayToggle();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = Number(e.target.value) / 100;
    onVolumeChange(newVol);
  };

  const handleMuteToggle = () => {
    if (isMuted) {
      onVolumeChange(preMuteVolume > 0 ? preMuteVolume : 0.8);
    } else {
      setPreMuteVolume(volume);
      onVolumeChange(0);
    }
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(percentage * duration);
  };

  return (
    <div className="w-full h-20 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl px-6 flex items-center justify-between text-white select-none z-10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
      
      {/* Left Info Column */}
      <div className="flex items-center w-1/4 min-w-[200px]">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-xl border border-white/10 flex items-center justify-center mr-3 flex-shrink-0 relative overflow-hidden">
          <div className={`w-6 h-6 rounded-full border-2 border-dashed border-cyan-400 ${isPlaying ? 'animate-spin [animation-duration:12s] drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]' : 'opacity-60'}`} />
        </div>
        <div className="truncate">
          <h4 className="text-sm font-bold truncate text-white tracking-wide">{trackMetadata.title}</h4>
          <p className="text-xs text-white/50 truncate mt-0.5 font-medium">{trackMetadata.artist}</p>
        </div>
      </div>

      {/* Center Media Controls */}
      <div className="flex flex-col items-center flex-1 max-w-xl px-4">
        <div className="flex items-center gap-6 mb-1">
          <button onClick={onPrev} className="text-white/60 hover:text-cyan-400 transition-all cursor-pointer" title="Previous">
            <SkipBack className="w-5 h-5 fill-current" />
          </button>
          
          <button 
            onClick={handlePlayToggle}
            className="w-9 h-9 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(168,85,247,0.4)] cursor-pointer"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current translate-x-0.5" />}
          </button>

          <button onClick={onNext} className="text-white/60 hover:text-cyan-400 transition-all cursor-pointer" title="Next">
            <SkipForward className="w-5 h-5 fill-current" />
          </button>
        </div>

        {/* Timeline Sliders */}
        <div className="w-full flex items-center gap-3 text-[11px] text-white/50 font-semibold">
          <span className="w-10 text-left font-mono tabular-nums">{formatTimeHelper(currentTime)}</span>
          <div onClick={handleProgressBarClick} className="flex-1 py-3 group cursor-pointer relative flex items-center">
            <div className="w-full h-1 bg-white/10 rounded-full relative flex items-center">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.6)]" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <span className="w-10 text-right font-mono tabular-nums">{formatTimeHelper(duration)}</span>
        </div>
      </div>

      {/* Right Volume Adjustments */}
      <div className="flex items-center justify-end gap-3 w-1/4 min-w-[200px]">
        <button onClick={handleMuteToggle} className="text-white/60 hover:text-white transition-colors p-1 cursor-pointer">
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
        </button>
        <input 
          type="range" min="0" max="100" value={sliderValue} 
          onChange={handleVolumeChange}
          className="w-20 accent-cyan-400 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
        />
        <div className="w-px h-4 bg-white/10 mx-1" />
        <button className="text-white/60 hover:text-cyan-400 transition-colors cursor-pointer" title="Fullscreen Visualizer">
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};

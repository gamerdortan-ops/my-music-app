import * as React from 'react';
import { Music, Clock, Play } from 'lucide-react';

interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number;
  file_path: string;
}

interface TrackListProps {
  tracks: Track[];
  currentTrackId: string | null;
  onTrackSelect: (filePath: string) => void;
}

export const TrackList: React.FC<TrackListProps> = ({ tracks, currentTrackId, onTrackSelect }) => {
  const formatTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className="w-full h-full p-6 text-white overflow-y-auto custom-scrollbar bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
      <div className="mb-6">
        <h2 className="text-xl font-black text-white tracking-wide">My Library</h2>
        <p className="text-xs text-white/40 font-medium mt-0.5">{tracks.length} tracks indexed locally</p>
      </div>

      {tracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border border-dashed border-white/10 rounded-2xl p-8 text-center bg-black/10">
          <Music className="w-8 h-8 text-white/20 mb-3" />
          <p className="text-sm text-white/60 font-semibold">Your library is currently empty</p>
          <p className="text-xs text-white/30 mt-1 max-w-xs leading-relaxed">
            Click the plus icon on the sidebar to map media directory folders from your storage disks!
          </p>
        </div>
      ) : (
        <div className="w-full flex flex-col">
          <div className="flex items-center text-[10px] font-bold text-white/40 uppercase tracking-widest pb-3 border-b border-white/10 px-4">
            <span className="w-8">#</span>
            <span className="flex-1">Title</span>
            <span className="w-48 hidden md:block">Artist</span>
            <span className="w-16 text-right"><Clock className="w-3.5 h-3.5 inline" /></span>
          </div>

          <div className="space-y-1.5 mt-3">
            {tracks.map((track, index) => {
              const isCurrent = currentTrackId === track.file_path;
              
              return (
                <div
                  key={track.id}
                  onClick={() => onTrackSelect(track.file_path)}
                  className={`flex items-center group px-4 py-3 rounded-xl text-sm transition-all duration-200 cursor-pointer ${
                    isCurrent 
                      ? 'bg-gradient-to-r from-purple-500/20 to-cyan-500/10 border border-purple-500/30 text-cyan-400 font-semibold shadow-[0_0_15px_rgba(168,85,247,0.1)]' 
                      : 'hover:bg-white/5 text-white/60 hover:text-white border border-transparent'
                  }`}
                >
                  <span className="w-8 font-mono text-xs text-white/30 group-hover:text-cyan-400">
                    <span className="group-hover:hidden">{index + 1}</span>
                    <Play className="w-3.5 h-3.5 hidden group-hover:inline fill-current text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.6)]" />
                  </span>

                  <div className="flex-1 truncate pr-4">
                    <span className={`block truncate text-xs font-medium ${isCurrent ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]' : 'text-white/80'}`}>
                      {track.title}
                    </span>
                  </div>

                  <span className="w-48 truncate hidden md:block text-xs text-white/50 group-hover:text-white/70">
                    {track.artist}
                  </span>

                  <span className="w-16 text-right text-white/40 font-mono text-xs group-hover:text-white/60">
                    {formatTime(track.duration)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

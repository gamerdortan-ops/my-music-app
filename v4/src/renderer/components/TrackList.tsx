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
  
  // Formats seconds into human-readable time (e.g. 200 -> 3:20)
  const formatTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className="w-full h-full p-6 text-zinc-200 overflow-y-auto custom-scrollbar bg-zinc-950/20">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white tracking-wide">My Library</h2>
        <p className="text-xs text-zinc-500 mt-1">{tracks.length} tracks indexed locally</p>
      </div>

      {tracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border border-dashed border-zinc-800 rounded-xl p-8 text-center">
          <Music className="w-10 h-10 text-zinc-600 mb-3" />
          <p className="text-sm text-zinc-400 font-medium">Your library is currently empty</p>
          <p className="text-xs text-zinc-600 mt-1 max-w-xs">
            Click the "Select Music Folder" button on the sidebar to scan your hard drive for MP3s!
          </p>
        </div>
      ) : (
        <div className="w-full flex flex-col">
          {/* Table Headers */}
          <div className="flex items-center text-xs font-semibold text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-800 px-4">
            <span className="w-8">#</span>
            <span className="flex-1">Title</span>
            <span className="w-48 hidden md:block">Artist</span>
            <span className="w-16 text-right"><Clock className="w-3.5 h-3.5 inline" /></span>
          </div>

          {/* Table Dynamic Rows */}
          <div className="space-y-1 mt-2">
            {tracks.map((track, index) => {
              const isCurrent = currentTrackId === track.file_path;
              
              return (
                <div
                  key={track.id}
                  onDoubleClick={() => onTrackSelect(track.file_path)}
                  className={`flex items-center group px-4 py-3 rounded-lg text-sm transition-all cursor-pointer ${
                    isCurrent 
                      ? 'bg-purple-950/40 border border-purple-900/50 text-purple-400 font-medium' 
                      : 'hover:bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-transparent'
                  }`}
                >
                  {/* Row index or play hover shortcut indicator */}
                  <span className="w-8 font-medium text-zinc-600 group-hover:text-purple-400">
                    <span className="group-hover:hidden">{index + 1}</span>
                    <Play className="w-3.5 h-3.5 hidden group-hover:inline fill-current text-purple-400" />
                  </span>

                  {/* Title & Path */}
                  <div className="flex-1 truncate pr-4">
                    <span className={`block truncate ${isCurrent ? 'text-purple-400' : 'text-zinc-200'}`}>
                      {track.title}
                    </span>
                  </div>

                  {/* Artist */}
                  <span className="w-48 truncate hidden md:block text-zinc-400 group-hover:text-zinc-300">
                    {track.artist}
                  </span>

                  {/* Length time conversion */}
                  <span className="w-16 text-right text-zinc-500 font-mono text-xs">
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

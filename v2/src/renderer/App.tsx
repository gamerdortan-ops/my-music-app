import * as React from 'react';
import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Visualizer } from './components/Visualizer';
import { PlayerBar } from './components/PlayerBar';
import { TrackList } from './components/TrackList';
import { useAudio } from './hooks/useAudio';

export const App: React.FC = () => {
  const {
    isPlaying,
    currentTrack,
    currentTime,
    duration,
    playTrack,
    togglePlay,
    seek,
    changeOutputDevice,
    getByteFrequencyData
  } = useAudio();

  const [activeDeviceId, setActiveDeviceId] = useState<string | null>('default');
  const [tracks, setTracks] = useState<any[]>([]); // 👈 FIXED: Typed as array fallback structure []
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);

  // Sync rows from SQLite database
  const fetchSongsFromDB = async () => {
    if (window.electronAPI) {
      try {
        const data = await window.electronAPI.getSongs();
        const folder = await window.electronAPI.getSelectedFolder();
        
        setTracks(Array.isArray(data) ? data : []); // 👈 FIXED: Proper fallback brackets
        setCurrentFolder(folder);
      } catch (err) {
        console.error("Failed to sync library contents:", err);
      }
    }
  };

  useEffect(() => {
    fetchSongsFromDB();

    if (window.electronAPI?.onLibraryUpdate) {
      window.electronAPI.onLibraryUpdate(() => {
        fetchSongsFromDB(); 
      });
    }

    return () => {
      window.electronAPI?.removeLibraryListener();
    };
  }, []); // 👈 FIXED: Added execution brackets

  const handleDeviceChange = async (deviceId: string) => {
    setActiveDeviceId(deviceId);
    await changeOutputDevice(deviceId);
  };

  const handleFolderSelect = async () => {
    if (window.electronAPI?.selectMusicFolder) {
      const selected = await window.electronAPI.selectMusicFolder();
      if (selected) {
        await fetchSongsFromDB(); 
      }
    }
  };

  const activeTrackDetails = tracks.find(t => t.file_path === currentTrack);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-950 font-sans select-none antialiased">
      <div className="flex flex-1 w-full overflow-hidden">
        
        {/* Left Side Panel Frame */}
        <Sidebar 
          activeDeviceId={activeDeviceId} 
          onDeviceChange={handleDeviceChange}
          currentFolder={currentFolder} 
          onFolderSelect={handleFolderSelect} 
        />

        {/* Middle Library Grid Column */}
        <section className="flex-1 max-w-xl h-full border-r border-zinc-900 bg-zinc-950/40">
          <TrackList 
            tracks={tracks}
            currentTrackId={currentTrack}
            onTrackSelect={playTrack}
          />
        </section>

        {/* Right Side Visualizer Stage */}
        <main className="flex-2 h-full flex flex-col items-center justify-center relative overflow-hidden bg-zinc-950">
          <Visualizer 
            isPlaying={isPlaying} 
            getByteFrequencyData={getByteFrequencyData} 
          />
        </main>

      </div>

      {/* Bottom Timeline Media Controller Strip */}
      <PlayerBar 
        isPlaying={isPlaying} 
        togglePlay={togglePlay}
        currentTime={currentTime}
        duration={duration}
        onSeek={seek}
        trackTitle={activeTrackDetails ? activeTrackDetails.title : "No Track Selected"}
        trackArtist={activeTrackDetails ? activeTrackDetails.artist : "Unknown Artist"}
      />
    </div>
  );
};

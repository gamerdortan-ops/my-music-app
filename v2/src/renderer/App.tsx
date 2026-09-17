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
    volume,
    playTrack,
    togglePlay,
    seek,
    changeVolume,
    changeOutputDevice,
    getByteFrequencyData
  } = useAudio();

  const [activeDeviceId, setActiveDeviceId] = useState<string | null>('default');
  const [tracks, setTracks] = useState<any[]>([]); // Initialized as proper array structure
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);

  // Sync rows from SQLite database
  const fetchSongsFromDB = async () => {
    if (window.electronAPI) {
      try {
        const data = await window.electronAPI.getSongs();
        const folder = await window.electronAPI.getSelectedFolder();
        
        setTracks(Array.isArray(data) ? data : []); 
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
  }, []); 

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

  // ──> NEW: SKIP NEXT CALCULATION LAYER
  const handleNextTrack = () => {
    if (tracks.length === 0) return;
    
    // Find where the active song sits in the library order array
    const currentIndex = tracks.findIndex(t => t.file_path === currentTrack);
    
    // If no song is loaded or it's the absolute last item, loop back around to index 0
    if (currentIndex === -1 || currentIndex === tracks.length - 1) {
      playTrack(tracks[0].file_path);
    } else {
      playTrack(tracks[currentIndex + 1].file_path);
    }
  };

  // ──> NEW: SKIP PREVIOUS CALCULATION LAYER
  const handlePrevTrack = () => {
    if (tracks.length === 0) return;
    
    const currentIndex = tracks.findIndex(t => t.file_path === currentTrack);
    
    // If no song is loaded or it's the very first item, warp back to the tail end track item
    if (currentIndex === -1 || currentIndex === 0) {
      playTrack(tracks[tracks.length - 1].file_path);
    } else {
      playTrack(tracks[currentIndex - 1].file_path);
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
        volume={volume}
        onVolumeChange={changeVolume}
        onNext={handleNextTrack} // 👈 PASSED THE NEXT TRACK HANDLER
        onPrev={handlePrevTrack} // 👈 PASSED THE PREV TRACK HANDLER
        trackTitle={activeTrackDetails ? activeTrackDetails.title : "No Track Selected"}
        trackArtist={activeTrackDetails ? activeTrackDetails.artist : "Unknown Artist"}
      />
    </div>
  );
};

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Visualizer } from './components/Visualizer';
import { PlayerBar } from './components/PlayerBar';
import { TrackList } from './components/TrackList';
import { useAudio } from './hooks/useAudio';
import { Equalizer } from './components/Equalizer';

export const App: React.FC = () => {
  const {
    isPlaying,
    currentTrack,
    playTrack,
    changeOutputDevice,
    getByteFrequencyData
  } = useAudio();

  const [activeDeviceId, setActiveDeviceId] = useState<string | null>('default');
  const [tracks, setTracks] = useState<any[]>([]); 
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);

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

  const handleNextTrack = () => {
    if (tracks.length === 0) return;
    const currentIndex = tracks.findIndex(t => (t.file_path || t.path) === currentTrack);
    
    if (currentIndex === -1 || currentIndex === tracks.length - 1) {
      const nextSong = tracks[0];
      playTrack(nextSong.file_path || nextSong.path);
    } else {
      const nextSong = tracks[currentIndex + 1];
      playTrack(nextSong.file_path || nextSong.path);
    }
  };

  const handlePrevTrack = () => {
    if (tracks.length === 0) return;
    const currentIndex = tracks.findIndex(t => (t.file_path || t.path) === currentTrack);
    
    if (currentIndex === -1 || currentIndex === 0) {
      const prevSong = tracks[tracks.length - 1];
      playTrack(prevSong.file_path || prevSong.path);
    } else {
      const prevSong = tracks[currentIndex - 1];
      playTrack(prevSong.file_path || prevSong.path);
    }
  };

  return (
    // Outer structure must be bg-transparent to display the global gradient mesh layer
    <div className="flex flex-col h-screen w-screen overflow-hidden font-sans select-none antialiased bg-transparent p-4 gap-4">
      
      {/* Top Half Workspace Panels */}
      <div className="flex flex-1 w-full overflow-hidden items-stretch gap-4">
        
        {/* Panel A: Nav System */}
        <Sidebar 
          activeDeviceId={activeDeviceId} 
          onDeviceChange={handleDeviceChange}
          currentFolder={currentFolder} 
          onFolderSelect={handleFolderSelect} 
        />

        {/* Panel B: Center Playlist */}
        <section className="flex-1 h-full overflow-hidden">
          <TrackList 
            tracks={tracks}
            currentTrackId={currentTrack}
            onTrackSelect={playTrack}
          />
        </section>

        {/* Panel C: Audio Output Dials */}
        <main className="w-96 h-full flex flex-col gap-4 overflow-hidden box-border">
          
          <div className="flex-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] flex items-center justify-center w-full relative overflow-hidden">
            <Visualizer 
              isPlaying={isPlaying} 
              getByteFrequencyData={getByteFrequencyData} 
              tracks={tracks}
            />
          </div>

          <div className="w-full">
            <Equalizer />
          </div>

        </main>

      </div>

      {/* Bottom Half: Player Strip Deck */}
      <PlayerBar 
        onNext={handleNextTrack}
        onPrev={handlePrevTrack}
        tracks={tracks}
      />
    </div>
  );
};

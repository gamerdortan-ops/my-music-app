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
    currentTime,
    duration,
    volume,
    playTrack,
    togglePlay,
    seek,
    changeVolume,
    getByteFrequencyData
  } = useAudio();

  const [activeDeviceId, setActiveDeviceId] = useState<string | null>('default');
  const [tracks, setTracks] = useState<any[]>([]); 
  const [currentFolders, setCurrentFolders] = useState<string[]>([]);

  const fetchSongsFromDB = async () => {
    if (window.electronAPI && typeof window.electronAPI.getSongs === 'function') {
      try {
        const data = await window.electronAPI.getSongs();
        const folders = await window.electronAPI.getSelectedFolder();
        
        setTracks(Array.isArray(data) ? data : []); 
        setCurrentFolders(Array.isArray(folders) ? folders : folders ? [folders] : []);
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

  const handleDeviceChange = (deviceId: string) => {
    setActiveDeviceId(deviceId);
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
    if (!tracks || tracks.length === 0) return;
    const currentIndex = tracks.findIndex(t => (t.file_path || t.path) === currentTrack);
    
    let nextSong = tracks[0];
    if (currentIndex !== -1 && currentIndex < tracks.length - 1) {
      nextSong = tracks[currentIndex + 1];
    }
    
    if (nextSong) {
      playTrack(nextSong.file_path || nextSong.path);
    }
  };

  const handlePrevTrack = () => {
    if (!tracks || tracks.length === 0) return;
    const currentIndex = tracks.findIndex(t => (t.file_path || t.path) === currentTrack);
    
    let prevSong = tracks[tracks.length - 1];
    if (currentIndex > 0) {
      prevSong = tracks[currentIndex - 1];
    }
    
    if (prevSong) {
      playTrack(prevSong.file_path || prevSong.path);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden font-sans select-none antialiased bg-transparent p-4 gap-4">
      
      {/* Upper Workspace Window Slots */}
      <div className="flex flex-1 w-full overflow-hidden items-stretch gap-4">
        
        <Sidebar 
          activeDeviceId={activeDeviceId} 
          onDeviceChange={handleDeviceChange}
          currentFolders={currentFolders} 
          onFolderSelect={handleFolderSelect}
          onFolderRemoved={fetchSongsFromDB}
        />

        <section className="flex-1 h-full overflow-hidden">
          <TrackList 
            tracks={tracks}
            currentTrackId={currentTrack}
            onTrackSelect={playTrack}
          />
        </section>

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

      {/* Floating Bottom Media Bar Controller */}
      <PlayerBar 
        onNext={handleNextTrack}
        onPrev={handlePrevTrack}
        tracks={tracks}
        isPlaying={isPlaying}
        currentTrack={currentTrack}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        onPlayToggle={togglePlay}
        onSeek={seek}
        onVolumeChange={changeVolume}
      />
    </div>
  );
};

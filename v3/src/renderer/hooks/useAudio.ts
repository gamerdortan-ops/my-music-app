import { useState, useEffect, useRef } from 'react';

// Single global HTML5 instance inside frontend sandbox
const sandboxedAudioPlayer = new Audio();
// UNLOCK CORS BLOCKS FOR WEB AUDIO VISUALIZER ANALYZERS
sandboxedAudioPlayer.crossOrigin = "anonymous";

export const useAudio = () => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTrack, setCurrentTrack] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(0.8);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  useEffect(() => {
    const player = sandboxedAudioPlayer;

    const handleTimeUpdate = () => setCurrentTime(player.currentTime);
    const handleDurationChange = () => setDuration(player.duration || 0);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    player.addEventListener('timeupdate', handleTimeUpdate);
    player.addEventListener('durationchange', handleDurationChange);
    player.addEventListener('play', handlePlay);
    player.addEventListener('pause', handlePause);
    player.addEventListener('ended', handleEnded);

    return () => {
      player.removeEventListener('timeupdate', handleTimeUpdate);
      player.removeEventListener('durationchange', handleDurationChange);
      player.removeEventListener('play', handlePlay);
      player.removeEventListener('pause', handlePause);
      player.removeEventListener('ended', handleEnded);
    };
  }, []);

  const playTrack = async (filePath: string) => {
    setCurrentTrack(filePath);
    
    // Formatting paths to absolute URI syntax: track://localhost/C:/Music/song.mp3
    const cleanPath = filePath.replace(/\\/g, '/');
    sandboxedAudioPlayer.src = `track://localhost/${cleanPath}`;
    sandboxedAudioPlayer.volume = volume;
    
    try {
      await sandboxedAudioPlayer.play();
    } catch (err) {
      console.error("Secure Sandbox Player failed to stream track source:", err);
    }
  };


  const togglePlay = async () => {
    if (sandboxedAudioPlayer.paused) {
      await sandboxedAudioPlayer.play().catch(() => {});
    } else {
      sandboxedAudioPlayer.pause();
    }
  };

  const seek = async (timeInSeconds: number) => {
    if (!isNaN(timeInSeconds)) {
      sandboxedAudioPlayer.currentTime = timeInSeconds;
      setCurrentTime(timeInSeconds);
    }
  };

  const changeVolume = async (value: number) => {
    const safeVolume = Math.max(0, Math.min(1, value));
    sandboxedAudioPlayer.volume = safeVolume;
    setVolumeState(safeVolume);
  };

  const changeOutputDevice = async (deviceId: string) => {
    if (window.electronAPI?.switchNativeDevice) {
      await window.electronAPI.switchNativeDevice(deviceId);
      if ('setSinkId' in sandboxedAudioPlayer) {
        try {
          await (sandboxedAudioPlayer as any).setSinkId(deviceId);
        } catch (err) {
          console.warn("Chromium hardware block setSinkId bypass handling active.", err);
        }
      }
    }
  };

  const getByteFrequencyData = (): Uint8Array | null => {
    if (!isPlaying) return null;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        
        sourceRef.current = audioContextRef.current.createMediaElementSource(sandboxedAudioPlayer);
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
      }

      if (analyserRef.current) {
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);
        return dataArray;
      }
    } catch (e) {
      // Audio nodes busy fallback handler
    }
    return null;
  };

  return {
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
  };
};

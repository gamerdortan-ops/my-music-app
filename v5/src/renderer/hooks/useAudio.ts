import { useState, useEffect } from 'react';

// ──> CRITICAL FIX: Move Audio Player and Web Audio API Nodes to Global Scope
const sandboxedAudioPlayer = new Audio();
sandboxedAudioPlayer.crossOrigin = "anonymous";

let globalAudioContext: AudioContext | null = null;
let globalSourceNode: MediaElementAudioSourceNode | null = null;
let globalAnalyserNode: AnalyserNode | null = null;

let globalBassFilter: BiquadFilterNode | null = null;
let globalMidFilter: BiquadFilterNode | null = null;
let globalTrebleFilter: BiquadFilterNode | null = null;

// Track the live filter gain states globally across all components
let currentBassDb = 0;
let currentMidDb = 0;
let currentTrebleDb = 0;

export const useAudio = () => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTrack, setCurrentTrack] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(0.8);

  // Expose states to make the UI sliders match up reactively
  const [bass, setBassState] = useState<number>(currentBassDb);
  const [mid, setMidState] = useState<number>(currentMidDb);
  const [treble, setTrebleState] = useState<number>(currentTrebleDb);

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

  // Wire up the single, global music equalizer pipeline safely
  const initAudioEngineChain = () => {
    if (globalAudioContext) return;

    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    globalAudioContext = ctx;

    // 1. Create Media Element Source
    globalSourceNode = ctx.createMediaElementSource(sandboxedAudioPlayer);

    // 2. Setup Low-Shelf Bass Node (< 200Hz)
    globalBassFilter = ctx.createBiquadFilter();
    globalBassFilter.type = 'lowshelf';
    globalBassFilter.frequency.value = 200;
    globalBassFilter.gain.value = currentBassDb;

    // 3. Setup Vocal Peaking Mid Node (~ 1000Hz)
    globalMidFilter = ctx.createBiquadFilter();
    globalMidFilter.type = 'peaking';
    globalMidFilter.frequency.value = 1000;
    globalMidFilter.Q.value = 1.0;
    globalMidFilter.gain.value = currentMidDb;

    // 4. Setup High-Shelf Sparkle Treble Node (> 4000Hz)
    globalTrebleFilter = ctx.createBiquadFilter();
    globalTrebleFilter.type = 'highshelf';
    globalTrebleFilter.frequency.value = 4000;
    globalTrebleFilter.gain.value = currentTrebleDb;

    // 5. Setup Visualization Spectrum Analyzer
    globalAnalyserNode = ctx.createAnalyser();
    globalAnalyserNode.fftSize = 256;

    // 🔗 LINK THE CHAIN ONCE: Player -> Bass -> Mid -> Treble -> Analyser -> Speakers
    globalSourceNode.connect(globalBassFilter);
    globalBassFilter.connect(globalMidFilter);
    globalMidFilter.connect(globalTrebleFilter);
    globalTrebleFilter.connect(globalAnalyserNode);
    globalAnalyserNode.connect(ctx.destination);
  };

  const playTrack = async (filePath: string) => {
    setCurrentTrack(filePath);
    initAudioEngineChain(); 

    if (globalAudioContext && globalAudioContext.state === 'suspended') {
      await globalAudioContext.resume();
    }

    const cleanPath = filePath.replace(/\\/g, '/');
    sandboxedAudioPlayer.src = `track://localhost/${cleanPath}`;
    sandboxedAudioPlayer.volume = volume;
    
    try {
      await sandboxedAudioPlayer.play();
    } catch (err) {
      console.error("Playback failed inside frontend sandbox:", err);
    }
  };

  const togglePlay = async () => {
    if (sandboxedAudioPlayer.paused) {
      if (globalAudioContext?.state === 'suspended') await globalAudioContext.resume();
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

  // 🎛️ Real-Time Filters referencing the exact same global node maps
  const changeBass = (dB: number) => {
    currentBassDb = dB;
    setBassState(dB);
    if (globalBassFilter) globalBassFilter.gain.value = dB;
  };

  const changeMid = (dB: number) => {
    currentMidDb = dB;
    setMidState(dB);
    if (globalMidFilter) globalMidFilter.gain.value = dB;
  };

  const changeTreble = (dB: number) => {
    currentTrebleDb = dB;
    setTrebleState(dB);
    if (globalTrebleFilter) globalTrebleFilter.gain.value = dB;
  };

  const changeOutputDevice = async (deviceLabel: string) => {
    if (window.electronAPI?.switchNativeDevice) {
      await window.electronAPI.switchNativeDevice(deviceLabel);
    }
  };

  const getByteFrequencyData = (): Uint8Array | null => {
    if (!isPlaying || !globalAnalyserNode) return null;
    const bufferLength = globalAnalyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    globalAnalyserNode.getByteFrequencyData(dataArray);
    return dataArray;
  };

  return {
    isPlaying,
    currentTrack,
    currentTime,
    duration,
    volume,
    bass,
    mid,
    treble,
    playTrack,
    togglePlay,
    seek,
    changeVolume,
    changeBass,
    changeMid,
    changeTreble,
    changeOutputDevice,
    getByteFrequencyData
  };
};

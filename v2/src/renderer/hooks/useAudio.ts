import { useState, useEffect, useRef } from 'react';

export const useAudio = () => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTrack, setCurrentTrack] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Initialize audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.preload = "auto";
    audioRef.current = audio;

    audio.style.display = 'none';
    document.body.appendChild(audio);

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);

    const handleMetadata = () => {
      if (!isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleMetadata); // ✅ fixed
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
      if (document.body.contains(audio)) {
        document.body.removeChild(audio);
      }
    };
  }, []);

  const initAudioEngine = () => {
    if (!audioContextRef.current && audioRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const analyser = ctx.createAnalyser();

      analyser.fftSize = 256;

      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(ctx.destination);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;
    }
  };

  const playTrack = async (filePath: string) => {
    if (!audioRef.current) return;

    try {
      initAudioEngine();

      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      let cleanPath = filePath.replace(/^atom:\/\//, '');
      if (cleanPath.startsWith('/')) {
        cleanPath = cleanPath.slice(1);
      }

      setCurrentTime(0);
      setDuration(0);

      audioRef.current.src = `atom://${cleanPath}`;
      audioRef.current.load(); // ✅ force metadata load
      setCurrentTrack(filePath);

      await audioRef.current.play();
      setIsPlaying(true);
    } catch (error) {
      console.error("Playback failed inside useAudio system hook:", error);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current || !currentTrack) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  const seek = (timeInSeconds: number) => {
    if (!audioRef.current || !currentTrack || isNaN(timeInSeconds)) return;
    audioRef.current.currentTime = timeInSeconds;
    setCurrentTime(timeInSeconds);
  };

  const changeOutputDevice = async (deviceId: string) => {
    if (audioRef.current && 'setSinkId' in audioRef.current) {
      try {
        await (audioRef.current as any).setSinkId(deviceId);
        console.log(`Audio output routed successfully to device: ${deviceId}`);
      } catch (err) {
        console.error("Failed to switch audio output hardware target:", err);
      }
    }
  };

  const getByteFrequencyData = (): Uint8Array | null => {
    if (!analyserRef.current) return null;
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);
    return dataArray;
  };

  return {
    isPlaying,
    currentTrack,
    currentTime,
    duration,
    playTrack,
    togglePlay,
    seek,
    changeOutputDevice,
    getByteFrequencyData
  };
};

import { useState, useEffect, useRef } from 'react';

export const useAudio = () => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTrack, setCurrentTrack] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(80); // percent 0–100

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.preload = "auto";
    audioRef.current = audio;

    audio.style.display = 'none';
    document.body.appendChild(audio);

    const handleTimeUpdate = () => {
      console.log("⏱ timeupdate:", audio.currentTime);
      setCurrentTime(audio.currentTime);
    };

    const handleMetadata = () => {
      console.log("📀 loadedmetadata, duration:", audio.duration);
      if (!isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      console.log("🔚 ended");
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleMetadata);
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
      console.log("▶️ setting src:", audioRef.current.src);
      audioRef.current.load(); // force metadata load
      setCurrentTrack(filePath);

      // apply current volume
      audioRef.current.volume = volume / 100;

      await audioRef.current.play();
      console.log("🎶 playback started");
      setIsPlaying(true);
    } catch (error) {
      console.error("Playback failed inside useAudio:", error);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current || !currentTrack) return;

    if (isPlaying) {
      audioRef.current.pause();
      console.log("⏸ paused");
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        console.log("▶️ resumed");
      }).catch(console.error);
      setIsPlaying(true);
    }
  };

  const seek = (timeInSeconds: number) => {
    if (!audioRef.current || !currentTrack || isNaN(timeInSeconds)) return;
    console.log("⏩ seeking to:", timeInSeconds);
    audioRef.current.currentTime = timeInSeconds;
    setCurrentTime(timeInSeconds);
  };

  const changeVolume = (newVolume: number) => {
    if (!audioRef.current) return;
    const normalized = Math.max(0, Math.min(1, newVolume / 100));
    audioRef.current.volume = normalized;
    setVolume(newVolume);
    console.log("🔊 volume set:", newVolume, "%");
  };

  const changeOutputDevice = async (deviceId: string) => {
    if (!audioRef.current) {
      console.warn("⚠️ No audio element available");
      return;
    }

    if (!('setSinkId' in audioRef.current)) {
      console.warn("⚠️ setSinkId not supported in this environment");
      return;
    }

    try {
      console.log("🔄 Attempting to switch audio output to:", deviceId);

      if (audioRef.current.src && audioRef.current.paused) {
        console.log("   Audio paused, resuming before swap...");
        await audioRef.current.play();
      }

      await (audioRef.current as any).setSinkId(deviceId);
      console.log(`✅ Audio output routed successfully to device: ${deviceId}`);
    } catch (err: any) {
      console.error("❌ Failed to swap audio hardware output target:", err.name, err.message);
      if (err.name === "AbortError") {
        console.error("👉 AbortError usually means the OS/driver rejected this deviceId.");
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
    volume,
    playTrack,
    togglePlay,
    seek,
    changeVolume,
    changeOutputDevice,
    getByteFrequencyData
  };
};

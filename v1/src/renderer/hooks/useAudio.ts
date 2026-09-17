import { useState, useEffect, useRef } from 'react';

export const useAudio = () => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTrack, setCurrentTrack] = useState<string | null>(null);
  
  // Persistent web audio contexts references
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Initialize the native HTML5 Audio element once
  useEffect(() => {
    audioRef.current = new Audio();
    // Enable cross-origin resource sharing if files are streamed locally via custom protocols
    audioRef.current.crossOrigin = "anonymous"; 

    return () => {
      audioRef.current?.pause();
    };
  }, []);

  // Setup Web Audio API Context when the user hits play for the first time
  const initAudioEngine = () => {
    if (!audioContextRef.current && audioRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const analyser = ctx.createAnalyser();
      
      // Fast Fourier Transform (FFT) size: determines frequency resolution
      // Higher means finer detail (e.g., 2048), lower means faster performance (e.g., 256 or 512)
      analyser.fftSize = 256; 
      
      // Connect the HTML5 audio source node directly into the frequency analyser
      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      // Route the analyser out to the system speakers
      analyser.connect(ctx.destination);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;
    }
  };

  // Play a song via its local file system URL path pointer
    const playTrack = async (filePath: string) => {
    if (!audioRef.current) return;

    try {
      initAudioEngine();
      
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // FIXED: Remove custom protocol prefixes if they accidentally leak, 
      // then clean up leading forward slashes so the backend gets an absolute string
      let cleanPath = filePath.replace(/^atom:\/\//, '');
      cleanPath = cleanPath.replace(/^\//, '');
      
      // Inject path parameters cleanly
      audioRef.current.src = `atom://${cleanPath}`; 
      
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

  // Switch hardware output audio device IDs (e.g., Headphones, External Speakers)
  const changeOutputDevice = async (deviceId: string) => {
    if (audioRef.current && 'setSinkId' in audioRef.current) {
      try {
        await (audioRef.current as any).setSinkId(deviceId);
        console.log(`Audio output routed successfully to device: ${deviceId}`);
      } catch (err) {
        console.error("Failed to switch audio output hardware target:", err);
      }
    } else {
      console.warn("Audio output routing (setSinkId) is not supported in this environment configuration.");
    }
  };

  // Get raw real-time frequency numbers array data to feed into the visualizer UI
  const getByteFrequencyData = (): Uint8Array | null => {
    if (!analyserRef.current) return null;
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);
    return dataArray; // Contains values ranging from 0 (silent) to 255 (loudest max frequency hit)
  };

  return {
    isPlaying,
    currentTrack,
    playTrack,
    togglePlay,
    changeOutputDevice,
    getByteFrequencyData
  };
};

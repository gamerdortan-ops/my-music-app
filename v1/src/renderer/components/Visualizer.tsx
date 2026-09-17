import * as React from 'react';
import { useEffect, useRef } from 'react';

interface VisualizerProps {
  isPlaying: boolean;
  getByteFrequencyData: () => Uint8Array | null;
}

export const Visualizer: React.FC<VisualizerProps> = ({ isPlaying, getByteFrequencyData }) => {
  // 1. These two lines MUST be here to fix the red lines on "ref={...}"
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glowContainerRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const renderFrame = () => {
      const dataArray = getByteFrequencyData();
      
      if (dataArray && isPlaying) {
        const bufferLength = dataArray.length;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let bassSum = 0;
        const bassRange = 5; 
        for (let i = 0; i < bassRange; i++) {
          bassSum += dataArray[i];
        }
        const averageBass = bassSum / bassRange;
        const intensity = averageBass / 255;

        // Apply glow to the reference element
        if (glowContainerRef.current) {
          const blurRadius = 20 + intensity * 60;
          const glowColor = `rgba(168, 85, 247, ${0.2 + intensity * 0.6})`;
          glowContainerRef.current.style.boxShadow = `0 0 ${blurRadius}px ${glowColor}`;
          glowContainerRef.current.style.transform = `scale(${1 + intensity * 0.04})`;
        }

        // Canvas drawing block
        const barWidth = (canvas.width / bufferLength) * 1.5;
        let barHeight;
        let x = 0;

                for (let i = 0; i < bufferLength; i++) {
          barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
          const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
          gradient.addColorStop(0, '#3b82f6'); 
          gradient.addColorStop(1, '#a855f7'); 

          ctx.fillStyle = gradient;
          ctx.beginPath();
          
          // FIXED: Cast ctx to 'any' for both branches to prevent the 'never' type inference error
          const safeCtx = ctx as any;
          if ('roundRect' in safeCtx) {
            safeCtx.roundRect(x, canvas.height - barHeight, barWidth - 2, barHeight, 4);
          } else {
            safeCtx.rect(x, canvas.height - barHeight, barWidth - 2, barHeight);
          }
          
          ctx.fill();
          x += barWidth;
        }

      } else {
        if (glowContainerRef.current) {
          glowContainerRef.current.style.boxShadow = '0 0 20px rgba(168, 85, 247, 0.15)';
          glowContainerRef.current.style.transform = 'scale(1)';
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      animationRef.current = requestAnimationFrame(renderFrame);
    };

    renderFrame();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, getByteFrequencyData]);

  // This is the HTML return block you posted
  return (
    <div className="flex flex-col items-center justify-center flex-1 w-full h-full p-8 bg-zinc-950 text-white">
      {/* The Glow Disc Container - holds album art and pulses to the track rhythm */}
      <div 
        ref={glowContainerRef}
        className="w-64 h-64 mb-12 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center transition-transform duration-75 ease-out"
      >
        <div className="w-60 h-60 rounded-full bg-zinc-900 flex items-center justify-center overflow-hidden border border-zinc-800">
          {isPlaying ? (
            <span className="text-zinc-400 text-sm font-medium tracking-wider animate-pulse">PLAYING NOW</span>
          ) : (
            <span className="text-zinc-500 text-sm font-medium tracking-wider">PAUSED</span>
          )}
        </div>
      </div>

      {/* Audio Waveform Canvas overlay */}
      <div className="w-full max-w-2xl h-32">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
    </div>
  );
};

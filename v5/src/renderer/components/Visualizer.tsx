import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useAudio } from '../hooks/useAudio';

interface VisualizerProps {
  isPlaying: boolean;
  getByteFrequencyData: () => Uint8Array | null;
  tracks?: any;
}

interface Particle {
  x: number;
  y: number;
  angle: number;
  speed: number;
  size: number;
  alpha: number;
  color: string;
}

export const Visualizer: React.FC<VisualizerProps> = ({ isPlaying, getByteFrequencyData, tracks = [] }) => {
  const { bass, currentTrack } = useAudio();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  
  const rotationAngleRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const [albumArtImage, setAlbumArtImage] = useState<HTMLImageElement | null>(null);

  // Persistent array to cache smoothed height tracking rows
  const smoothedHeightsRef = useRef<number[]>(new Array(120).fill(0));

  useEffect(() => {
    if (!currentTrack || !tracks.length) {
      setAlbumArtImage(null);
      return;
    }
    const currentActiveSong = tracks.find((t: any) => (t.file_path || t.path) === currentTrack);
    if (currentActiveSong?.thumbnail || currentActiveSong?.album_art) {
      const img = new Image();
      img.src = currentActiveSong.thumbnail || currentActiveSong.album_art;
      img.onload = () => setAlbumArtImage(img);
      img.onerror = () => setAlbumArtImage(null);
    } else {
      setAlbumArtImage(null);
    }
  }, [currentTrack, tracks]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 550;
    canvas.height = 550;

    const renderVisualizerEngine = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      const eqMultiplier = Math.max(0.5, 1 + (bass / 12));
      let baseRadius = 95 * eqMultiplier;

      let frequencyData = getByteFrequencyData();
      
      if (!frequencyData || !isPlaying) {
        frequencyData = new Uint8Array(128);
        for (let i = 0; i < frequencyData.length; i++) {
          frequencyData[i] = Math.sin(Date.now() * 0.003 + i * 0.15) * 6 + 6;
        }
      }

      // ──> HIGH-VELOCITY BASS CALCULATION PIPELINE
      // Targets the absolute lowest sub-bass frequency bars (slots 0 to 3)
      let bassSum = 0;
      const bassBins = Math.min(4, frequencyData.length);
      for (let i = 0; i < bassBins; i++) {
        bassSum += frequencyData[i];
      }
      const bassIntensity = (bassSum / bassBins) / 255;
      
      // 💥 EXAGGERATED CORE BULGE: Amplified multiplier makes the whole center jump violently
      const currentBulge = Math.pow(bassIntensity, 1.5) * 55 * eqMultiplier;
      baseRadius += currentBulge;

      // Spawning exploding spark fields matching bass punch speeds
      if (isPlaying) {
        rotationAngleRef.current += 0.004 + (bassIntensity * 0.025);
        const particlesToSpawn = bassIntensity > 0.3 ? Math.floor(bassIntensity * 6) : 1;
        for (let p = 0; p < particlesToSpawn; p++) {
          if (particlesRef.current.length < 160) {
            const randomAngle = Math.random() * Math.PI * 2;
            particlesRef.current.push({
              x: centerX + Math.cos(randomAngle) * baseRadius,
              y: centerY + Math.sin(randomAngle) * baseRadius,
              angle: randomAngle,
              // Particles fire outward much faster on heavy drum beats
              speed: 1.5 + Math.random() * 2 + (Math.pow(bassIntensity, 2) * 12),
              size: 1 + Math.random() * 3,
              alpha: 1,
              color: Math.random() > 0.5 ? '#06b6d4' : '#d946ef'
            });
          }
        }
      }

      // Draw active sparks
      ctx.save();
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const particle = particlesRef.current[i];
        particle.x += Math.cos(particle.angle) * particle.speed;
        particle.y += Math.sin(particle.angle) * particle.speed;
        particle.alpha -= 0.018;

        if (particle.alpha <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${particle.color === '#06b6d4' ? '6, 182, 212' : '217, 70, 239'}, ${particle.alpha})`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = particle.color;
        ctx.fill();
      }
      ctx.restore();

      // ──> SMOOTH YET EXPLOSIVE 180° MIRROR MATRIX
            // ──> LAYER B: INVERTED SILKY 180° MIRROR MATRIX (Top to Bottom Flow)
      const pointsCount = 65;
      const rightHalfPoints: { x: number; y: number }[] = [];
      const leftHalfPoints: { x: number; y: number }[] = [];

      for (let i = 0; i < pointsCount; i++) {
        // 💥 CRITICAL ROTATION INVERSION: Changed starting baseline to -Math.PI / 2
        // This anchors the base path at the absolute top center, forcing spikes to explode UPWARD!
        const angle = -Math.PI / 2 + (i / (pointsCount - 1)) * Math.PI;
        
        const rawMagnitude = frequencyData[i] || 0;
        const targetWaveHeight = Math.pow(rawMagnitude / 255, 1.5) * 130 * eqMultiplier;

        if (smoothedHeightsRef.current[i] === undefined) smoothedHeightsRef.current[i] = 0;
        smoothedHeightsRef.current[i] = (smoothedHeightsRef.current[i] * 0.45) + (targetWaveHeight * 0.55);
        
        const smoothHeight = smoothedHeightsRef.current[i];
        const currentRadius = baseRadius + smoothHeight;

        // Trace the Right Half curve (Top Center -> Down to Bottom Center)
        rightHalfPoints.push({
          x: centerX + Math.cos(angle) * currentRadius,
          y: centerY + Math.sin(angle) * currentRadius
        });

        // Trace the Left Half curve (Mirrored perfectly on the opposite horizontal axis)
        leftHalfPoints.push({
          x: centerX - Math.cos(angle) * currentRadius,
          y: centerY + Math.sin(angle) * currentRadius
        });
      }

      const waveChain: { x: number; y: number }[] = [];
      // Combine paths: Top to Bottom down the right edge...
      for (let i = 0; i < pointsCount; i++) waveChain.push(rightHalfPoints[i]);
      // ...then crawl back up from Bottom to Top along the left edge.
      for (let i = pointsCount - 1; i >= 0; i--) waveChain.push(leftHalfPoints[i]);
      waveChain.push(rightHalfPoints[0]);


      // Draw Quadratic Bezier neon rope path
      ctx.save();
      ctx.shadowBlur = 30 + (bassIntensity * 55) * eqMultiplier;
      ctx.shadowColor = 'rgba(217, 70, 239, 0.9)';

      ctx.beginPath();
      ctx.moveTo(waveChain[0].x, waveChain[0].y);
      for (let i = 0; i < waveChain.length - 1; i++) {
        const currentPoint = waveChain[i];
        const nextPoint = waveChain[i + 1];
        const midPointX = (currentPoint.x + nextPoint.x) / 2;
        const midPointY = (currentPoint.y + nextPoint.y) / 2;
        ctx.quadraticCurveTo(currentPoint.x, currentPoint.y, midPointX, midPointY);
      }
      ctx.closePath();

      const gradient = ctx.createRadialGradient(centerX, centerY, baseRadius - 20, centerX, centerY, baseRadius + 110);
      gradient.addColorStop(0, '#f43f5e'); 
      gradient.addColorStop(0.4, '#d946ef'); 
      gradient.addColorStop(1, '#06b6d4'); 

      ctx.lineWidth = 5.5;
      ctx.strokeStyle = gradient;
      ctx.stroke();
      ctx.restore();

      // ──> LAYER D: CLIP INNER ALBUM IMAGE TARGET
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius - 3, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip(); 

      if (albumArtImage) {
        ctx.drawImage(albumArtImage, centerX - baseRadius, centerY - baseRadius, baseRadius * 2, baseRadius * 2);
      } else {
        ctx.fillStyle = '#09090b';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius - 3, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.25)';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      ctx.restore();

      if (!albumArtImage) {
        ctx.fillStyle = isPlaying ? '#a855f7' : '#52525b';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.letterSpacing = '5px';
        ctx.fillText(isPlaying ? 'AUDIO LIVE' : 'PAUSED', centerX + 2, centerY);
      }

      // Outer Gold Frame Accent Ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius - 3, 0, Math.PI * 2);
      ctx.strokeStyle = '#f59e0b'; 
      ctx.lineWidth = 3.5;
      ctx.stroke();

      animationRef.current = requestAnimationFrame(renderVisualizerEngine);
    };

    animationRef.current = requestAnimationFrame(renderVisualizerEngine);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, getByteFrequencyData, bass, albumArtImage]);

  return (
    <div className="flex flex-col items-center justify-center relative w-full h-full min-h-[400px] box-border">
      <canvas 
        ref={canvasRef} 
        className="w-[440px] h-[440px] drop-shadow-[0_0_60px_rgba(168,85,247,0.2)]"
      />
    </div>
  );
};

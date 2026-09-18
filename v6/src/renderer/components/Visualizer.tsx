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
  hue: number;
}

export const Visualizer: React.FC<VisualizerProps> = ({
  isPlaying,
  getByteFrequencyData,
  tracks = [],
}) => {
  const { bass, currentTrack } = useAudio();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  const rotationRef = useRef(0);
  const pulseRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);

  const [albumArtImage, setAlbumArtImage] =
    useState<HTMLImageElement | null>(null);

  const [ambientGlowColor, setAmbientGlowColor] =
    useState<string>('rgba(139, 92, 246, 0.18)');

  /*
   * ------------------------------------------------------------
   * ALBUM ART
   * ------------------------------------------------------------
   */

  useEffect(() => {
    if (!currentTrack || !tracks.length) {
      setAlbumArtImage(null);
      setAmbientGlowColor('rgba(139, 92, 246, 0.18)');
      return;
    }

    const currentActiveSong = tracks.find(
      (t: any) => (t.file_path || t.path) === currentTrack
    );

    if (currentActiveSong?.thumbnail || currentActiveSong?.album_art) {
      const img = new Image();

      img.crossOrigin = 'anonymous';
      img.src =
        currentActiveSong.thumbnail ||
        currentActiveSong.album_art;

      img.onload = () => {
        setAlbumArtImage(img);

        try {
          const sampleCanvas = document.createElement('canvas');
          const sampleCtx = sampleCanvas.getContext('2d');

          if (sampleCtx) {
            sampleCanvas.width = 10;
            sampleCanvas.height = 10;

            sampleCtx.drawImage(img, 0, 0, 10, 10);

            const pixelData = sampleCtx
              .getImageData(5, 5, 1, 1)
              .data;

            setAmbientGlowColor(
              `rgba(${pixelData[0]}, ${pixelData[1]}, ${pixelData[2]}, 0.20)`
            );
          }
        } catch {
          setAmbientGlowColor(
            'rgba(139, 92, 246, 0.18)'
          );
        }
      };

      img.onerror = () => {
        setAlbumArtImage(null);
      };
    } else {
      setAlbumArtImage(null);
      setAmbientGlowColor(
        'rgba(139, 92, 246, 0.18)'
      );
    }
  }, [currentTrack, tracks]);

  /*
   * ------------------------------------------------------------
   * VISUALIZER
   * ------------------------------------------------------------
   */

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const SIZE = 500;

    canvas.width = SIZE;
    canvas.height = SIZE;

    const centerX = SIZE / 2;
    const centerY = SIZE / 2;

    /*
     * Smooth helper
     */
    const lerp = (
      current: number,
      target: number,
      amount: number
    ) => {
      return current + (target - current) * amount;
    };

    /*
     * Rounded line helper
     */
    const drawRoundedLine = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      width: number,
      color: string
    ) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);

      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.strokeStyle = color;

      ctx.stroke();
    };

    /*
     * ----------------------------------------------------------
     * MAIN RENDER LOOP
     * ----------------------------------------------------------
     */

    const render = () => {
      ctx.clearRect(0, 0, SIZE, SIZE);

      let frequencyData = getByteFrequencyData();

      /*
       * Idle animation
       */
      if (!frequencyData || !isPlaying) {
        frequencyData = new Uint8Array(96);

        const time = Date.now() * 0.0015;

        for (let i = 0; i < frequencyData.length; i++) {
          frequencyData[i] =
            14 +
            Math.sin(time + i * 0.25) * 7;
        }
      }

      /*
       * --------------------------------------------------------
       * AUDIO ANALYSIS
       * --------------------------------------------------------
       */

      let bassSum = 0;

      const bassBins = Math.min(
        6,
        frequencyData.length
      );

      for (let i = 0; i < bassBins; i++) {
        bassSum += frequencyData[i];
      }

      const bassIntensity =
        (bassSum / bassBins) / 255;

      const totalBass =
        Math.pow(bassIntensity, 1.35);

      /*
       * Smooth bass pulse
       */
      pulseRef.current = lerp(
        pulseRef.current,
        totalBass,
        0.16
      );

      const pulse = pulseRef.current;

      /*
       * Rotation
       */
      rotationRef.current +=
        isPlaying
          ? 0.0018 + bassIntensity * 0.009
          : 0.0005;

      /*
       * --------------------------------------------------------
       * AMBIENT GLOW
       * --------------------------------------------------------
       */

      const glowRadius =
        175 + pulse * 75;

      const ambientGradient =
        ctx.createRadialGradient(
          centerX,
          centerY,
          20,
          centerX,
          centerY,
          glowRadius
        );

      ambientGradient.addColorStop(
        0,
        'rgba(168, 85, 247, 0.18)'
      );

      ambientGradient.addColorStop(
        0.45,
        'rgba(6, 182, 212, 0.07)'
      );

      ambientGradient.addColorStop(
        1,
        'rgba(0, 0, 0, 0)'
      );

      ctx.fillStyle = ambientGradient;

      ctx.beginPath();
      ctx.arc(
        centerX,
        centerY,
        glowRadius,
        0,
        Math.PI * 2
      );

      ctx.fill();

      /*
       * --------------------------------------------------------
       * ROTATING OUTER ORBITS
       * --------------------------------------------------------
       */

      ctx.save();

      ctx.translate(centerX, centerY);
      ctx.rotate(rotationRef.current);

      const orbitRadii = [
        176,
        184,
        192,
      ];

      orbitRadii.forEach((radius, index) => {
        ctx.beginPath();

        ctx.arc(
          0,
          0,
          radius + pulse * (index * 5),
          0,
          Math.PI * 2
        );

        ctx.strokeStyle =
          index === 0
            ? 'rgba(139, 92, 246, 0.20)'
            : index === 1
            ? 'rgba(6, 182, 212, 0.12)'
            : 'rgba(217, 70, 239, 0.08)';

        ctx.lineWidth =
          index === 0 ? 1.5 : 1;

        ctx.stroke();
      });

      ctx.restore();

      /*
       * --------------------------------------------------------
       * AUDIO HALO
       * --------------------------------------------------------
       *
       * 72 bars around the complete circle.
       */

      const bars = 72;

      const innerRadius =
        138 + pulse * 12;

      const maxBarLength =
        55 + pulse * 45;

      for (let i = 0; i < bars; i++) {
        /*
         * Use mirrored frequency data so the
         * visualizer feels symmetrical.
         */
        const frequencyIndex =
          Math.floor(
            (i / bars) *
              Math.min(64, frequencyData.length)
          );

        const raw =
          frequencyData[frequencyIndex] || 0;

        const normalized =
          raw / 255;

        /*
         * Add subtle smoothing based on
         * neighboring frequencies.
         */
        const next =
          frequencyData[
            Math.min(
              frequencyIndex + 1,
              frequencyData.length - 1
            )
          ] || 0;

        const average =
          (raw + next) / 2;

        const level =
          Math.pow(average / 255, 0.72);

        const barLength =
          5 + level * maxBarLength;

        const angle =
          (i / bars) *
            Math.PI *
            2 -
          Math.PI / 2 +
          rotationRef.current;

        const startRadius =
          innerRadius;

        const endRadius =
          innerRadius + barLength;

        const x1 =
          centerX +
          Math.cos(angle) *
            startRadius;

        const y1 =
          centerY +
          Math.sin(angle) *
            startRadius;

        const x2 =
          centerX +
          Math.cos(angle) *
            endRadius;

        const y2 =
          centerY +
          Math.sin(angle) *
            endRadius;

        /*
         * Cyan -> purple -> pink
         */
        const hue =
          190 +
          (i / bars) * 150;

        /*
         * Stronger bars get brighter
         */
        const alpha =
          0.30 + level * 0.70;

        const color =
          `hsla(${hue}, 95%, ${62 + level * 18}%, ${alpha})`;

        /*
         * Glow only on stronger frequencies
         */
        if (level > 0.35) {
          ctx.shadowBlur =
            8 + level * 14;

          ctx.shadowColor = color;
        } else {
          ctx.shadowBlur = 0;
        }

        drawRoundedLine(
          x1,
          y1,
          x2,
          y2,
          3 + level * 2.5,
          color
        );
      }

      ctx.shadowBlur = 0;

      /*
       * --------------------------------------------------------
       * PARTICLES
       * --------------------------------------------------------
       */

      if (isPlaying) {
        const spawnCount =
          bassIntensity > 0.42 ? 3 : 1;

        for (
          let i = 0;
          i < spawnCount;
          i++
        ) {
          if (
            particlesRef.current.length <
            90
          ) {
            const angle =
              Math.random() *
              Math.PI *
              2;

            particlesRef.current.push({
              x:
                centerX +
                Math.cos(angle) *
                  (innerRadius + 25),

              y:
                centerY +
                Math.sin(angle) *
                  (innerRadius + 25),

              angle,

              speed:
                0.5 +
                Math.random() * 1.8 +
                bassIntensity * 4,

              size:
                0.8 +
                Math.random() * 2,

              alpha: 0.8,

              hue:
                180 +
                Math.random() * 160,
            });
          }
        }
      }

      for (
        let i =
          particlesRef.current.length - 1;
        i >= 0;
        i--
      ) {
        const particle =
          particlesRef.current[i];

        particle.x +=
          Math.cos(particle.angle) *
          particle.speed;

        particle.y +=
          Math.sin(particle.angle) *
          particle.speed;

        particle.alpha -= 0.012;

        if (
          particle.alpha <= 0
        ) {
          particlesRef.current.splice(
            i,
            1
          );

          continue;
        }

        ctx.beginPath();

        ctx.arc(
          particle.x,
          particle.y,
          particle.size,
          0,
          Math.PI * 2
        );

        const particleColor =
          `hsla(${particle.hue}, 95%, 65%, ${particle.alpha})`;

        ctx.fillStyle =
          particleColor;

        ctx.shadowBlur = 8;
        ctx.shadowColor =
          particleColor;

        ctx.fill();
      }

      ctx.shadowBlur = 0;

      /*
       * --------------------------------------------------------
       * ALBUM ART CORE
       * --------------------------------------------------------
       */

      const coreRadius =
        112 +
        pulse * 14;

      /*
       * Outer core glow
       */
      const coreGlow =
        ctx.createRadialGradient(
          centerX,
          centerY,
          coreRadius * 0.65,
          centerX,
          centerY,
          coreRadius + 35
        );

      coreGlow.addColorStop(
        0,
        'rgba(139, 92, 246, 0.10)'
      );

      coreGlow.addColorStop(
        0.7,
        'rgba(6, 182, 212, 0.04)'
      );

      coreGlow.addColorStop(
        1,
        'rgba(0, 0, 0, 0)'
      );

      ctx.fillStyle = coreGlow;

      ctx.beginPath();

      ctx.arc(
        centerX,
        centerY,
        coreRadius + 35,
        0,
        Math.PI * 2
      );

      ctx.fill();

      /*
       * Album art clipping circle
       */
      ctx.save();

      ctx.beginPath();

      ctx.arc(
        centerX,
        centerY,
        coreRadius,
        0,
        Math.PI * 2
      );

      ctx.clip();

      if (albumArtImage) {
        /*
         * Cover image
         */
        ctx.drawImage(
          albumArtImage,
          centerX - coreRadius,
          centerY - coreRadius,
          coreRadius * 2,
          coreRadius * 2
        );

        /*
         * Dark cinematic overlay
         */
        const imageOverlay =
          ctx.createLinearGradient(
            centerX - coreRadius,
            centerY - coreRadius,
            centerX + coreRadius,
            centerY + coreRadius
          );

        imageOverlay.addColorStop(
          0,
          'rgba(0, 0, 0, 0.04)'
        );

        imageOverlay.addColorStop(
          0.5,
          'rgba(0, 0, 0, 0)'
        );

        imageOverlay.addColorStop(
          1,
          'rgba(0, 0, 0, 0.35)'
        );

        ctx.fillStyle =
          imageOverlay;

        ctx.fillRect(
          centerX - coreRadius,
          centerY - coreRadius,
          coreRadius * 2,
          coreRadius * 2
        );
      } else {
        /*
         * No artwork
         */
        const emptyGradient =
          ctx.createRadialGradient(
            centerX,
            centerY,
            10,
            centerX,
            centerY,
            coreRadius
          );

        emptyGradient.addColorStop(
          0,
          '#18121f'
        );

        emptyGradient.addColorStop(
          0.6,
          '#0b0b12'
        );

        emptyGradient.addColorStop(
          1,
          '#050507'
        );

        ctx.fillStyle =
          emptyGradient;

        ctx.fillRect(
          centerX - coreRadius,
          centerY - coreRadius,
          coreRadius * 2,
          coreRadius * 2
        );
      }

      ctx.restore();

      /*
       * --------------------------------------------------------
       * CORE RINGS
       * --------------------------------------------------------
       */

      /*
       * Inner white highlight
       */
      ctx.beginPath();

      ctx.arc(
        centerX,
        centerY,
        coreRadius - 1,
        0,
        Math.PI * 2
      );

      ctx.strokeStyle =
        'rgba(255, 255, 255, 0.14)';

      ctx.lineWidth = 1;

      ctx.stroke();

      /*
       * Neon outer ring
       */
      const ringGradient =
        ctx.createLinearGradient(
          centerX - coreRadius,
          centerY - coreRadius,
          centerX + coreRadius,
          centerY + coreRadius
        );

      ringGradient.addColorStop(
        0,
        '#06b6d4'
      );

      ringGradient.addColorStop(
        0.45,
        '#8b5cf6'
      );

      ringGradient.addColorStop(
        1,
        '#ec4899'
      );

      ctx.beginPath();

      ctx.arc(
        centerX,
        centerY,
        coreRadius + 5 + pulse * 3,
        0,
        Math.PI * 2
      );

      ctx.strokeStyle =
        ringGradient;

      ctx.lineWidth =
        2 + pulse * 2;

      ctx.shadowBlur =
        10 + pulse * 15;

      ctx.shadowColor =
        '#8b5cf6';

      ctx.stroke();

      ctx.shadowBlur = 0;

      /*
       * Small rotating accent arc
       */
      ctx.save();

      ctx.translate(
        centerX,
        centerY
      );

      ctx.rotate(
        rotationRef.current * 3
      );

      ctx.beginPath();

      ctx.arc(
        0,
        0,
        coreRadius + 10,
        -0.6,
        0.6
      );

      ctx.strokeStyle =
        '#22d3ee';

      ctx.lineWidth = 2;

      ctx.shadowBlur = 12;

      ctx.shadowColor =
        '#22d3ee';

      ctx.stroke();

      ctx.restore();

      ctx.shadowBlur = 0;

      /*
       * --------------------------------------------------------
       * CENTER PULSE
       * --------------------------------------------------------
       */

      if (isPlaying) {
        const pulseRadius =
          5 + pulse * 12;

        const pulseGradient =
          ctx.createRadialGradient(
            centerX,
            centerY,
            0,
            centerX,
            centerY,
            pulseRadius
          );

        pulseGradient.addColorStop(
          0,
          'rgba(255,255,255,0.85)'
        );

        pulseGradient.addColorStop(
          0.3,
          'rgba(34,211,238,0.55)'
        );

        pulseGradient.addColorStop(
          1,
          'rgba(139,92,246,0)'
        );

        ctx.fillStyle =
          pulseGradient;

        ctx.beginPath();

        ctx.arc(
          centerX,
          centerY,
          pulseRadius,
          0,
          Math.PI * 2
        );

        ctx.fill();
      }

      /*
       * Continue animation
       */
      animationRef.current =
        requestAnimationFrame(render);
    };

    animationRef.current =
      requestAnimationFrame(render);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(
          animationRef.current
        );
      }
    };
  }, [
    isPlaying,
    getByteFrequencyData,
    bass,
    albumArtImage,
  ]);

  /*
   * ------------------------------------------------------------
   * UI
   * ------------------------------------------------------------
   */

  return (
    <div className="relative flex h-full min-h-[360px] w-full items-center justify-center overflow-hidden bg-transparent">
    {/* <div className="relative flex h-full min-h-[360px] w-full items-center justify-center overflow-hidden"> */}

      {/* Ambient color bloom */}
      <div
        className="
          pointer-events-none
          absolute
          h-[420px]
          w-[420px]
          rounded-full
          blur-[110px]
          opacity-40
          transition-all
          duration-1000
          mix-blend-screen
        "
        style={{
          backgroundColor:
            ambientGlowColor,
        }}
      />

      {/* Secondary neon bloom */}
      <div
        className="
          pointer-events-none
          absolute
          h-[260px]
          w-[260px]
          rounded-full
          bg-purple-500/10
          blur-[90px]
          animate-pulse
        "
      />

      {/* Main visualizer */}
      <canvas
        ref={canvasRef}
        className="
          relative
          z-10
          h-[390px]
          w-[390px]
          drop-shadow-[0_0_45px_rgba(139,92,246,0.16)]
        "
      />

      {/* Top label */}
      <div
        className="
          pointer-events-none
          absolute
          top-3
          z-20
          rounded-full
          border
          border-white/10
          bg-black/30
          px-4
          py-1.5
          text-[9px]
          font-semibold
          tracking-[0.28em]
          text-white/45
          backdrop-blur-xl
        "
      >
        {isPlaying
          ? 'NOW PLAYING'
          : 'AUDIO CORE'}
      </div>

    </div>
  );
};
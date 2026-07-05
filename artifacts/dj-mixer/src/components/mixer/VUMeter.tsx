import React, { useRef, useEffect } from 'react';

interface VUMeterProps {
  analyser?: AnalyserNode;
  isActive: boolean;
  width?: number;
  height?: number;
}

export function VUMeter({ analyser, isActive, width = 12, height = 150 }: VUMeterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !analyser || !isActive) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let animationId: number;
    let peakHold = 0;
    let peakHoldFrames = 0;

    const draw = () => {
      animationId = requestAnimationFrame(draw);

      analyser.getByteTimeDomainData(dataArray);
      
      // Calculate RMS
      let sumSquares = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const norm = (dataArray[i] / 128.0) - 1.0;
        sumSquares += norm * norm;
      }
      const rms = Math.sqrt(sumSquares / dataArray.length);
      
      // Convert to dB, map to 0-1 for height
      const db = 20 * Math.log10(Math.max(rms, 0.001));
      // Map -60dB to 0dB to 0-1
      let level = (db + 60) / 60;
      level = Math.max(0, Math.min(1, level));

      // Peak handling
      if (level > peakHold) {
        peakHold = level;
        peakHoldFrames = 30; // hold for 30 frames
      } else {
        if (peakHoldFrames > 0) {
          peakHoldFrames--;
        } else {
          peakHold -= 0.02; // decay
        }
      }

      ctx.clearRect(0, 0, width, height);

      // Draw segments
      const segmentHeight = 4;
      const gap = 2;
      const totalSegments = Math.floor(height / (segmentHeight + gap));

      for (let i = 0; i < totalSegments; i++) {
        const y = height - (i * (segmentHeight + gap)) - segmentHeight;
        const segmentLevel = (i + 1) / totalSegments;

        if (segmentLevel <= level || (i === Math.floor(peakHold * totalSegments))) {
          // Color based on height
          if (segmentLevel > 0.9) {
            ctx.fillStyle = '#FF5252'; // Red
          } else if (segmentLevel > 0.7) {
            ctx.fillStyle = '#FFC107'; // Yellow
          } else {
            ctx.fillStyle = '#00C853'; // Green
          }
          ctx.fillRect(0, y, width, segmentHeight);
        } else {
          ctx.fillStyle = '#1A1D22'; // Empty
          ctx.fillRect(0, y, width, segmentHeight);
        }
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      ctx.clearRect(0, 0, width, height);
    };
  }, [analyser, isActive, height, width]);

  return (
    <canvas 
      ref={canvasRef} 
      width={width} 
      height={height} 
      className="bg-card-border rounded-sm border border-border"
    />
  );
}

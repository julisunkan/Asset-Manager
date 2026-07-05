import React, { useRef, useState, useEffect } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface WaveformDisplayProps {
  file?: File | null;
  url?: string | null;
  isPlaying: boolean;
  currentTime: number;
  playbackRate: number;
  color: string;
  onSeek?: (time: number) => void;
}

export function WaveformDisplay({ file, url, isPlaying, currentTime, playbackRate, color, onSeek }: WaveformDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    wavesurfer.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#2A2D35',
      progressColor: color,
      cursorColor: '#FFFFFF',
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 80,
      normalize: true,
      interact: true,
    });

    wavesurfer.current.on('ready', () => {
      setIsReady(true);
    });

    wavesurfer.current.on('interaction', (newTime) => {
      if (onSeek) onSeek(newTime);
    });

    return () => {
      wavesurfer.current?.destroy();
    };
  }, [color]);

  useEffect(() => {
    if (file && wavesurfer.current) {
      const blobUrl = URL.createObjectURL(file);
      wavesurfer.current.load(blobUrl);
      setIsReady(false);
      return () => {
        URL.revokeObjectURL(blobUrl);
      };
    }
    return undefined;
  }, [file]);

  useEffect(() => {
    if (url && wavesurfer.current) {
      wavesurfer.current.load(url);
      setIsReady(false);
    }
    return undefined;
  }, [url]);

  useEffect(() => {
    if (isReady && wavesurfer.current) {
      // Avoid seeking if we are close enough (letting it play smoothly)
      const wsTime = wavesurfer.current.getCurrentTime();
      if (Math.abs(wsTime - currentTime) > 0.1) {
         wavesurfer.current.setTime(currentTime);
      }
    }
  }, [currentTime, isReady]);
  
  useEffect(() => {
    if (isReady && wavesurfer.current) {
      if (isPlaying && !wavesurfer.current.isPlaying()) {
        // wavesurfer.current.play(); // We just use it for visuals now to avoid double audio
      } else if (!isPlaying && wavesurfer.current.isPlaying()) {
        // wavesurfer.current.pause();
      }
    }
  }, [isPlaying, isReady]);

  return (
    <div className="w-full h-24 bg-card/50 rounded-lg p-2 border border-border relative overflow-hidden">
      {!file && !url && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm font-medium z-10">
          Drop track here
        </div>
      )}
      <div ref={containerRef} className="w-full h-full opacity-90" />
    </div>
  );
}

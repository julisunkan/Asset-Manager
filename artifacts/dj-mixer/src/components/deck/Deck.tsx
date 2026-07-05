import React, { useEffect, useRef } from 'react';
import { Play, Square, Pause, SkipBack, Target } from 'lucide-react';
import { useAppStore } from '../../state/useAppStore';
import { mixerEngine } from '../../engine/MixerEngine';
import { WaveformDisplay } from './WaveformDisplay';

export function Deck({ id }: { id: 'A' | 'B' }) {
  const deckState = useAppStore(state => id === 'A' ? state.deckA : state.deckB);
  const track = useAppStore(state => state.library.find(t => t.id === deckState.trackId));
  const updateDeck = useAppStore(state => state.updateDeck);
  const engine = id === 'A' ? mixerEngine.deckA : mixerEngine.deckB;
  const activeFocus = useAppStore(state => state.activeDeckFocus);
  const setActiveFocus = useAppStore(state => state.setActiveDeckFocus);
  
  const color = id === 'A' ? '#00E5FF' : '#FF5252';
  const isFocused = activeFocus === id;

  useEffect(() => {
    if (!track) return;
    let cancelled = false;

    const loadAudio = async () => {
      try {
        if (track.url) {
          await engine.loadFromUrl(track.url);
        } else if (track.file) {
          const buffer = await import('../../engine/AudioEngine').then(m => m.default.decodeAudioData(track.file!));
          if (cancelled) return; // newer track selected while decoding
          await engine.load(buffer);
        }
      } catch (err) {
        if (!cancelled) console.error("Failed to load audio for deck", id, err);
      }
    };

    loadAudio();
    return () => { cancelled = true; };
  }, [track, engine, id]);

  // Sync animation frame for current time
  const reqRef = useRef<number>(0);
  useEffect(() => {
    if (deckState.isPlaying) {
      const update = () => {
        updateDeck(id, { currentTime: engine.getCurrentTime() });
        reqRef.current = requestAnimationFrame(update);
      };
      reqRef.current = requestAnimationFrame(update);
    }
    return () => cancelAnimationFrame(reqRef.current!);
  }, [deckState.isPlaying, engine, id, updateDeck]);

  const togglePlay = async () => {
    if (!track) return;

    // Resume audio context if needed
    const AudioEngine = await import('../../engine/AudioEngine').then(m => m.default);
    if (AudioEngine.getContext().state === 'suspended') {
      await AudioEngine.getContext().resume();
    }

    if (deckState.isPlaying) {
      engine.pause();
      updateDeck(id, { isPlaying: false });
    } else {
      try {
        await engine.play();
        updateDeck(id, { isPlaying: true });
      } catch (err) {
        console.error("Playback failed for deck", id, err);
        updateDeck(id, { isPlaying: false });
      }
    }
  };

  const stop = () => {
    engine.stop();
    updateDeck(id, { isPlaying: false, currentTime: 0 });
  };

  const handleSeek = (time: number) => {
    engine.seek(time);
    updateDeck(id, { currentTime: time });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className={`flex-1 flex flex-col gap-4 bg-card rounded-xl p-4 border-2 transition-colors ${isFocused ? 'border-primary/50' : 'border-border'}`}
      onClick={() => setActiveFocus(id)}
    >
      {/* Header Info */}
      <div className="flex items-center justify-between bg-background p-3 rounded-lg border border-border">
        <div className="flex flex-col overflow-hidden">
          <span className="font-bold text-lg text-foreground truncate">{track?.name || 'No Track Loaded'}</span>
          <span className="text-sm text-muted-foreground truncate">{track?.artist || 'Drag a track from library'}</span>
        </div>
        <div className="flex gap-4 items-center pl-4 shrink-0">
          <div className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground">BPM</span>
            <span className="text-xl font-mono text-primary font-bold">
              {track?.bpm ? (track.bpm * deckState.playbackRate).toFixed(1) : '---'}
            </span>
          </div>
          <div className="flex flex-col items-end">
             <span className="text-xs text-muted-foreground">KEY</span>
             <div className="px-2 py-0.5 bg-card border border-border rounded text-sm font-bold" style={{ color }}>
                {track?.camelot || '---'}
             </div>
          </div>
          <div className="flex flex-col items-end w-24">
            <span className="text-xs text-muted-foreground">ELAPSED</span>
            <span className="text-lg font-mono tracking-wider">{formatTime(deckState.currentTime)}</span>
          </div>
        </div>
      </div>

      {/* Waveform */}
      <WaveformDisplay
        file={track?.file ?? null}
        url={track?.url ?? null}
        isPlaying={deckState.isPlaying}
        currentTime={deckState.currentTime}
        playbackRate={deckState.playbackRate}
        color={color}
        onSeek={handleSeek}
      />

      {/* Controls */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex gap-3">
          <button 
            className="w-14 h-14 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted active:scale-95 transition-transform"
            onClick={togglePlay}
          >
            {deckState.isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
          </button>
          <button 
            className="w-12 h-12 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted mt-1 active:scale-95 transition-transform"
            onClick={stop}
          >
            <Target size={20} />
          </button>
          
          <button className="w-12 h-12 rounded bg-background border border-border font-bold text-sm hover:bg-muted mt-1 active:scale-95 transition-transform">
            SYNC
          </button>
        </div>

        {/* Loops */}
        <div className="flex gap-2">
          {[1, 2, 4, 8].map(beats => (
             <button key={beats} className="w-10 h-10 bg-background border border-border rounded text-xs font-bold hover:bg-muted hover:text-primary transition-colors">
               {beats}
             </button>
          ))}
        </div>

        {/* Pitch Fader */}
        <div className="w-32 bg-background p-2 rounded border border-border flex flex-col gap-1 items-center relative">
          <div className="text-[10px] text-muted-foreground absolute right-2 top-2">PITCH</div>
          <input 
            type="range"
            min="0.84" max="1.16" step="0.001"
            value={deckState.playbackRate}
            onChange={(e) => {
              const r = parseFloat(e.target.value);
              updateDeck(id, { playbackRate: r });
              engine.setPlaybackRate(r);
            }}
            onDoubleClick={() => {
               updateDeck(id, { playbackRate: 1 });
               engine.setPlaybackRate(1);
            }}
            className="w-full mt-4"
          />
          <div className="text-xs font-mono">
             {((deckState.playbackRate - 1) * 100).toFixed(1)}%
          </div>
        </div>
      </div>
      
      {/* Hot Cues */}
      <div className="grid grid-cols-4 gap-2 mt-auto">
        {[...Array(8)].map((_, i) => (
           <button 
             key={i} 
             className="h-10 rounded border border-border bg-background hover:brightness-125 transition-all text-xs font-bold text-muted-foreground flex items-center justify-center opacity-80"
             style={{ borderBottomColor: i < 4 ? color : undefined, borderBottomWidth: i < 4 ? '3px' : '1px' }}
           >
             {i + 1}
           </button>
        ))}
      </div>
    </div>
  );
}

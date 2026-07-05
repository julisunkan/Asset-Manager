import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Square, RefreshCw, Music2, Lock } from 'lucide-react';
import { useAppStore } from '../../state/useAppStore';
import { mixerEngine } from '../../engine/MixerEngine';
import { WaveformDisplay } from './WaveformDisplay';

const HOT_CUE_COLORS = ['#FF8C00', '#00C853', '#9C27B0', '#2196F3'];
const LOOP_BEATS = [0.5, 1, 2, 4, 8];

export function Deck({ id }: { id: 'A' | 'B' }) {
  const deckState = useAppStore(s => (id === 'A' ? s.deckA : s.deckB));
  const otherDeckState = useAppStore(s => (id === 'A' ? s.deckB : s.deckA));
  const track = useAppStore(s => s.library.find(t => t.id === deckState.trackId));
  const otherTrack = useAppStore(s => s.library.find(t => t.id === otherDeckState.trackId));
  const updateDeck = useAppStore(s => s.updateDeck);
  const setHotCue = useAppStore(s => s.setHotCue);
  const clearHotCue = useAppStore(s => s.clearHotCue);
  const activeFocus = useAppStore(s => s.activeDeckFocus);
  const setActiveFocus = useAppStore(s => s.setActiveDeckFocus);

  const engine = id === 'A' ? mixerEngine.deckA : mixerEngine.deckB;
  const color = id === 'A' ? '#00E5FF' : '#FF5252';
  const isFocused = activeFocus === id;

  // Tap tempo state
  const tapTimesRef = useRef<number[]>([]);
  const [tapBpm, setTapBpm] = useState<number | null>(null);
  const tapResetRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Clear tap-tempo timer on unmount to prevent stale callbacks
  useEffect(() => {
    return () => { clearTimeout(tapResetRef.current); };
  }, []);

  // Key lock
  const [keyLock, setKeyLock] = useState(false);

  // Active loop beats
  const [activeLoop, setActiveLoop] = useState<number | null>(null);

  // Load audio when track changes
  useEffect(() => {
    if (!track) return;
    let cancelled = false;

    const loadAudio = async () => {
      try {
        if (track.url) {
          await engine.loadFromUrl(track.url);
        } else if (track.file) {
          const buffer = await import('../../engine/AudioEngine').then(m =>
            m.default.decodeAudioData(track.file!)
          );
          if (cancelled) return;
          await engine.load(buffer);
        }
      } catch (err) {
        if (!cancelled) console.error('Failed to load audio for deck', id, err);
      }
    };

    loadAudio();
    setActiveLoop(null);
    return () => { cancelled = true; };
  }, [track, engine, id]);

  // Animation frame for current time
  const rafRef = useRef<number>(0);
  useEffect(() => {
    if (deckState.isPlaying) {
      const update = () => {
        updateDeck(id, { currentTime: engine.getCurrentTime() });
        rafRef.current = requestAnimationFrame(update);
      };
      rafRef.current = requestAnimationFrame(update);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [deckState.isPlaying, engine, id, updateDeck]);

  const togglePlay = async () => {
    if (!track) return;
    try {
      const AE = await import('../../engine/AudioEngine').then(m => m.default);
      if (AE.getContext().state === 'suspended') await AE.getContext().resume();

      if (deckState.isPlaying) {
        engine.pause();
        updateDeck(id, { isPlaying: false });
      } else {
        await engine.play();
        updateDeck(id, { isPlaying: true });
      }
    } catch (err) {
      console.error('Failed to toggle playback for deck', id, err);
      updateDeck(id, { isPlaying: false });
    }
  };

  const stop = () => {
    engine.stop();
    updateDeck(id, { isPlaying: false, currentTime: 0 });
    setActiveLoop(null);
    engine.setLoop(false, 0, 0);
  };

  const handleSeek = (time: number) => {
    engine.seek(time);
    updateDeck(id, { currentTime: time });
  };

  // Tap Tempo
  const handleTap = useCallback(() => {
    const now = performance.now();
    tapTimesRef.current.push(now);
    // Keep last 8 taps
    if (tapTimesRef.current.length > 8) tapTimesRef.current.shift();

    // Reset tap window after 3 seconds of inactivity
    clearTimeout(tapResetRef.current);
    tapResetRef.current = setTimeout(() => {
      tapTimesRef.current = [];
      setTapBpm(null);
    }, 3000);

    if (tapTimesRef.current.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < tapTimesRef.current.length; i++) {
        intervals.push(tapTimesRef.current[i] - tapTimesRef.current[i - 1]);
      }
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const bpm = Math.round(60000 / avg);
      setTapBpm(bpm);
      // Adjust playback rate to match tapped BPM if track has a known BPM
      if (track?.bpm && track.bpm > 0) {
        const rate = Math.max(0.5, Math.min(2, bpm / track.bpm));
        engine.setPlaybackRate(rate);
        updateDeck(id, { playbackRate: rate });
      }
    }
  }, [track, engine, id, updateDeck]);

  // Beat Sync — match this deck's BPM to the other deck
  const handleSync = () => {
    const thisBpm = track?.bpm;
    const otherEffBpm = otherTrack?.bpm
      ? otherTrack.bpm * otherDeckState.playbackRate
      : null;

    if (!thisBpm || !otherEffBpm) return;
    const rate = Math.max(0.5, Math.min(2, otherEffBpm / thisBpm));
    engine.setPlaybackRate(rate);
    updateDeck(id, { playbackRate: rate });
  };

  // Loop
  const handleLoop = (beats: number) => {
    if (activeLoop === beats) {
      setActiveLoop(null);
      engine.setLoop(false, 0, 0);
      updateDeck(id, { loopActive: false });
      return;
    }
    // Use effective BPM so loop duration stays beat-aligned even after pitch/sync
    const baseBpm = (tapBpm ?? track?.bpm) || 120;
    const effectiveBpm = baseBpm * deckState.playbackRate;
    const duration = (beats * 60) / effectiveBpm;
    const loopStart = engine.getCurrentTime();
    const loopEnd = loopStart + duration;
    engine.setLoop(true, loopStart, loopEnd);
    engine.seek(loopStart);
    updateDeck(id, { loopActive: true });
    setActiveLoop(beats);
  };

  // Hot Cues
  const handleHotCue = (index: number, e: React.MouseEvent) => {
    if (!track) return;
    const cue = track.hotCues.find(c => c.index === index);
    if (e.type === 'contextmenu') {
      e.preventDefault();
      clearHotCue(id, index);
      return;
    }
    if (cue) {
      // Jump
      engine.seek(cue.position);
      updateDeck(id, { currentTime: cue.position });
    } else {
      // Set
      setHotCue(id, index, engine.getCurrentTime());
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const effectiveBpm = track?.bpm
    ? (track.bpm * deckState.playbackRate).toFixed(1)
    : tapBpm?.toFixed(0) ?? '---';

  return (
    <div
      className={`flex-1 flex flex-col gap-2 bg-card rounded-xl p-3 border-2 transition-colors cursor-pointer min-w-0 ${
        isFocused ? 'border-primary/60' : 'border-border/50'
      }`}
      onClick={() => setActiveFocus(id)}
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-2 bg-background/70 px-3 py-2 rounded-lg border border-border">
        {/* Deck badge */}
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0"
          style={{ backgroundColor: color + '22', color }}
        >
          {id}
        </div>

        {/* Track info */}
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm truncate leading-tight">
            {track?.name || 'No Track Loaded'}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {track?.artist || 'Drop a track or paste a URL'}
          </div>
        </div>

        {/* BPM + Key */}
        <div className="flex gap-3 items-center shrink-0">
          <div className="text-right">
            <div className="text-[10px] text-muted-foreground">BPM</div>
            <div className="text-base font-mono font-bold leading-tight" style={{ color }}>
              {effectiveBpm}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-muted-foreground">KEY</div>
            <div
              className="text-xs font-bold px-1.5 py-0.5 rounded border border-border bg-background"
              style={{ color }}
            >
              {track?.camelot || '---'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Waveform ── */}
      <WaveformDisplay
        file={track?.file ?? null}
        url={track?.url ?? null}
        isPlaying={deckState.isPlaying}
        currentTime={deckState.currentTime}
        playbackRate={deckState.playbackRate}
        color={color}
        onSeek={handleSeek}
      />

      {/* ── Transport + time ── */}
      <div className="flex items-center gap-2">
        {/* Play / Pause */}
        <button
          className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95 border-2"
          style={{
            backgroundColor: deckState.isPlaying ? color + '22' : 'transparent',
            borderColor: color,
            color,
          }}
          onClick={(e) => { e.stopPropagation(); togglePlay(); }}
        >
          {deckState.isPlaying
            ? <Pause size={20} fill="currentColor" />
            : <Play size={20} fill="currentColor" className="ml-0.5" />}
        </button>

        {/* Stop / Cue */}
        <button
          className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted transition-colors active:scale-95"
          onClick={(e) => { e.stopPropagation(); stop(); }}
          title="Stop & return to start"
        >
          <Square size={14} fill="currentColor" className="text-muted-foreground" />
        </button>

        {/* Elapsed time */}
        <div className="flex-1 text-center font-mono text-sm font-bold tracking-wider">
          {formatTime(deckState.currentTime)}
        </div>

        {/* TAP */}
        <button
          className={`px-2 h-10 rounded border text-xs font-bold transition-all active:scale-95 ${
            tapBpm ? 'border-primary/60 bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:text-foreground'
          }`}
          onClick={(e) => { e.stopPropagation(); handleTap(); }}
          title="Tap to detect BPM"
        >
          TAP
          {tapBpm && <span className="ml-1 text-[10px]">{tapBpm}</span>}
        </button>

        {/* KEY LOCK */}
        <button
          className={`w-10 h-10 rounded border flex items-center justify-center transition-all active:scale-95 ${
            keyLock ? 'border-primary/60 bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:text-foreground'
          }`}
          onClick={(e) => { e.stopPropagation(); setKeyLock(v => !v); }}
          title="Key Lock (maintains pitch when changing tempo)"
        >
          <Lock size={13} />
        </button>

        {/* SYNC */}
        <button
          className={`px-2 h-10 rounded border text-xs font-bold transition-all active:scale-95 ${
            otherTrack?.bpm
              ? 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-primary'
              : 'border-border/30 bg-background/30 text-muted-foreground/30 cursor-not-allowed'
          }`}
          onClick={(e) => { e.stopPropagation(); handleSync(); }}
          title={`Sync to Deck ${id === 'A' ? 'B' : 'A'}`}
          disabled={!otherTrack?.bpm}
        >
          <RefreshCw size={12} className="inline mr-1" />
          SYNC
        </button>
      </div>

      {/* ── Hot Cues ── */}
      <div className="flex gap-1.5">
        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider self-center w-10 shrink-0">CUES</span>
        {[0, 1, 2, 3].map(i => {
          const cue = track?.hotCues.find(c => c.index === i);
          const cueColor = HOT_CUE_COLORS[i];
          return (
            <button
              key={i}
              className={`flex-1 h-8 rounded text-xs font-bold transition-all active:scale-95 border ${
                cue
                  ? 'text-white'
                  : 'bg-background text-muted-foreground border-border hover:border-muted-foreground/50'
              }`}
              style={cue ? { backgroundColor: cueColor + 'CC', borderColor: cueColor } : {}}
              onClick={(e) => { e.stopPropagation(); handleHotCue(i, e); }}
              onContextMenu={(e) => { e.stopPropagation(); handleHotCue(i, e); }}
              title={cue ? `Jump to ${formatTime(cue.position)} · right-click to clear` : 'Click to set cue'}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* ── Loop + Pitch ── */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider shrink-0">LOOP</span>
        {LOOP_BEATS.map(b => (
          <button
            key={b}
            className={`flex-1 h-8 rounded text-xs font-bold transition-all active:scale-95 border ${
              activeLoop === b
                ? 'text-black border-transparent'
                : 'bg-background text-muted-foreground border-border hover:text-foreground hover:border-muted-foreground/50'
            }`}
            style={activeLoop === b ? { backgroundColor: color, borderColor: color } : {}}
            onClick={(e) => { e.stopPropagation(); handleLoop(b); }}
          >
            {b < 1 ? '½' : b}
          </button>
        ))}

        {/* Pitch fader */}
        <div className="flex items-center gap-1.5 ml-1">
          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider shrink-0">PITCH</span>
          <input
            type="range"
            min="0.84"
            max="1.16"
            step="0.001"
            value={deckState.playbackRate}
            onChange={e => {
              const r = parseFloat(e.target.value);
              engine.setPlaybackRate(r);
              updateDeck(id, { playbackRate: r });
              if (tapBpm) setTapBpm(null); // clear tap if user manually adjusts
            }}
            onDoubleClick={() => {
              engine.setPlaybackRate(1);
              updateDeck(id, { playbackRate: 1 });
              setTapBpm(null);
            }}
            className="w-20"
            style={{ accentColor: color }}
            onClick={e => e.stopPropagation()}
          />
          <span className="text-[10px] font-mono w-12 text-right shrink-0" style={{ color }}>
            {((deckState.playbackRate - 1) * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useAppStore } from '../../state/useAppStore';
import { mixerEngine } from '../../engine/MixerEngine';
import { FxChain } from '../../engine/FxChain';

interface VibeConfig {
  id: string;
  label: string;
  emoji: string;
  color: string;
  eq: { low: number; mid: number; high: number };
  filter: number;
  fx: { reverb: number; echo: number; distortion: number; flanger: number };
}

const VIBES: VibeConfig[] = [
  {
    id: 'club', label: 'Club', emoji: '🔵', color: '#00E5FF',
    eq: { low: 4, mid: 0, high: 2 }, filter: 0,
    fx: { reverb: 0.15, echo: 0, distortion: 0, flanger: 0 },
  },
  {
    id: 'chill', label: 'Chill', emoji: '🟣', color: '#9C27B0',
    eq: { low: 2, mid: -1, high: -3 }, filter: -0.15,
    fx: { reverb: 0.45, echo: 0.2, distortion: 0, flanger: 0 },
  },
  {
    id: 'festival', label: 'Festival', emoji: '🟡', color: '#FFC107',
    eq: { low: 6, mid: -2, high: 4 }, filter: 0,
    fx: { reverb: 0.25, echo: 0, distortion: 0, flanger: 0 },
  },
  {
    id: 'dark', label: 'Dark Room', emoji: '🔴', color: '#FF5252',
    eq: { low: 5, mid: -1, high: -6 }, filter: -0.1,
    fx: { reverb: 0.6, echo: 0.3, distortion: 0.15, flanger: 0 },
  },
  {
    id: 'tropical', label: 'Tropical', emoji: '🟢', color: '#00C853',
    eq: { low: 2, mid: 2, high: 3 }, filter: 0.1,
    fx: { reverb: 0.2, echo: 0.15, distortion: 0, flanger: 0.25 },
  },
  {
    id: 'lofi', label: 'Lo-Fi', emoji: '🟠', color: '#FF9800',
    eq: { low: -2, mid: 2, high: -9 }, filter: -0.25,
    fx: { reverb: 0.15, echo: 0, distortion: 0.35, flanger: 0 },
  },
];

const FX_LIST: { key: keyof typeof FxChain.state; label: string; emoji: string }[] = [
  { key: 'reverb',     label: 'Reverb',    emoji: '🌊' },
  { key: 'echo',       label: 'Echo',      emoji: '🔁' },
  { key: 'distortion', label: 'Distort',   emoji: '⚡' },
  { key: 'flanger',    label: 'Flanger',   emoji: '🌀' },
];

function applyVibeToDecks(vibe: VibeConfig) {
  // Apply EQ to both decks
  for (const engine of [mixerEngine.deckA, mixerEngine.deckB]) {
    engine.eqLow.gain.value = vibe.eq.low;
    engine.eqMid.gain.value = vibe.eq.mid;
    engine.eqHigh.gain.value = vibe.eq.high;
    engine.setFilter(vibe.filter);
  }
  // Apply FX
  FxChain.applyVibe(vibe.fx);
}

function resetVibeToDecks() {
  for (const engine of [mixerEngine.deckA, mixerEngine.deckB]) {
    engine.eqLow.gain.value = 0;
    engine.eqMid.gain.value = 0;
    engine.eqHigh.gain.value = 0;
    engine.setFilter(0);
  }
  FxChain.applyVibe({ reverb: 0, echo: 0, distortion: 0, flanger: 0 });
}

export function VibesPanel() {
  const activeVibe = useAppStore(s => s.activeVibe);
  const setActiveVibe = useAppStore(s => s.setActiveVibe);
  // FX individual toggles — mirror FxChain.state as local react state
  const [fxState, setFxState] = useState({ reverb: false, echo: false, distortion: false, flanger: false });
  const [fxIntensity, setFxIntensity] = useState({ reverb: 0.5, echo: 0.5, distortion: 0.5, flanger: 0.5 });

  const handleVibe = (vibe: VibeConfig) => {
    if (activeVibe === vibe.id) {
      // Deactivate — reset EQ + FX
      resetVibeToDecks();
      setActiveVibe(null);
      setFxState({ reverb: false, echo: false, distortion: false, flanger: false });
    } else {
      applyVibeToDecks(vibe);
      setActiveVibe(vibe.id);
      // Sync local fx state with what vibe applied
      setFxState({
        reverb: vibe.fx.reverb > 0,
        echo: vibe.fx.echo > 0,
        distortion: vibe.fx.distortion > 0,
        flanger: vibe.fx.flanger > 0,
      });
    }
  };

  const toggleFx = (key: keyof typeof fxState) => {
    const next = !fxState[key];
    const intensity = fxIntensity[key];
    setFxState(s => ({ ...s, [key]: next }));
    if (key === 'reverb') FxChain.setReverb(next, intensity);
    if (key === 'echo') FxChain.setEcho(next, intensity);
    if (key === 'distortion') FxChain.setDistortion(next, intensity);
    if (key === 'flanger') FxChain.setFlanger(next, intensity);
    // If we manually toggled, clear active vibe
    setActiveVibe(null);
  };

  const handleFxIntensity = (key: keyof typeof fxIntensity, val: number) => {
    setFxIntensity(s => ({ ...s, [key]: val }));
    if (!fxState[key]) return;
    if (key === 'reverb') FxChain.setReverb(true, val);
    if (key === 'echo') FxChain.setEcho(true, val);
    if (key === 'distortion') FxChain.setDistortion(true, val);
    if (key === 'flanger') FxChain.setFlanger(true, val);
  };

  const activeVibeConfig = VIBES.find(v => v.id === activeVibe);

  return (
    <div className="bg-card rounded-xl border border-border p-3 flex flex-col gap-3">
      {/* ── Vibes row ── */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0 w-12">VIBE</span>
        <div className="flex gap-2 flex-1 flex-wrap">
          {VIBES.map(vibe => {
            const isActive = activeVibe === vibe.id;
            return (
              <button
                key={vibe.id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 border"
                style={{
                  backgroundColor: isActive ? vibe.color + '25' : 'transparent',
                  borderColor: isActive ? vibe.color : 'hsl(var(--border))',
                  color: isActive ? vibe.color : 'hsl(var(--muted-foreground))',
                  boxShadow: isActive ? `0 0 12px ${vibe.color}40` : 'none',
                }}
                onClick={() => handleVibe(vibe)}
              >
                <span>{vibe.emoji}</span>
                {vibe.label}
              </button>
            );
          })}
          {activeVibe && (
            <button
              className="px-3 py-1.5 rounded-full text-xs font-bold border border-border/50 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => { resetVibeToDecks(); setActiveVibe(null); setFxState({ reverb: false, echo: false, distortion: false, flanger: false }); }}
            >
              ✕ Clear
            </button>
          )}
        </div>

        {activeVibeConfig && (
          <div
            className="text-[10px] font-bold px-2 py-1 rounded-full shrink-0"
            style={{ backgroundColor: activeVibeConfig.color + '20', color: activeVibeConfig.color }}
          >
            EQ active
          </div>
        )}
      </div>

      {/* ── FX row ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0 w-12">FX</span>
        {FX_LIST.map(fx => {
          const on = fxState[fx.key];
          return (
            <div key={fx.key} className="flex items-center gap-2">
              <button
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 border ${
                  on
                    ? 'bg-primary/15 border-primary/60 text-primary shadow-[0_0_8px_rgba(0,229,255,0.3)]'
                    : 'bg-background border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'
                }`}
                onClick={() => toggleFx(fx.key)}
              >
                <span>{fx.emoji}</span>
                {fx.label}
              </button>
              {on && (
                <input
                  type="range" min="0.1" max="1" step="0.05"
                  value={fxIntensity[fx.key]}
                  onChange={e => handleFxIntensity(fx.key, parseFloat(e.target.value))}
                  className="w-16"
                  style={{ accentColor: 'hsl(var(--primary))' }}
                  title={`${fx.label} intensity`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

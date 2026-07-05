import React from 'react';
import { useAppStore } from '../../state/useAppStore';
import { mixerEngine } from '../../engine/MixerEngine';
import AudioEngine from '../../engine/AudioEngine';
import { Knob } from '../common/Knob';
import { VUMeter } from './VUMeter';

export function Mixer() {
  const mixerState = useAppStore(s => s.mixer);
  const deckAState = useAppStore(s => s.deckA);
  const deckBState = useAppStore(s => s.deckB);
  const updateMixer = useAppStore(s => s.updateMixer);
  const updateDeck = useAppStore(s => s.updateDeck);

  const colorA = '#00E5FF';
  const colorB = '#FF5252';

  const handleCrossfader = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    updateMixer({ crossfader: val });
    mixerEngine.setCrossfader(val, mixerState.crossfaderCurve);
  };

  const handleMaster = (val: number) => {
    updateMixer({ masterVolume: val });
    AudioEngine.getMasterGain().gain.value = val;
  };

  const setEq = (deck: 'A' | 'B', band: 'Low' | 'Mid' | 'High', val: number) => {
    const engine = deck === 'A' ? mixerEngine.deckA : mixerEngine.deckB;
    engine[`eq${band}`].gain.value = val;
    updateDeck(deck, { [`eq${band}`]: val });
  };

  const setVolume = (deck: 'A' | 'B', val: number) => {
    const engine = deck === 'A' ? mixerEngine.deckA : mixerEngine.deckB;
    engine.setVolume(val);
    updateDeck(deck, { volume: val });
  };

  const knobSize = 34;

  return (
    <div className="flex items-center gap-3 bg-card rounded-xl px-4 py-3 border border-border">

      {/* ── Deck A strip ── */}
      <div className="flex items-center gap-3 flex-1">
        <VUMeter analyser={mixerEngine.deckA.analyser} isActive={deckAState.isPlaying} />

        {/* Volume Fader A */}
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[9px] text-muted-foreground font-bold">VOL</span>
          <input
            type="range" min="0" max="1" step="0.01"
            value={deckAState.volume}
            onChange={e => setVolume('A', parseFloat(e.target.value))}
            className="h-20 w-3 cursor-ns-resize"
            style={{ accentColor: colorA, writingMode: 'vertical-lr', direction: 'rtl' }}
          />
          <span className="text-[9px] font-mono" style={{ color: colorA }}>
            {Math.round(deckAState.volume * 100)}
          </span>
        </div>

        {/* EQ A */}
        <div className="flex gap-2 items-end pb-1">
          <Knob label="HI" value={deckAState.eqHigh} min={-12} max={12} size={knobSize}
            onChange={v => setEq('A', 'High', v)} onDoubleClick={() => setEq('A', 'High', 0)} color={colorA} />
          <Knob label="MID" value={deckAState.eqMid} min={-12} max={12} size={knobSize}
            onChange={v => setEq('A', 'Mid', v)} onDoubleClick={() => setEq('A', 'Mid', 0)} color={colorA} />
          <Knob label="LOW" value={deckAState.eqLow} min={-12} max={12} size={knobSize}
            onChange={v => setEq('A', 'Low', v)} onDoubleClick={() => setEq('A', 'Low', 0)} color={colorA} />
        </div>
      </div>

      {/* ── Center ── */}
      <div className="flex flex-col items-center gap-2 shrink-0 px-2">
        <Knob label="MASTER" value={mixerState.masterVolume} min={0} max={1} size={42}
          onChange={handleMaster} onDoubleClick={() => handleMaster(0.8)} color="#00C853" />

        {/* Crossfader */}
        <div className="flex flex-col items-center gap-1 w-40">
          <div className="flex justify-between w-full text-[9px] font-bold text-muted-foreground px-1">
            <span style={{ color: colorA }}>A</span>
            <span style={{ color: colorB }}>B</span>
          </div>
          <div className="relative w-full h-8 flex items-center bg-background rounded border border-border">
            <input
              type="range" min="0" max="1" step="0.005"
              value={mixerState.crossfader}
              onChange={handleCrossfader}
              onDoubleClick={() => {
                updateMixer({ crossfader: 0.5 });
                mixerEngine.setCrossfader(0.5, mixerState.crossfaderCurve);
              }}
              className="w-full px-2 cursor-ew-resize"
              style={{ accentColor: '#ffffff' }}
            />
          </div>
          {/* Curve selector */}
          <div className="flex gap-1">
            {(['linear', 'fast', 'slow'] as const).map(curve => (
              <button
                key={curve}
                className={`px-1.5 py-0.5 rounded text-[8px] font-bold transition-colors border ${
                  mixerState.crossfaderCurve === curve
                    ? 'bg-primary/20 border-primary/50 text-primary'
                    : 'bg-background border-border text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => {
                  updateMixer({ crossfaderCurve: curve });
                  mixerEngine.setCrossfader(mixerState.crossfader, curve);
                }}
              >
                {curve === 'linear' ? 'LIN' : curve === 'fast' ? 'CUT' : 'SLOW'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Deck B strip ── */}
      <div className="flex items-center gap-3 flex-1 justify-end">
        {/* EQ B */}
        <div className="flex gap-2 items-end pb-1">
          <Knob label="LOW" value={deckBState.eqLow} min={-12} max={12} size={knobSize}
            onChange={v => setEq('B', 'Low', v)} onDoubleClick={() => setEq('B', 'Low', 0)} color={colorB} />
          <Knob label="MID" value={deckBState.eqMid} min={-12} max={12} size={knobSize}
            onChange={v => setEq('B', 'Mid', v)} onDoubleClick={() => setEq('B', 'Mid', 0)} color={colorB} />
          <Knob label="HI" value={deckBState.eqHigh} min={-12} max={12} size={knobSize}
            onChange={v => setEq('B', 'High', v)} onDoubleClick={() => setEq('B', 'High', 0)} color={colorB} />
        </div>

        {/* Volume Fader B */}
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[9px] text-muted-foreground font-bold">VOL</span>
          <input
            type="range" min="0" max="1" step="0.01"
            value={deckBState.volume}
            onChange={e => setVolume('B', parseFloat(e.target.value))}
            className="h-20 w-3 cursor-ns-resize"
            style={{ accentColor: colorB, writingMode: 'vertical-lr', direction: 'rtl' }}
          />
          <span className="text-[9px] font-mono" style={{ color: colorB }}>
            {Math.round(deckBState.volume * 100)}
          </span>
        </div>

        <VUMeter analyser={mixerEngine.deckB.analyser} isActive={deckBState.isPlaying} />
      </div>
    </div>
  );
}

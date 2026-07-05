import React from 'react';
import { Knob } from '../common/Knob';
import { VUMeter } from './VUMeter';
import { DeckEngine } from '../../engine/DeckEngine';
import { useAppStore } from '../../state/useAppStore';

interface ChannelStripProps {
  id: 'A' | 'B';
  engine: DeckEngine;
}

export function ChannelStrip({ id, engine }: ChannelStripProps) {
  const deckState = useAppStore(state => id === 'A' ? state.deckA : state.deckB);
  const mixerState = useAppStore(state => state.mixer);
  const updateDeck = useAppStore(state => state.updateDeck);
  const updateMixer = useAppStore(state => state.updateMixer);
  const color = id === 'A' ? '#00E5FF' : '#FF5252';

  const isCueActive = id === 'A' ? mixerState.deckACue : mixerState.deckBCue;

  const handleEqChange = (band: 'Low' | 'Mid' | 'High', val: number) => {
    updateDeck(id, { [`eq${band}`]: val });
    engine[`eq${band}`].gain.value = val;
  };

  const handleFilterChange = (val: number) => {
    updateDeck(id, { filterValue: val });
    engine.setFilter(val);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    updateDeck(id, { volume: val });
    engine.setVolume(val);
  };

  const handleGainChange = (val: number) => {
    updateDeck(id, { gain: val });
    // trimGain is dedicated to the gain knob; gainNode is the volume fader — they are independent
    engine.trimGain.gain.value = Math.pow(10, val / 20);
  };

  return (
    <div className="flex flex-col items-center gap-4 bg-card/80 p-4 rounded-lg border border-border w-24 shadow-sm">
      <div className="text-sm font-bold text-muted-foreground">CH {id}</div>
      
      <Knob 
        label="GAIN" 
        value={deckState.gain} 
        min={-12} max={12} step={0.5} 
        onChange={handleGainChange} 
        onDoubleClick={() => handleGainChange(0)} 
      />
      
      <div className="flex flex-col gap-2 my-2">
        <Knob label="HIGH" value={deckState.eqHigh} min={-12} max={12} step={0.5} onChange={(v) => handleEqChange('High', v)} onDoubleClick={() => handleEqChange('High', 0)} />
        <Knob label="MID" value={deckState.eqMid} min={-12} max={12} step={0.5} onChange={(v) => handleEqChange('Mid', v)} onDoubleClick={() => handleEqChange('Mid', 0)} />
        <Knob label="LOW" value={deckState.eqLow} min={-12} max={12} step={0.5} onChange={(v) => handleEqChange('Low', v)} onDoubleClick={() => handleEqChange('Low', 0)} />
      </div>

      <Knob 
        label="FILTER" 
        value={deckState.filterValue} 
        min={-1} max={1} step={0.01} 
        onChange={handleFilterChange} 
        onDoubleClick={() => handleFilterChange(0)}
        color={color}
      />

      <button 
        className={`w-10 h-8 rounded mt-2 text-xs font-bold transition-all border ${isCueActive ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_10px_rgba(0,229,255,0.5)]' : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'}`}
        onClick={() => updateMixer(id === 'A' ? { deckACue: !mixerState.deckACue } : { deckBCue: !mixerState.deckBCue })}
      >
        CUE
      </button>

      <div className="flex gap-3 h-48 mt-2 items-end">
        <VUMeter analyser={engine.analyser} isActive={deckState.isPlaying || true} />
        
        {/* Volume Fader */}
        <div className="relative w-8 h-full bg-background border border-border rounded-sm flex justify-center py-2">
          <div className="absolute inset-0 flex flex-col justify-between items-center py-2 pointer-events-none opacity-20">
             {[...Array(11)].map((_, i) => <div key={i} className="w-4 h-[1px] bg-foreground" />)}
          </div>
          <input 
            type="range" 
            min="0" max="1" step="0.01" 
            value={deckState.volume}
            onChange={handleVolumeChange}
            className="absolute w-48 h-8 -rotate-90 origin-[24px_24px] translate-y-[88px] translate-x-[-88px] cursor-ns-resize"
            style={{
              appearance: 'none',
              background: 'transparent',
              // Custom thumb styled via tailwind isn't trivial for ranges, let's use a standard trick or inline styles
            }}
          />
          {/* Visual Fader Cap */}
          <div 
            className="absolute w-8 h-10 bg-card-border border-2 border-background rounded shadow-md pointer-events-none"
            style={{ bottom: `${deckState.volume * 100}%`, transform: 'translateY(50%)' }}
          >
            <div className="w-full h-0.5 bg-foreground mt-4 opacity-50" />
          </div>
        </div>
      </div>
    </div>
  );
}

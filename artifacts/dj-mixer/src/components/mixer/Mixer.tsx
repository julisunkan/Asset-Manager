import React from 'react';
import { useAppStore } from '../../state/useAppStore';
import { mixerEngine } from '../../engine/MixerEngine';
import AudioEngine from '../../engine/AudioEngine';
import { ChannelStrip } from './ChannelStrip';
import { Knob } from '../common/Knob';

export function Mixer() {
  const mixerState = useAppStore(state => state.mixer);
  const updateMixer = useAppStore(state => state.updateMixer);

  const handleCrossfaderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    updateMixer({ crossfader: val });
    mixerEngine.setCrossfader(val, mixerState.crossfaderCurve);
  };

  const handleMasterChange = (val: number) => {
    updateMixer({ masterVolume: val });
    AudioEngine.getMasterGain().gain.value = val;
  };

  return (
    <div className="flex flex-col bg-card p-4 rounded-xl border border-border shadow-lg">
      <div className="flex justify-between gap-6 flex-1">
        
        <ChannelStrip id="A" engine={mixerEngine.deckA} />

        {/* Center Control Section */}
        <div className="flex flex-col items-center pt-8 w-24 gap-6">
          <Knob 
            label="MASTER" 
            value={mixerState.masterVolume} 
            onChange={handleMasterChange} 
            size={56} 
            color="#00C853" 
          />
          <Knob 
            label="PHONES" 
            value={mixerState.headphoneVolume} 
            onChange={(v) => updateMixer({ headphoneVolume: v })} 
          />
          
          <div className="mt-auto mb-10 w-full flex flex-col items-center">
            {/* VU Meter for Master */}
            <div className="flex gap-1 h-32 mb-4">
               {/* Left and Right Master VU would go here, we mock with Deck A/B for now */}
               <div className="w-2 h-full bg-card-border rounded-sm"></div>
               <div className="w-2 h-full bg-card-border rounded-sm"></div>
            </div>
          </div>
        </div>

        <ChannelStrip id="B" engine={mixerEngine.deckB} />

      </div>

      {/* Crossfader */}
      <div className="mt-6 px-12 h-16 flex items-center bg-background rounded-lg border border-border relative">
        <input 
          type="range" 
          min="0" max="1" step="0.01" 
          value={mixerState.crossfader}
          onChange={handleCrossfaderChange}
          onDoubleClick={() => { updateMixer({ crossfader: 0.5 }); mixerEngine.setCrossfader(0.5, mixerState.crossfaderCurve); }}
          className="w-full h-8 z-10 cursor-ew-resize opacity-0"
        />
        {/* Visual Track */}
        <div className="absolute left-12 right-12 h-2 bg-card-border rounded pointer-events-none flex justify-between">
           {[...Array(21)].map((_, i) => <div key={i} className="w-[1px] h-4 bg-muted-foreground/30 -mt-1" />)}
        </div>
        {/* Visual Cap */}
        <div 
          className="absolute w-12 h-10 bg-card border-2 border-border shadow-md rounded flex justify-center items-center pointer-events-none transition-none"
          style={{ left: `calc(3rem + ${mixerState.crossfader * 100}% - ${mixerState.crossfader * 3}rem - 1.5rem)` }}
        >
          <div className="w-1 h-6 bg-primary/80 rounded-full" />
        </div>
      </div>
    </div>
  );
}

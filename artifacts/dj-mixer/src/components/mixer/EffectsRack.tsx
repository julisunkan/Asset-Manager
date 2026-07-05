import React from 'react';
import { useAppStore } from '../../state/useAppStore';

export function EffectsRack() {
  const effects = useAppStore(state => state.effects);
  const updateEffect = useAppStore(state => state.updateEffect);

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-4">
      <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-2">Effects Rack</h3>
      
      <div className="grid grid-cols-2 gap-4">
        {effects.map((fx) => (
          <div key={fx.id} className="bg-background rounded-lg border border-border p-3 flex flex-col gap-3 relative overflow-hidden">
            {fx.enabled && <div className="absolute top-0 left-0 w-full h-0.5 bg-primary shadow-[0_0_8px_rgba(0,229,255,1)]" />}
            
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm uppercase">{fx.type}</span>
              <button 
                className={`w-10 h-6 rounded text-[10px] font-bold transition-colors ${fx.enabled ? 'bg-primary text-primary-foreground shadow-[0_0_10px_rgba(0,229,255,0.4)]' : 'bg-muted text-muted-foreground'}`}
                onClick={() => updateEffect(fx.id, { enabled: !fx.enabled })}
              >
                ON
              </button>
            </div>
            
            <div className="flex gap-4">
              <div className="flex-1 flex flex-col gap-1">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>DRY/WET</span>
                  <span>{Math.round(fx.mix * 100)}%</span>
                </div>
                <input 
                  type="range" min="0" max="1" step="0.01" 
                  value={fx.mix} 
                  onChange={(e) => updateEffect(fx.id, { mix: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-muted rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
                />
              </div>
              
              <div className="flex-1 flex flex-col gap-1">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>PARAM</span>
                  <span>{Math.round(fx.intensity * 100)}%</span>
                </div>
                <input 
                  type="range" min="0" max="1" step="0.01" 
                  value={fx.intensity} 
                  onChange={(e) => updateEffect(fx.id, { intensity: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-muted rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

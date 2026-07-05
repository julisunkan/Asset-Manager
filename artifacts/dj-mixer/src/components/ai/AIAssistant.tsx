import React from 'react';
import { useAppStore } from '../../state/useAppStore';
import { Activity, Disc, Zap, ArrowRight, ShieldCheck } from 'lucide-react';

export function AIAssistant() {
  const activeFocus = useAppStore(state => state.activeDeckFocus);
  const deckAState = useAppStore(state => state.deckA);
  const deckBState = useAppStore(state => state.deckB);
  
  const trackA = useAppStore(state => state.library.find(t => t.id === deckAState.trackId));
  const trackB = useAppStore(state => state.library.find(t => t.id === deckBState.trackId));
  
  const activeTrack = activeFocus === 'A' ? trackA : trackB;

  // Simple compatibility check
  let compatibility = null;
  let bpmDiff = 0;
  
  if (trackA?.camelot && trackB?.camelot) {
    const numA = parseInt(trackA.camelot);
    const numB = parseInt(trackB.camelot);
    const letA = trackA.camelot.slice(-1);
    const letB = trackB.camelot.slice(-1);
    
    if (trackA.camelot === trackB.camelot) {
      compatibility = { status: 'perfect', text: 'Perfect Match', color: 'text-primary' };
    } else if (numA === numB && letA !== letB) {
      compatibility = { status: 'good', text: 'Relative Match', color: 'text-[#00C853]' };
    } else if (Math.abs(numA - numB) === 1 || (numA === 12 && numB === 1) || (numA === 1 && numB === 12)) {
      compatibility = { status: 'good', text: 'Adjacent Key', color: 'text-[#00C853]' };
    } else {
      compatibility = { status: 'clash', text: 'Key Clash', color: 'text-[#FF5252]' };
    }
  }

  if (trackA?.bpm && trackB?.bpm) {
    bpmDiff = Math.abs((trackA.bpm * deckAState.playbackRate) - (trackB.bpm * deckBState.playbackRate));
  }

  return (
    <div className="h-full flex flex-col bg-sidebar text-sidebar-foreground border-l border-sidebar-border overflow-y-auto">
      <div className="p-4 border-b border-sidebar-border bg-background/50 flex items-center gap-2">
        <ShieldCheck className="text-primary w-5 h-5" />
        <span className="font-semibold text-sm">Local Analysis</span>
      </div>

      <div className="p-4 space-y-6">
        {/* Track Analysis Card */}
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Activity size={14} /> Playing Analysis
          </h3>
          
          {activeTrack ? (
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-sm font-medium truncate pr-2">{activeTrack.name}</span>
                <span className="text-xs px-1.5 py-0.5 bg-muted rounded whitespace-nowrap">{activeTrack.camelot || '--'}</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Energy</span>
                  <span className="font-mono">{Math.round((activeTrack.energy || 0) * 100)}%</span>
                </div>
                <div className="w-full h-1.5 bg-background rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-[#FF5252]" style={{ width: `${(activeTrack.energy || 0) * 100}%` }} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Danceability</span>
                  <span className="font-mono">{Math.round((activeTrack.danceability || 0) * 100)}%</span>
                </div>
                <div className="w-full h-1.5 bg-background rounded-full overflow-hidden">
                  <div className="h-full bg-[#00C853]" style={{ width: `${(activeTrack.danceability || 0) * 100}%` }} />
                </div>
              </div>

              <div className="pt-2 border-t border-border flex justify-between">
                <div className="text-xs flex flex-col">
                  <span className="text-muted-foreground">Mood</span>
                  <span className="capitalize font-medium text-primary">{activeTrack.mood}</span>
                </div>
                <div className="text-xs flex flex-col text-right">
                  <span className="text-muted-foreground">Loudness</span>
                  <span className="font-medium">{activeTrack.loudness ? `${activeTrack.loudness.toFixed(1)} LUFS` : '--'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-4">Load a track to analyze</div>
          )}
        </div>

        {/* Mix Recommendations */}
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Zap size={14} /> Mix Assistant
          </h3>
          
          {trackA && trackB ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span>Harmonic</span>
                <span className={`font-bold ${compatibility?.color}`}>{compatibility?.text}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span>Tempo Sync</span>
                {bpmDiff < 0.5 ? (
                  <span className="text-[#00C853] font-bold">Locked</span>
                ) : (
                  <span className="text-[#FFC107] font-bold text-xs">{bpmDiff.toFixed(1)} BPM diff</span>
                )}
              </div>

              <div className="bg-background rounded p-3 text-xs text-muted-foreground mt-2 border border-border">
                {compatibility?.status === 'clash' ? (
                  <p>Consider a fast cut or effect transition. Harmonic blending may sound muddy.</p>
                ) : bpmDiff > 5 ? (
                  <p>Large tempo gap. Gradually shift tempo or use echo out before dropping.</p>
                ) : (
                  <p>Tracks are highly compatible. Smooth EQ crossover recommended.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-4">Load two tracks for transition advice</div>
          )}
        </div>

        {/* Harmonic Wheel Placeholder */}
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm flex flex-col items-center justify-center opacity-80">
          <Disc className="w-16 h-16 text-muted-foreground mb-2" strokeWidth={1} />
          <span className="text-xs text-muted-foreground">Camelot Wheel Reference</span>
        </div>

      </div>
    </div>
  );
}

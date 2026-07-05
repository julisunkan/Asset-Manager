import AudioEngine from './AudioEngine';
import { DeckEngine } from './DeckEngine';

export class MixerEngine {
  private ctx: AudioContext;
  
  public deckA: DeckEngine;
  public deckB: DeckEngine;
  
  private crossfaderGainA: GainNode;
  private crossfaderGainB: GainNode;
  
  constructor() {
    this.ctx = AudioEngine.getContext();
    const master = AudioEngine.getMasterGain();

    this.deckA = new DeckEngine();
    this.deckB = new DeckEngine();

    this.crossfaderGainA = this.ctx.createGain();
    this.crossfaderGainB = this.ctx.createGain();

    this.deckA.gainNode.connect(this.crossfaderGainA);
    this.deckB.gainNode.connect(this.crossfaderGainB);

    this.crossfaderGainA.connect(master);
    this.crossfaderGainB.connect(master);
    
    this.setCrossfader(0.5, 'linear');
  }

  public setCrossfader(value: number, curve: 'linear' | 'fast' | 'slow' = 'linear') {
    // value 0 (A) to 1 (B)
    let gainA = 1.0;
    let gainB = 1.0;

    if (curve === 'linear') {
      gainA = Math.cos(value * 0.5 * Math.PI);
      gainB = Math.cos((1.0 - value) * 0.5 * Math.PI);
    } else if (curve === 'fast') {
      // Fast cut (scratching)
      gainA = value < 0.95 ? 1.0 : (1.0 - value) * 20;
      gainB = value > 0.05 ? 1.0 : value * 20;
    } else {
      // Slow mix
      gainA = 1.0 - value;
      gainB = value;
    }

    this.crossfaderGainA.gain.value = Math.max(0, Math.min(1, gainA));
    this.crossfaderGainB.gain.value = Math.max(0, Math.min(1, gainB));
  }
}

export const mixerEngine = new MixerEngine();

/**
 * FxChain — master effects bus
 *
 * All effects tap from AudioEngine.getFxBus() in parallel with the dry signal.
 * Wet gains start at 0 (disabled). Enabling an effect ramps wet gain up.
 *
 * Graph:
 *   masterGain → fxBus → destination (dry)
 *              → reverb  → reverbWet  → destination
 *              → delay   → echoWet    → destination
 *              → dist    → distWet    → destination
 *              → flanger → flangerWet → destination
 */

import AudioEngine from './AudioEngine';

class FxChainClass {
  private initialized = false;
  private ctx!: AudioContext;

  // Reverb
  private reverbConv!: ConvolverNode;
  private reverbWet!: GainNode;

  // Echo
  private echoDelay!: DelayNode;
  private echoFeedback!: GainNode;
  private echoWet!: GainNode;

  // Distortion
  private distWave!: WaveShaperNode;
  private distWet!: GainNode;

  // Flanger
  private flDelay!: DelayNode;
  private flOsc!: OscillatorNode;
  private flDepth!: GainNode;
  private flWet!: GainNode;

  public state = {
    reverb: false,
    echo: false,
    distortion: false,
    flanger: false,
  };

  public intensity = {
    reverb: 0.5,
    echo: 0.5,
    distortion: 0.5,
    flanger: 0.5,
  };

  public ensureInit() {
    if (this.initialized) return;
    this.initialized = true;
    this.ctx = AudioEngine.getContext();
    const bus = AudioEngine.getFxBus();
    const dest = this.ctx.destination;

    /* ─── Reverb ─── */
    this.reverbConv = this.ctx.createConvolver();
    this.reverbConv.buffer = this._buildImpulse(2.5);
    this.reverbWet = this.ctx.createGain();
    this.reverbWet.gain.value = 0;
    bus.connect(this.reverbConv);
    this.reverbConv.connect(this.reverbWet);
    this.reverbWet.connect(dest);

    /* ─── Echo / delay ─── */
    this.echoDelay = this.ctx.createDelay(2.0);
    this.echoDelay.delayTime.value = 0.375;
    this.echoFeedback = this.ctx.createGain();
    this.echoFeedback.gain.value = 0;
    this.echoWet = this.ctx.createGain();
    this.echoWet.gain.value = 0;
    bus.connect(this.echoDelay);
    this.echoDelay.connect(this.echoFeedback);
    this.echoFeedback.connect(this.echoDelay); // feedback loop
    this.echoDelay.connect(this.echoWet);
    this.echoWet.connect(dest);

    /* ─── Distortion ─── */
    this.distWave = this.ctx.createWaveShaper();
    this.distWave.oversample = '4x';
    this.distWet = this.ctx.createGain();
    this.distWet.gain.value = 0;
    bus.connect(this.distWave);
    this.distWave.connect(this.distWet);
    this.distWet.connect(dest);

    /* ─── Flanger ─── */
    this.flDelay = this.ctx.createDelay(0.02);
    this.flDelay.delayTime.value = 0.005;
    this.flOsc = this.ctx.createOscillator();
    this.flOsc.type = 'sine';
    this.flOsc.frequency.value = 0.3;
    this.flDepth = this.ctx.createGain();
    this.flDepth.gain.value = 0.003;
    this.flWet = this.ctx.createGain();
    this.flWet.gain.value = 0;
    this.flOsc.connect(this.flDepth);
    this.flDepth.connect(this.flDelay.delayTime);
    bus.connect(this.flDelay);
    this.flDelay.connect(this.flWet);
    this.flWet.connect(dest);
    this.flOsc.start();
  }

  /* ── Public setters ── */

  public setReverb(enabled: boolean, intensity = this.intensity.reverb) {
    this.ensureInit();
    this.state.reverb = enabled;
    this.intensity.reverb = intensity;
    this._ramp(this.reverbWet.gain, enabled ? intensity * 0.8 : 0);
  }

  public setEcho(enabled: boolean, intensity = this.intensity.echo) {
    this.ensureInit();
    this.state.echo = enabled;
    this.intensity.echo = intensity;
    this._ramp(this.echoWet.gain, enabled ? intensity * 0.7 : 0);
    this._ramp(this.echoFeedback.gain, enabled ? intensity * 0.45 : 0);
  }

  public setDistortion(enabled: boolean, intensity = this.intensity.distortion) {
    this.ensureInit();
    this.state.distortion = enabled;
    this.intensity.distortion = intensity;
    this.distWave.curve = this._distCurve(50 + intensity * 300);
    this._ramp(this.distWet.gain, enabled ? intensity * 0.45 : 0);
  }

  public setFlanger(enabled: boolean, intensity = this.intensity.flanger) {
    this.ensureInit();
    this.state.flanger = enabled;
    this.intensity.flanger = intensity;
    this.flOsc.frequency.value = 0.1 + intensity * 1.2;
    this.flDepth.gain.value = 0.001 + intensity * 0.005;
    this._ramp(this.flWet.gain, enabled ? intensity * 0.7 : 0);
  }

  /** Apply a full vibe preset: sets all FX wet levels at once. */
  public applyVibe(fx: { reverb: number; echo: number; distortion: number; flanger: number }) {
    this.ensureInit();
    const any = (v: number) => v > 0;
    this.setReverb(any(fx.reverb), fx.reverb || 0.5);
    this.setEcho(any(fx.echo), fx.echo || 0.5);
    this.setDistortion(any(fx.distortion), fx.distortion || 0.5);
    this.setFlanger(any(fx.flanger), fx.flanger || 0.5);
  }

  /* ── Private helpers ── */

  private _ramp(param: AudioParam, target: number, time = 0.05) {
    param.linearRampToValueAtTime(target, this.ctx.currentTime + time);
  }

  private _buildImpulse(duration: number): AudioBuffer {
    const len = Math.floor(this.ctx.sampleRate * duration);
    const buf = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const ch = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8);
      }
    }
    return buf;
  }

  private _distCurve(amount: number): Float32Array<ArrayBuffer> {
    const n = 512;
    const buf = new ArrayBuffer(n * 4);
    const curve = new Float32Array(buf);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }
}

export const FxChain = new FxChainClass();

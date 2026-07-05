class AudioEngine {
  private static instance: AudioEngine;
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private fxBus: GainNode | null = null; // sits between masterGain and effects/destination
  private initialized = false;

  private constructor() {}

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  public init() {
    if (this.initialized) return;
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ latencyHint: 'interactive' });
      this.masterGain = this.audioContext.createGain();
      this.fxBus = this.audioContext.createGain();
      // chain: masterGain → fxBus → destination
      // FxChain will tap fxBus and add parallel effect sends
      this.masterGain.connect(this.fxBus);
      this.fxBus.connect(this.audioContext.destination);
      this.initialized = true;
    } catch (e) {
      console.error('Web Audio API not supported', e);
    }
  }

  public getContext(): AudioContext {
    if (!this.audioContext) this.init();
    return this.audioContext!;
  }

  public getMasterGain(): GainNode {
    if (!this.masterGain) this.init();
    return this.masterGain!;
  }

  /** FX effects tap from this bus so dry signal always passes through. */
  public getFxBus(): GainNode {
    if (!this.fxBus) this.init();
    return this.fxBus!;
  }

  public async decodeAudioData(file: File): Promise<AudioBuffer> {
    const ctx = this.getContext();
    const arrayBuffer = await file.arrayBuffer();
    return await ctx.decodeAudioData(arrayBuffer);
  }
}

export default AudioEngine.getInstance();

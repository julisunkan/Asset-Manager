import AudioEngine from './AudioEngine';

type DeckMode = 'buffer' | 'element';

export class DeckEngine {
  private ctx: AudioContext;

  // Buffer mode (local files)
  private buffer: AudioBuffer | null = null;
  private source: AudioBufferSourceNode | null = null;

  // Element mode (streaming URLs)
  private audioElement: HTMLAudioElement | null = null;
  private mediaSource: MediaElementAudioSourceNode | null = null;

  private mode: DeckMode = 'buffer';

  public gainNode: GainNode;     // volume fader (0–1)
  public trimGain: GainNode;     // gain trim knob (dB → linear)
  public eqLow: BiquadFilterNode;
  public eqMid: BiquadFilterNode;
  public eqHigh: BiquadFilterNode;
  public filterNode: BiquadFilterNode;
  public analyser: AnalyserNode;

  private isPlaying = false;
  private startTime = 0;
  private pausedAt = 0;
  private playbackRate = 1.0;
  private loopActive = false;
  private loopStart = 0;
  private loopEnd = 0;

  constructor() {
    this.ctx = AudioEngine.getContext();

    // Build processing chain
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;

    this.gainNode = this.ctx.createGain();
    this.trimGain = this.ctx.createGain();

    this.eqLow = this.ctx.createBiquadFilter();
    this.eqLow.type = 'lowshelf';
    this.eqLow.frequency.value = 250;

    this.eqMid = this.ctx.createBiquadFilter();
    this.eqMid.type = 'peaking';
    this.eqMid.frequency.value = 1000;
    this.eqMid.Q.value = 1;

    this.eqHigh = this.ctx.createBiquadFilter();
    this.eqHigh.type = 'highshelf';
    this.eqHigh.frequency.value = 4000;

    this.filterNode = this.ctx.createBiquadFilter();
    this.filterNode.type = 'allpass';

    // Connect chain: source → analyser → eqLow → eqMid → eqHigh → filter → trimGain → gainNode → ...
    this.analyser.connect(this.eqLow);
    this.eqLow.connect(this.eqMid);
    this.eqMid.connect(this.eqHigh);
    this.eqHigh.connect(this.filterNode);
    this.filterNode.connect(this.trimGain);
    this.trimGain.connect(this.gainNode);
  }

  /** Load from a decoded AudioBuffer (local files). */
  public async load(buffer: AudioBuffer) {
    this._teardownElement();
    this.stop();
    this.buffer = buffer;
    this.pausedAt = 0;
    this.mode = 'buffer';
  }

  /**
   * Load from a remote URL using HTMLAudioElement + MediaElementAudioSourceNode.
   * This streams the audio without downloading the entire file first.
   * The server must support CORS (Access-Control-Allow-Origin).
   */
  public async loadFromUrl(url: string): Promise<void> {
    this._teardownElement();
    this.stop();
    this.buffer = null;
    this.pausedAt = 0;
    this.mode = 'element';

    const el = new Audio();
    el.crossOrigin = 'anonymous';
    el.preload = 'metadata'; // only metadata, not the full file
    el.src = url;

    // A MediaElementAudioSourceNode can only be created once per element
    const ms = this.ctx.createMediaElementSource(el);
    ms.connect(this.analyser);

    this.audioElement = el;
    this.mediaSource = ms;

    // Wait for metadata so duration is available
    await new Promise<void>((resolve, reject) => {
      el.onloadedmetadata = () => resolve();
      el.onerror = () => reject(new Error(`Failed to load audio from URL: ${url}`));
    });
  }

  /**
   * Play the loaded audio. For element mode, returns a Promise that resolves
   * once playback has actually started (or rejects on policy/network failure).
   */
  public async play(): Promise<void> {
    if (this.mode === 'element') {
      if (!this.audioElement || this.isPlaying) return;
      this.audioElement.playbackRate = this.playbackRate;
      await this.audioElement.play(); // throws on autoplay-policy or network failure
      this.isPlaying = true;
      return;
    }

    if (!this.buffer || this.isPlaying) return;

    this.source = this.ctx.createBufferSource();
    this.source.buffer = this.buffer;
    this.source.playbackRate.value = this.playbackRate;
    this.source.connect(this.analyser);

    if (this.loopActive) {
      this.source.loop = true;
      this.source.loopStart = this.loopStart;
      this.source.loopEnd = this.loopEnd;
    }

    this.source.start(0, this.pausedAt);
    this.startTime = this.ctx.currentTime - (this.pausedAt / this.playbackRate);
    this.isPlaying = true;
  }

  public pause() {
    if (this.mode === 'element') {
      if (!this.audioElement || !this.isPlaying) return;
      this.audioElement.pause();
      this.isPlaying = false;
      return;
    }

    if (!this.isPlaying || !this.source) return;

    const elapsed = (this.ctx.currentTime - this.startTime) * this.playbackRate;
    this.pausedAt = elapsed % this.buffer!.duration;

    this.source.stop();
    this.source.disconnect();
    this.source = null;
    this.isPlaying = false;
  }

  public stop() {
    if (this.mode === 'element') {
      if (this.audioElement) {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
      }
      this.isPlaying = false;
      return;
    }

    if (this.source) {
      try { this.source.stop(); } catch (e) {}
      this.source.disconnect();
      this.source = null;
    }
    this.isPlaying = false;
    this.pausedAt = 0;
  }

  public seek(time: number) {
    if (this.mode === 'element') {
      if (!this.audioElement) return;
      this.audioElement.currentTime = Math.max(0, time);
      return;
    }

    const wasPlaying = this.isPlaying;
    if (wasPlaying) this.pause();
    this.pausedAt = Math.max(0, Math.min(time, this.buffer ? this.buffer.duration : 0));
    if (wasPlaying) this.play();
  }

  public setPlaybackRate(rate: number) {
    this.playbackRate = rate;
    if (this.mode === 'element') {
      if (this.audioElement) this.audioElement.playbackRate = rate;
      return;
    }
    if (this.source) {
      this.source.playbackRate.value = rate;
    }
    if (this.isPlaying) {
      this.startTime = this.ctx.currentTime - (this.pausedAt / rate);
    }
  }

  public getCurrentTime(): number {
    if (this.mode === 'element') {
      return this.audioElement ? this.audioElement.currentTime : 0;
    }
    if (!this.buffer) return 0;
    if (this.isPlaying) {
      const elapsed = (this.ctx.currentTime - this.startTime) * this.playbackRate;
      if (this.loopActive) {
        if (elapsed >= this.loopEnd) {
          return this.loopStart + ((elapsed - this.loopStart) % (this.loopEnd - this.loopStart));
        }
      }
      return elapsed % this.buffer.duration;
    }
    return this.pausedAt;
  }

  public getDuration(): number {
    if (this.mode === 'element') {
      return this.audioElement ? (this.audioElement.duration || 0) : 0;
    }
    return this.buffer ? this.buffer.duration : 0;
  }

  public setVolume(val: number) {
    this.gainNode.gain.value = val;
  }

  public setEq(low: number, mid: number, high: number) {
    this.eqLow.gain.value = low;
    this.eqMid.gain.value = mid;
    this.eqHigh.gain.value = high;
  }

  public setFilter(val: number) {
    if (val === 0) {
      this.filterNode.type = 'allpass';
    } else if (val < 0) {
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.value = 20 + Math.pow(1 + val, 2) * 19980;
    } else {
      this.filterNode.type = 'highpass';
      this.filterNode.frequency.value = 20 + Math.pow(val, 2) * 19980;
    }
  }

  public setLoop(active: boolean, start: number, end: number) {
    this.loopActive = active;
    this.loopStart = start;
    this.loopEnd = end;
    if (this.source) {
      this.source.loop = active;
      this.source.loopStart = start;
      this.source.loopEnd = end;
    }
    // Note: HTMLAudioElement looping is handled separately if needed
  }

  public disconnect() {
    this.gainNode.disconnect();
  }

  private _teardownElement() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
    }
    if (this.mediaSource) {
      try { this.mediaSource.disconnect(); } catch (e) {}
    }
    this.audioElement = null;
    this.mediaSource = null;
  }
}

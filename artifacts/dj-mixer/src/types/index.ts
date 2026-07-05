export interface TrackInfo {
  id: string;
  file?: File;       // in-memory only (local files)
  url?: string;      // remote streaming URL
  name: string;
  artist: string;
  album: string;
  genre: string;
  duration: number;  // seconds
  bpm: number | null;
  bpmConfidence: number;
  key: string | null;       // e.g. "C# Minor"
  camelot: string | null;   // e.g. "12A"
  energy: number;    // 0–1
  mood: 'happy' | 'energetic' | 'melancholic' | 'dark' | 'neutral' | 'chill';
  danceability: number; // 0–1
  loudness: number;     // LUFS estimate
  albumArt: string | null;  // data URL or null
  waveformData: Float32Array | null;
  isFavorite: boolean;
  colorLabel: string | null;
  hotCues: HotCue[];
  loopIn: number | null;
  loopOut: number | null;
}

export interface HotCue {
  index: number;   // 0–7
  position: number; // seconds
  name: string;
  color: string;
}

export interface DeckState {
  trackId: string | null;
  isPlaying: boolean;
  currentTime: number;
  playbackRate: number;    // 1.0 = normal
  bpmOffset: number;       // manual BPM correction
  volume: number;          // 0–1
  gain: number;            // dB -12 to +12
  eqLow: number;           // dB
  eqMid: number;
  eqHigh: number;
  filterValue: number;     // -1 (full HPF) to 1 (full LPF)
  isCued: boolean;
  loopActive: boolean;
  activeHotCue: number | null;
}

export interface MixerState {
  crossfader: number;      // 0 (full A) to 1 (full B)
  crossfaderCurve: 'linear' | 'fast' | 'slow';
  masterVolume: number;
  headphoneVolume: number;
  deckACue: boolean;
  deckBCue: boolean;
}

export interface EffectConfig {
  id: string;
  type: EffectType;
  enabled: boolean;
  mix: number;       // 0–1 dry/wet
  intensity: number; // 0–1
  preset: string;
  params: Record<string, number>;
}

export type EffectType =
  | 'reverb' | 'echo' | 'delay' | 'flanger' | 'phaser' | 'chorus'
  | 'compressor' | 'limiter' | 'distortion' | 'highpass' | 'lowpass'
  | 'bassboost' | 'trebleboost' | 'stereowidth';

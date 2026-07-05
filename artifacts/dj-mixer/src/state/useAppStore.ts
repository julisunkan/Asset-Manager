import { create } from 'zustand';
import { TrackInfo, DeckState, MixerState, EffectConfig, HotCue } from '../types';

interface AppState {
  library: TrackInfo[];
  deckA: DeckState;
  deckB: DeckState;
  mixer: MixerState;
  effects: EffectConfig[];
  activeDeckFocus: 'A' | 'B';
  
  // Actions
  addTrack: (track: TrackInfo) => void;
  updateTrack: (id: string, updates: Partial<TrackInfo>) => void;
  removeTrack: (id: string) => void;
  
  loadToDeck: (deck: 'A' | 'B', trackId: string) => void;
  updateDeck: (deck: 'A' | 'B', updates: Partial<DeckState>) => void;
  updateMixer: (updates: Partial<MixerState>) => void;
  updateEffect: (effectId: string, updates: Partial<EffectConfig>) => void;
  setActiveDeckFocus: (deck: 'A' | 'B') => void;
}

const defaultDeckState: DeckState = {
  trackId: null,
  isPlaying: false,
  currentTime: 0,
  playbackRate: 1.0,
  bpmOffset: 0,
  volume: 1.0,
  gain: 0,
  eqLow: 0,
  eqMid: 0,
  eqHigh: 0,
  filterValue: 0,
  isCued: false,
  loopActive: false,
  activeHotCue: null,
};

export const useAppStore = create<AppState>((set) => ({
  library: [],
  deckA: { ...defaultDeckState },
  deckB: { ...defaultDeckState },
  mixer: {
    crossfader: 0.5,
    crossfaderCurve: 'linear',
    masterVolume: 1.0,
    headphoneVolume: 0.5,
    deckACue: false,
    deckBCue: false,
  },
  effects: [
    { id: 'fx1', type: 'reverb', enabled: false, mix: 0.5, intensity: 0.5, preset: 'hall', params: {} },
    { id: 'fx2', type: 'echo', enabled: false, mix: 0.5, intensity: 0.5, preset: '1/4', params: {} },
    { id: 'fx3', type: 'flanger', enabled: false, mix: 0.5, intensity: 0.5, preset: 'default', params: {} },
    { id: 'fx4', type: 'compressor', enabled: false, mix: 0.5, intensity: 0.5, preset: 'default', params: {} },
  ],
  activeDeckFocus: 'A',
  
  addTrack: (track) => set((state) => ({ library: [...state.library, track] })),
  
  updateTrack: (id, updates) => set((state) => ({
    library: state.library.map((t) => (t.id === id ? { ...t, ...updates } : t)),
  })),
  
  removeTrack: (id) => set((state) => ({
    library: state.library.filter((t) => t.id !== id),
  })),
  
  loadToDeck: (deck, trackId) => set((state) => ({
    [deck === 'A' ? 'deckA' : 'deckB']: { ...state[deck === 'A' ? 'deckA' : 'deckB'], trackId, isPlaying: false, currentTime: 0, playbackRate: 1.0 }
  })),
  
  updateDeck: (deck, updates) => set((state) => ({
    [deck === 'A' ? 'deckA' : 'deckB']: { ...state[deck === 'A' ? 'deckA' : 'deckB'], ...updates }
  })),
  
  updateMixer: (updates) => set((state) => ({
    mixer: { ...state.mixer, ...updates }
  })),
  
  updateEffect: (effectId, updates) => set((state) => ({
    effects: state.effects.map((fx) => (fx.id === effectId ? { ...fx, ...updates } : fx))
  })),
  
  setActiveDeckFocus: (deck) => set({ activeDeckFocus: deck })
}));

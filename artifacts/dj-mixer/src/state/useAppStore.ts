import { create } from 'zustand';
import { TrackInfo, DeckState, MixerState, EffectConfig, HotCue } from '../types';
import { syncUpsert, syncPatch, syncDelete } from '../lib/librarySync';

interface AppState {
  library: TrackInfo[];
  deckA: DeckState;
  deckB: DeckState;
  mixer: MixerState;
  effects: EffectConfig[];
  activeDeckFocus: 'A' | 'B';
  activeVibe: string | null;
  libraryOpen: boolean;
  settingsOpen: boolean;

  // Actions
  addTrack: (track: TrackInfo) => void;
  updateTrack: (id: string, updates: Partial<TrackInfo>) => void;
  removeTrack: (id: string) => void;

  loadToDeck: (deck: 'A' | 'B', trackId: string) => void;
  updateDeck: (deck: 'A' | 'B', updates: Partial<DeckState>) => void;
  updateMixer: (updates: Partial<MixerState>) => void;
  updateEffect: (effectId: string, updates: Partial<EffectConfig>) => void;
  setActiveDeckFocus: (deck: 'A' | 'B') => void;
  setActiveVibe: (vibe: string | null) => void;
  setLibraryOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;

  /** Set or update a hot cue on the currently-loaded track for a deck. */
  setHotCue: (deck: 'A' | 'B', index: number, time: number) => void;
  clearHotCue: (deck: 'A' | 'B', index: number) => void;
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

export const useAppStore = create<AppState>((set, get) => ({
  library: [],
  deckA: { ...defaultDeckState },
  deckB: { ...defaultDeckState },
  mixer: {
    crossfader: 0.5,
    crossfaderCurve: 'linear',
    masterVolume: 0.8,
    headphoneVolume: 0.5,
    deckACue: false,
    deckBCue: false,
  },
  effects: [
    { id: 'fx1', type: 'reverb',     enabled: false, mix: 0.5, intensity: 0.5, preset: 'hall',    params: {} },
    { id: 'fx2', type: 'echo',       enabled: false, mix: 0.5, intensity: 0.5, preset: '1/4',     params: {} },
    { id: 'fx3', type: 'distortion', enabled: false, mix: 0.5, intensity: 0.5, preset: 'default', params: {} },
    { id: 'fx4', type: 'flanger',    enabled: false, mix: 0.5, intensity: 0.5, preset: 'default', params: {} },
  ],
  activeDeckFocus: 'A',
  activeVibe: null,
  libraryOpen: false,
  settingsOpen: false,

  addTrack: (track) => {
    set((s) => ({ library: [...s.library, track] }));
    syncUpsert(track);
  },

  updateTrack: (id, updates) => {
    set((s) => ({
      library: s.library.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
    syncPatch(id, updates);
  },

  removeTrack: (id) => {
    set((s) => ({ library: s.library.filter((t) => t.id !== id) }));
    syncDelete(id);
  },

  loadToDeck: (deck, trackId) => set((s) => ({
    [deck === 'A' ? 'deckA' : 'deckB']: {
      ...s[deck === 'A' ? 'deckA' : 'deckB'],
      trackId,
      isPlaying: false,
      currentTime: 0,
      playbackRate: 1.0,
      loopActive: false,
      activeHotCue: null,
    },
  })),

  updateDeck: (deck, updates) => set((s) => ({
    [deck === 'A' ? 'deckA' : 'deckB']: { ...s[deck === 'A' ? 'deckA' : 'deckB'], ...updates },
  })),

  updateMixer: (updates) => set((s) => ({ mixer: { ...s.mixer, ...updates } })),

  updateEffect: (effectId, updates) => set((s) => ({
    effects: s.effects.map((fx) => (fx.id === effectId ? { ...fx, ...updates } : fx)),
  })),

  setActiveDeckFocus: (deck) => set({ activeDeckFocus: deck }),
  setActiveVibe: (vibe) => set({ activeVibe: vibe }),
  setLibraryOpen: (open) => set({ libraryOpen: open }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),

  setHotCue: (deck, index, time) => {
    const state = get();
    const deckState = deck === 'A' ? state.deckA : state.deckB;
    if (!deckState.trackId) return;

    const track = state.library.find((t) => t.id === deckState.trackId);
    if (!track) return;

    const existingCues = track.hotCues.filter((c) => c.index !== index);
    const colors = ['#FF8C00', '#00C853', '#9C27B0', '#2196F3'];
    const newCue: HotCue = { index, position: time, name: `CUE ${index + 1}`, color: colors[index] ?? '#ffffff' };

    get().updateTrack(deckState.trackId, { hotCues: [...existingCues, newCue] });
  },

  clearHotCue: (deck, index) => {
    const state = get();
    const deckState = deck === 'A' ? state.deckA : state.deckB;
    if (!deckState.trackId) return;

    const track = state.library.find((t) => t.id === deckState.trackId);
    if (!track) return;

    get().updateTrack(deckState.trackId, { hotCues: track.hotCues.filter((c) => c.index !== index) });
  },
}));

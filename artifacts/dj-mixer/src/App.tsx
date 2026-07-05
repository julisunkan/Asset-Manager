import React from 'react';
import { TopNav } from './components/layout/TopNav';
import { MusicLibrary } from './components/library/MusicLibrary';
import { Deck } from './components/deck/Deck';
import { Mixer } from './components/mixer/Mixer';
import { VibesPanel } from './components/vibes/VibesPanel';
import { Settings } from './components/settings/Settings';
import { useAppStore } from './state/useAppStore';

export default function App() {
  const libraryOpen = useAppStore(s => s.libraryOpen);

  return (
    <div className="h-[100dvh] w-full bg-background text-foreground flex flex-col overflow-hidden font-sans selection:bg-primary/30">
      <TopNav />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Slide-out Library Drawer */}
        <div
          className={`absolute inset-y-0 left-0 z-30 w-80 transition-transform duration-300 shadow-2xl ${
            libraryOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <MusicLibrary />
        </div>

        {/* Backdrop */}
        {libraryOpen && (
          <div
            className="absolute inset-0 z-20 bg-black/50 backdrop-blur-sm"
            onClick={() => useAppStore.getState().setLibraryOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Decks Row */}
          <div className="flex-1 flex gap-3 p-3 min-h-0">
            <Deck id="A" />
            <Deck id="B" />
          </div>

          {/* Mixer Strip */}
          <div className="shrink-0 px-3 pb-1">
            <Mixer />
          </div>

          {/* Vibes + FX Panel */}
          <div className="shrink-0 px-3 pb-3">
            <VibesPanel />
          </div>
        </div>
      </div>

      <Settings />
    </div>
  );
}

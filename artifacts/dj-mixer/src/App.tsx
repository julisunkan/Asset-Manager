import React from 'react';
import { TopNav } from './components/layout/TopNav';
import { MusicLibrary } from './components/library/MusicLibrary';
import { AIAssistant } from './components/ai/AIAssistant';
import { Deck } from './components/deck/Deck';
import { Mixer } from './components/mixer/Mixer';
import { EffectsRack } from './components/mixer/EffectsRack';

export default function App() {
  return (
    <div className="h-[100dvh] w-full bg-background text-foreground flex flex-col overflow-hidden font-sans selection:bg-primary/30">
      <TopNav />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Library */}
        <div className="w-80 hidden lg:block shrink-0">
          <MusicLibrary />
        </div>
        
        {/* Center Main Area */}
        <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto min-w-[768px]">
          {/* Decks */}
          <div className="flex gap-4 min-h-[320px]">
            <Deck id="A" />
            <Deck id="B" />
          </div>
          
          {/* Mixer and FX */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Mixer />
            </div>
            <div className="w-80 shrink-0">
              <EffectsRack />
            </div>
          </div>
        </div>

        {/* Right Sidebar - AI Assistant */}
        <div className="w-72 hidden xl:block shrink-0">
          <AIAssistant />
        </div>
      </div>
    </div>
  );
}

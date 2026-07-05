import React from 'react';
import { Download, Music2, Shield, Settings as SettingsIcon } from 'lucide-react';
import { useAppStore } from '../../state/useAppStore';

export function TopNav() {
  const libraryOpen = useAppStore(s => s.libraryOpen);
  const setLibraryOpen = useAppStore(s => s.setLibraryOpen);
  const setSettingsOpen = useAppStore(s => s.setSettingsOpen);
  const library = useAppStore(s => s.library);

  return (
    <div className="h-13 border-b border-border bg-card flex items-center justify-between px-4 py-2 shrink-0 gap-4">
      {/* Logo */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
          <DiscIcon />
        </div>
        <h1 className="font-black text-lg tracking-tight">
          <span className="text-foreground">DJ</span>
          <span className="text-primary">&</span>
          <span className="text-foreground">Mixer</span>
        </h1>
      </div>

      {/* Library Toggle */}
      <button
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
          libraryOpen
            ? 'bg-primary/15 border-primary/50 text-primary shadow-[0_0_10px_rgba(0,229,255,0.2)]'
            : 'bg-background border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'
        }`}
        onClick={() => setLibraryOpen(!libraryOpen)}
      >
        <Music2 size={15} />
        Library
        {library.length > 0 && (
          <span
            className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-black"
            style={{ backgroundColor: 'hsl(var(--primary))', color: '#000' }}
          >
            {library.length}
          </span>
        )}
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Status */}
      <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground border border-border rounded-full px-3 py-1 bg-background">
        <Shield size={12} className="text-[#00C853]" />
        100% Local Privacy
      </div>

      {/* Engine status dot */}
      <div className="hidden md:flex items-center gap-2 text-xs font-mono bg-background border border-border px-3 py-1.5 rounded">
        <span className="w-2 h-2 rounded-full bg-[#00C853] shadow-[0_0_6px_#00C853] animate-pulse" />
        LIVE
      </div>

      {/* Settings */}
      <button
        className="p-2 rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground hover:border-muted-foreground/50 transition-colors"
        title="Connected services & API keys"
        onClick={() => setSettingsOpen(true)}
      >
        <SettingsIcon size={15} />
      </button>

      {/* Export */}
      <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold shadow-[0_0_12px_rgba(0,229,255,0.25)] transition-all active:scale-95">
        <Download size={14} />
        Export
      </button>
    </div>
  );
}

function DiscIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary w-5 h-5">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

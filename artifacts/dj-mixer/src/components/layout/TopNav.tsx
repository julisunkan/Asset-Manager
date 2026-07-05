import React, { useState } from 'react';
import { Play, Download, Settings, Menu, Moon, Shield } from 'lucide-react';

export function TopNav() {
  return (
    <div className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
          <DiscIcon />
        </div>
        <h1 className="font-black text-xl tracking-tight mr-6">
          <span className="text-foreground">DJ</span>
          <span className="text-primary">&</span>
          <span className="text-foreground">Mixer</span>
        </h1>
        
        <div className="hidden md:flex items-center gap-2 bg-background border border-border rounded-full px-3 py-1 text-xs font-medium text-muted-foreground">
          <Shield size={14} className="text-[#00C853]" />
          100% Local Privacy
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="text-xs font-mono bg-background border border-border px-3 py-1.5 rounded flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00C853] shadow-[0_0_8px_#00C853] animate-pulse"></span>
          AUDIO ENGINE ACTIVE
        </div>
        
        <button className="h-9 px-4 rounded-md bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border text-sm font-semibold flex items-center gap-2 transition-colors">
          <Settings size={16} />
          Settings
        </button>
        
        <button className="h-9 px-4 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(0,229,255,0.3)] text-sm font-bold flex items-center gap-2 transition-all">
          <Download size={16} />
          Export Mix
        </button>
      </div>
    </div>
  );
}

function DiscIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary w-5 h-5">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 12h.01" />
    </svg>
  );
}

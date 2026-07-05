import React, { useRef, useState } from 'react';
import { Search, Plus, Music, HardDrive, Link, Cloud } from 'lucide-react';
import { useAppStore } from '../../state/useAppStore';
import { TrackInfo } from '../../types';
import { parseID3 } from '../../engine/TrackParser';
import { useListTracks } from '@workspace/api-client-react';
import { applySavedTrack } from '../../lib/librarySync';
import { fingerprintFor } from '../../lib/fingerprint';
import { ImportPanel } from './ImportPanel';

export function MusicLibrary() {
  const library = useAppStore(state => state.library);
  const addTrack = useAppStore(state => state.addTrack);
  const loadToDeck = useAppStore(state => state.loadToDeck);
  const activeFocus = useAppStore(state => state.activeDeckFocus);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Previously-saved track metadata (bpm/key/cues/favorites) keyed by fingerprint,
  // so re-adding the same local file restores everything without re-analyzing.
  const { data: savedTracks } = useListTracks();

  const [showImportPanel, setShowImportPanel] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('audio/')) continue;

      const meta = await parseID3(file);

      let track: TrackInfo = {
        id: crypto.randomUUID(),
        file,
        name: meta.title || file.name,
        artist: meta.artist || 'Unknown Artist',
        album: meta.albumArt || 'Unknown Album',
        genre: 'Unknown',
        duration: 0,
        bpm: null,
        bpmConfidence: 0,
        key: null,
        camelot: null,
        energy: 0,
        mood: 'neutral',
        danceability: 0,
        loudness: 0,
        albumArt: null,
        waveformData: null,
        isFavorite: false,
        colorLabel: null,
        hotCues: [],
        loopIn: null,
        loopOut: null,
      };

      const fingerprint = fingerprintFor(track);
      const saved = fingerprint ? savedTracks?.find((t) => t.fingerprint === fingerprint) : undefined;
      if (saved) {
        track = applySavedTrack(track, saved);
      }

      addTrack(track);
      if (!saved || saved.bpm == null) {
        analyzeTrackFile(track);
      }
    }
  };

  const applyAnalysisResult = (trackId: string, data: Record<string, unknown>) => {
    if (data.status === 'success') {
      useAppStore.getState().updateTrack(trackId, {
        bpm: data.bpm as number | null,
        camelot: data.camelot as string | null,
        key: data.key as string | null,
        energy: data.energy as number,
        danceability: data.danceability as number,
        mood: data.mood as TrackInfo['mood'],
      });
    }
  };

  const makeWorker = (trackId: string) => {
    const worker = new Worker(new URL('../../workers/analysis.worker.ts', import.meta.url), { type: 'module' });
    // Guard: kill worker after 30 s to avoid thread leaks on stalls
    const timeout = window.setTimeout(() => worker.terminate(), 30_000);
    worker.onmessage = (e) => {
      clearTimeout(timeout);
      applyAnalysisResult(trackId, e.data);
      worker.terminate();
    };
    worker.onerror = () => { clearTimeout(timeout); worker.terminate(); };
    worker.onmessageerror = () => { clearTimeout(timeout); worker.terminate(); };
    return worker;
  };

  const analyzeTrackFile = (track: TrackInfo) => {
    if (!track.file) return;
    const worker = makeWorker(track.id);
    track.file.arrayBuffer().then(buffer => {
      worker.postMessage({ action: 'analyze', arrayBuffer: buffer, sampleRate: 44100 }, [buffer]);
    });
  };

  const analyzeTrackUrl = (track: TrackInfo) => {
    if (!track.url) return;
    const worker = makeWorker(track.id);
    worker.postMessage({ action: 'analyzeUrl', url: track.url, sampleRate: 44100 });
  };

  /** Add a track resolved from a streaming-service import (SoundCloud/Audiomack). */
  const handleImportedTrack = (track: TrackInfo) => {
    const fingerprint = fingerprintFor(track);
    const saved = fingerprint ? savedTracks?.find((t) => t.fingerprint === fingerprint) : undefined;
    const finalTrack = saved ? applySavedTrack(track, saved) : track;
    addTrack(finalTrack);
    if (!saved || saved.bpm == null) analyzeTrackUrl(finalTrack);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <div
      className="h-full flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border overflow-hidden"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Search and Filters */}
      <div className="p-4 border-b border-sidebar-border space-y-3 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search library..."
            className="w-full bg-background border border-border rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
          />
        </div>
        <div className="flex gap-2">
          <button
            className="flex-1 bg-primary text-primary-foreground py-1.5 rounded text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/90"
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus size={16} /> Add Music
          </button>
          <button
            className={`px-3 py-1.5 rounded text-sm font-semibold flex items-center justify-center gap-1.5 border transition-colors ${
              showImportPanel
                ? 'bg-primary/15 border-primary/50 text-primary'
                : 'border-border bg-background hover:bg-muted'
            }`}
            title="Import from a streaming service"
            onClick={() => setShowImportPanel(v => !v)}
          >
            <Cloud size={15} />
            <span className="hidden sm:inline">Import</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            multiple
            accept="audio/*"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {showImportPanel && (
          <ImportPanel onAddTrack={handleImportedTrack} onClose={() => setShowImportPanel(false)} />
        )}
      </div>

      {/* Library Table Header */}
      <div className="flex px-4 py-2 bg-background border-b border-sidebar-border text-xs font-bold text-muted-foreground shrink-0 uppercase tracking-wider">
        <div className="w-8"></div>
        <div className="flex-1">Track</div>
        <div className="w-16 text-right">BPM</div>
        <div className="w-16 text-right">Key</div>
        <div className="w-16 text-right pr-2">Energy</div>
      </div>

      {/* Track List */}
      <div className="flex-1 overflow-y-auto">
        {library.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center border-2 border-dashed border-sidebar-border m-4 rounded-xl bg-background/50">
            <HardDrive className="w-12 h-12 mb-4 opacity-50" />
            <p className="font-semibold text-foreground mb-1">Your library is empty</p>
            <p className="text-sm">Drag and drop audio files here, or import from a service</p>
            <p className="text-xs mt-4 text-primary opacity-80">Files stay local · Streams play directly from source</p>
          </div>
        ) : (
          library.map((track, i) => (
            <div
              key={track.id}
              className={`flex px-4 py-3 border-b border-sidebar-border hover:bg-muted/50 cursor-pointer group select-none ${i % 2 === 0 ? 'bg-transparent' : 'bg-background/20'}`}
              onDoubleClick={() => loadToDeck(activeFocus, track.id)}
            >
              <div className="w-8 flex items-center text-muted-foreground">
                {track.url && !track.file
                  ? <Link size={13} className="opacity-50 group-hover:text-primary group-hover:opacity-100" />
                  : <Music size={14} className="opacity-50 group-hover:text-primary group-hover:opacity-100" />
                }
              </div>
              <div className="flex-1 min-w-0 pr-4">
                <div className="font-medium text-sm truncate">{track.name}</div>
                <div className="text-xs text-muted-foreground truncate">{track.artist}</div>
              </div>
              <div className="w-16 text-right flex items-center justify-end text-sm font-mono">
                {track.bpm ? track.bpm.toFixed(1) : '--'}
              </div>
              <div className="w-16 text-right flex items-center justify-end">
                {track.camelot ? (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border border-border font-bold ${track.camelot.endsWith('A') ? 'bg-primary/10 text-primary' : 'bg-[#FFC107]/10 text-[#FFC107]'}`}>
                    {track.camelot}
                  </span>
                ) : '--'}
              </div>
              <div className="w-16 flex items-center justify-end pr-2">
                <div className="w-full h-1.5 bg-background rounded-full overflow-hidden">
                  {track.energy > 0 && (
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${track.energy * 100}%`,
                        backgroundColor: track.energy > 0.7 ? '#FF5252' : track.energy > 0.4 ? '#FFC107' : '#00E5FF'
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

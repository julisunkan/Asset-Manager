import React, { useRef, useState } from 'react';
import { Search, Plus, Music, HardDrive, Link, X, AlertCircle } from 'lucide-react';
import { useAppStore } from '../../state/useAppStore';
import { TrackInfo } from '../../types';
import { parseID3 } from '../../engine/TrackParser';

export function MusicLibrary() {
  const library = useAppStore(state => state.library);
  const addTrack = useAppStore(state => state.addTrack);
  const loadToDeck = useAppStore(state => state.loadToDeck);
  const activeFocus = useAppStore(state => state.activeDeckFocus);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [urlName, setUrlName] = useState('');
  const [urlError, setUrlError] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('audio/')) continue;

      const meta = await parseID3(file);

      const track: TrackInfo = {
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

      addTrack(track);
      analyzeTrackFile(track);
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

  const handleAddUrl = async () => {
    setUrlError('');
    const raw = urlValue.trim();
    if (!raw) {
      setUrlError('Please enter a URL.');
      return;
    }

    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      setUrlError('Invalid URL — please include http:// or https://');
      return;
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      setUrlError('Only http:// and https:// URLs are supported.');
      return;
    }

    setUrlLoading(true);

    // Derive a display name from the URL if none given
    const derivedName = urlName.trim() ||
      decodeURIComponent(parsed.pathname.split('/').filter(Boolean).pop() || parsed.hostname) ||
      'Remote Track';

    const track: TrackInfo = {
      id: crypto.randomUUID(),
      url: raw,
      name: derivedName,
      artist: parsed.hostname,
      album: 'Remote',
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

    addTrack(track);
    analyzeTrackUrl(track);

    setUrlValue('');
    setUrlName('');
    setUrlLoading(false);
    setShowUrlInput(false);
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
            className="px-3 py-1.5 rounded text-sm font-semibold flex items-center justify-center gap-1.5 border border-border bg-background hover:bg-muted transition-colors"
            title="Add from URL"
            onClick={() => { setShowUrlInput(v => !v); setUrlError(''); }}
          >
            <Link size={15} />
            <span className="hidden sm:inline">URL</span>
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

        {/* URL Input Panel */}
        {showUrlInput && (
          <div className="bg-background border border-border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">Stream from URL</span>
              <button onClick={() => { setShowUrlInput(false); setUrlError(''); }} className="text-muted-foreground hover:text-foreground">
                <X size={14} />
              </button>
            </div>
            <input
              type="url"
              placeholder="https://example.com/track.mp3"
              value={urlValue}
              onChange={e => { setUrlValue(e.target.value); setUrlError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') handleAddUrl(); }}
              className="w-full bg-card border border-border rounded px-3 py-1.5 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 font-mono"
              autoFocus
            />
            <input
              type="text"
              placeholder="Track name (optional)"
              value={urlName}
              onChange={e => setUrlName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddUrl(); }}
              className="w-full bg-card border border-border rounded px-3 py-1.5 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
            />
            {urlError && (
              <div className="flex items-center gap-1.5 text-[#FF5252] text-xs">
                <AlertCircle size={12} />
                {urlError}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              The audio server must allow cross-origin requests (CORS). The file is <strong>streamed</strong> — it never downloads to this device in full.
            </p>
            <button
              onClick={handleAddUrl}
              disabled={urlLoading}
              className="w-full py-1.5 rounded bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {urlLoading ? 'Adding…' : 'Add to Library'}
            </button>
          </div>
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
            <p className="text-sm">Drag and drop audio files here, or paste a URL</p>
            <p className="text-xs mt-4 text-primary opacity-80">Files stay local · URLs are streamed directly</p>
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

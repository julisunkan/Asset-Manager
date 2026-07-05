import React, { useState } from 'react';
import { X, Search as SearchIcon, Plus, ExternalLink, AlertCircle, Settings2 } from 'lucide-react';
import { useSearchSoundcloud, useSearchAudiomack, useSearchSpotify } from '@workspace/api-client-react';
import { useAppStore } from '../../state/useAppStore';
import { TrackInfo } from '../../types';

type Service = 'soundcloud' | 'audiomack' | 'spotify';

const TABS: { id: Service; label: string }[] = [
  { id: 'soundcloud', label: 'SoundCloud' },
  { id: 'audiomack', label: 'Audiomack' },
  { id: 'spotify', label: 'Spotify' },
];

function makeRemoteTrack(name: string, artist: string, url: string, duration: number, artworkUrl?: string | null): TrackInfo {
  return {
    id: crypto.randomUUID(),
    url,
    name,
    artist,
    album: 'Remote',
    genre: 'Unknown',
    duration: duration > 0 ? duration : 0,
    bpm: null,
    bpmConfidence: 0,
    key: null,
    camelot: null,
    energy: 0,
    mood: 'neutral',
    danceability: 0,
    loudness: 0,
    albumArt: artworkUrl ?? null,
    waveformData: null,
    isFavorite: false,
    colorLabel: null,
    hotCues: [],
    loopIn: null,
    loopOut: null,
  };
}

interface Props {
  onAddTrack: (track: TrackInfo) => void;
  onClose: () => void;
}

export function ImportPanel({ onAddTrack, onClose }: Props) {
  const [tab, setTab] = useState<Service>('soundcloud');
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const setSettingsOpen = useAppStore(s => s.setSettingsOpen);

  const soundcloud = useSearchSoundcloud({ q: submittedQuery }, { query: { enabled: tab === 'soundcloud' && !!submittedQuery } } as any);
  const audiomack = useSearchAudiomack({ q: submittedQuery }, { query: { enabled: tab === 'audiomack' && !!submittedQuery } } as any);
  const spotify = useSearchSpotify({ q: submittedQuery }, { query: { enabled: tab === 'spotify' && !!submittedQuery } } as any);

  const active = tab === 'soundcloud' ? soundcloud : tab === 'audiomack' ? audiomack : spotify;
  const errorMessage = (active.error as any)?.error || (active.error ? 'Search failed. Check your API credentials in Settings.' : null);

  const handleSearch = () => {
    const q = query.trim();
    if (!q) return;
    setSubmittedQuery(q);
  };

  const handleAdd = (id: string, track: TrackInfo) => {
    onAddTrack(track);
    setAddedIds(prev => new Set(prev).add(id));
  };

  return (
    <div className="bg-background border border-border rounded-lg p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-primary uppercase tracking-wider">Import from Service</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X size={14} />
        </button>
      </div>

      <div className="flex gap-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setSubmittedQuery(''); setQuery(''); }}
            className={`flex-1 py-1 rounded text-xs font-semibold border transition-colors ${
              tab === t.id ? 'bg-primary/15 border-primary/50 text-primary' : 'border-border bg-card text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'spotify' && (
        <p className="text-[10px] text-muted-foreground leading-relaxed bg-muted/50 rounded px-2 py-1.5">
          Spotify blocks raw audio access for third-party apps — results can be opened in Spotify, but not mixed here.
        </p>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder={`Search ${TABS.find(t => t.id === tab)?.label}...`}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
            className="w-full bg-card border border-border rounded pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
            autoFocus
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={!query.trim()}
          className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-40 transition-colors"
        >
          Search
        </button>
      </div>

      {errorMessage && (
        <div className="flex items-start gap-1.5 text-[#FF5252] text-xs">
          <AlertCircle size={12} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            {errorMessage}
            <button
              onClick={() => setSettingsOpen(true)}
              className="ml-1.5 inline-flex items-center gap-1 text-primary hover:underline"
            >
              <Settings2 size={11} /> Open Settings
            </button>
          </div>
        </div>
      )}

      {active.isFetching && (
        <div className="text-xs text-muted-foreground text-center py-2">Searching…</div>
      )}

      {!active.isFetching && submittedQuery && !errorMessage && (
        <div className="max-h-56 overflow-y-auto space-y-1">
          {tab !== 'spotify' &&
            (soundcloud.data || audiomack.data || []).length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-2">No results.</div>
            )}

          {tab === 'soundcloud' &&
            soundcloud.data?.map(t => (
              <ResultRow
                key={t.id}
                name={t.name}
                artist={t.artist}
                artworkUrl={t.artworkUrl}
                added={addedIds.has(t.id)}
                onAdd={() => handleAdd(t.id, makeRemoteTrack(t.name, t.artist, t.streamUrl, t.duration, t.artworkUrl))}
              />
            ))}

          {tab === 'audiomack' &&
            audiomack.data?.map(t => (
              <ResultRow
                key={t.id}
                name={t.name}
                artist={t.artist}
                artworkUrl={t.artworkUrl}
                added={addedIds.has(t.id)}
                onAdd={() => handleAdd(t.id, makeRemoteTrack(t.name, t.artist, t.streamUrl, t.duration, t.artworkUrl))}
              />
            ))}

          {tab === 'spotify' && (spotify.data?.length ?? 0) === 0 && (
            <div className="text-xs text-muted-foreground text-center py-2">No results.</div>
          )}

          {tab === 'spotify' &&
            spotify.data?.map(t => (
              <div key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50">
                {t.albumArt && <img src={t.albumArt} alt="" className="w-8 h-8 rounded object-cover" />}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{t.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{t.artist}</div>
                </div>
                <a
                  href={t.externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded border border-border text-muted-foreground hover:text-primary hover:border-primary/50 shrink-0"
                  title="Open in Spotify"
                >
                  <ExternalLink size={13} />
                </a>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function ResultRow({
  name, artist, artworkUrl, added, onAdd,
}: { name: string; artist: string; artworkUrl?: string | null; added: boolean; onAdd: () => void }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50">
      {artworkUrl && <img src={artworkUrl} alt="" className="w-8 h-8 rounded object-cover" />}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{name}</div>
        <div className="text-xs text-muted-foreground truncate">{artist}</div>
      </div>
      <button
        onClick={onAdd}
        disabled={added}
        className="p-1.5 rounded border border-border text-muted-foreground hover:text-primary hover:border-primary/50 disabled:opacity-40 shrink-0"
        title={added ? 'Added' : 'Add to library'}
      >
        <Plus size={13} />
      </button>
    </div>
  );
}

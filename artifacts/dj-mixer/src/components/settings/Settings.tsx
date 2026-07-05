import React, { useEffect, useState } from 'react';
import { X, KeyRound, Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { useAppStore } from '../../state/useAppStore';
import { useGetSettings, useUpdateSettings } from '@workspace/api-client-react';

interface FieldDef {
  key: 'soundcloudClientId' | 'audiomackApiKey' | 'audiomackApiSecret' | 'spotifyClientId' | 'spotifyClientSecret';
  label: string;
}

interface ServiceDef {
  name: string;
  note: string;
  link: { href: string; label: string };
  fields: FieldDef[];
}

const SERVICES: ServiceDef[] = [
  {
    name: 'SoundCloud',
    note: 'Full mixing support — tracks stream directly into the decks.',
    link: { href: 'https://soundcloud.com/you/apps', label: 'Get a Client ID' },
    fields: [{ key: 'soundcloudClientId', label: 'Client ID' }],
  },
  {
    name: 'Audiomack',
    note: 'Full mixing support — tracks stream directly into the decks.',
    link: { href: 'https://www.audiomack.com/data-api/docs', label: 'Get API credentials' },
    fields: [
      { key: 'audiomackApiKey', label: 'API Key' },
      { key: 'audiomackApiSecret', label: 'API Secret' },
    ],
  },
  {
    name: 'Spotify',
    note: 'Search & browse only — Spotify blocks raw audio access, so results open in Spotify rather than mixing locally.',
    link: { href: 'https://developer.spotify.com/dashboard', label: 'Get Client ID & Secret' },
    fields: [
      { key: 'spotifyClientId', label: 'Client ID' },
      { key: 'spotifyClientSecret', label: 'Client Secret' },
    ],
  },
];

export function Settings() {
  const settingsOpen = useAppStore(s => s.settingsOpen);
  const setSettingsOpen = useAppStore(s => s.setSettingsOpen);
  const { data: status, refetch } = useGetSettings({ query: { enabled: settingsOpen } } as any);
  const { mutateAsync: updateSettings, isPending } = useUpdateSettings();

  const [values, setValues] = useState<Record<string, string>>({});
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (settingsOpen) {
      setValues({});
      setSavedAt(null);
      setError(null);
      refetch();
    }
  }, [settingsOpen, refetch]);

  if (!settingsOpen) return null;

  const handleSave = async () => {
    setError(null);
    const changed = Object.fromEntries(Object.entries(values).filter(([, v]) => v !== undefined));
    if (Object.keys(changed).length === 0) {
      setSettingsOpen(false);
      return;
    }
    try {
      await updateSettings({ data: changed });
      setSavedAt(Date.now());
      setValues({});
      refetch();
    } catch {
      setError('Failed to save settings. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[85vh] flex flex-col bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <KeyRound size={16} className="text-primary" />
            <h2 className="font-bold text-sm">Connected Services</h2>
          </div>
          <button onClick={() => setSettingsOpen(false)} className="text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <p className="text-xs text-muted-foreground leading-relaxed">
            API keys are stored securely on the server and never shown again in full — only a masked preview.
          </p>

          {SERVICES.map(service => (
            <div key={service.name} className="border border-border rounded-lg p-3.5 space-y-2.5 bg-background/50">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">{service.name}</span>
                <a
                  href={service.link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-primary hover:underline flex items-center gap-1"
                >
                  {service.link.label} <ExternalLink size={10} />
                </a>
              </div>
              <p className="text-[11px] text-muted-foreground">{service.note}</p>

              {service.fields.map(field => {
                const s = status?.[field.key];
                return (
                  <div key={field.key} className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      {field.label}
                      {s?.configured && (
                        <span className="text-[#00C853] flex items-center gap-0.5 normal-case font-medium">
                          <CheckCircle2 size={10} /> {s.preview}
                        </span>
                      )}
                    </label>
                    <input
                      type="password"
                      placeholder={s?.configured ? 'Leave blank to keep current value' : `Enter ${field.label}`}
                      value={values[field.key] ?? ''}
                      onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                      className="w-full bg-card border border-border rounded px-3 py-1.5 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 font-mono"
                    />
                  </div>
                );
              })}
            </div>
          ))}

          {error && (
            <div className="flex items-center gap-1.5 text-[#FF5252] text-xs">
              <AlertCircle size={12} /> {error}
            </div>
          )}
          {savedAt && !error && (
            <div className="flex items-center gap-1.5 text-[#00C853] text-xs">
              <CheckCircle2 size={12} /> Settings saved.
            </div>
          )}
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-border shrink-0">
          <button
            onClick={() => setSettingsOpen(false)}
            className="flex-1 py-1.5 rounded border border-border bg-background text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="flex-1 py-1.5 rounded bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : null}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

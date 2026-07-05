/**
 * PlaylistParser — fetches and parses remote playlist files into individual track entries.
 *
 * Supported formats: M3U / M3U8 (extended & plain), PLS, XSPF
 *
 * CORS: the playlist server must send Access-Control-Allow-Origin headers.
 * Individual track URLs within the playlist follow their own CORS rules.
 */

export interface PlaylistEntry {
  url: string;
  name: string;
  artist: string;
  /** Duration in seconds, or -1 if unknown */
  duration: number;
}

/** Detect playlist type by URL extension or Content-Type header. */
function detectFormat(url: string, contentType: string): 'm3u' | 'pls' | 'xspf' | null {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  if (['m3u', 'm3u8'].includes(ext)) return 'm3u';
  if (ext === 'pls') return 'pls';
  if (ext === 'xspf') return 'xspf';

  const ct = contentType.toLowerCase();
  if (ct.includes('mpegurl') || ct.includes('m3u')) return 'm3u';
  if (ct.includes('scpls') || ct.includes('x-pls')) return 'pls';
  if (ct.includes('xspf')) return 'xspf';

  return null;
}

/** Resolve a (possibly relative) URL against the playlist base URL. */
function resolveUrl(base: string, ref: string): string {
  if (/^https?:\/\//i.test(ref)) return ref;
  try { return new URL(ref, base).href; } catch { return ref; }
}

/** Safe decodeURIComponent — falls back to the raw string on malformed sequences. */
function safeDecode(s: string): string {
  try { return decodeURIComponent(s); } catch { return s; }
}

/** Check whether a URL string looks like a playlist without fetching. */
export function looksLikePlaylist(raw: string): boolean {
  const ext = raw.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  return ['m3u', 'm3u8', 'pls', 'xspf'].includes(ext);
}

/**
 * Fetch and parse a playlist URL.
 * Throws if the fetch fails or the format is unrecognised.
 */
export async function parsePlaylistUrl(playlistUrl: string): Promise<PlaylistEntry[]> {
  const response = await fetch(playlistUrl, { mode: 'cors' });
  if (!response.ok) throw new Error(`Server returned HTTP ${response.status}`);

  const contentType = response.headers.get('content-type') ?? '';
  const text = await response.text();

  const format = detectFormat(playlistUrl, contentType);

  if (format === 'pls') return parsePls(text, playlistUrl);
  if (format === 'xspf') return parseXspf(text, playlistUrl);
  if (format === 'm3u') return parseM3u(text, playlistUrl);

  // Unknown format — sniff first line: if it looks like M3U, try it; otherwise throw.
  const firstLine = text.trimStart().slice(0, 8);
  if (firstLine.startsWith('#EXTM3U') || firstLine.startsWith('http') || firstLine.startsWith('/')) {
    return parseM3u(text, playlistUrl);
  }
  throw new Error(
    'Unrecognised playlist format. Supported: .m3u, .m3u8, .pls, .xspf'
  );
}

// ─── M3U / M3U8 ──────────────────────────────────────────────────────────────

function parseM3u(text: string, baseUrl: string): PlaylistEntry[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const entries: PlaylistEntry[] = [];

  let pendingName = '';
  let pendingArtist = '';
  let pendingDuration = -1;

  for (const line of lines) {
    if (line.startsWith('#EXTINF:')) {
      // #EXTINF:<duration>,<artist> - <title>  OR  just <title>
      const rest = line.slice('#EXTINF:'.length);
      const commaIdx = rest.indexOf(',');
      if (commaIdx >= 0) {
        pendingDuration = parseInt(rest.slice(0, commaIdx), 10) || -1;
        const label = rest.slice(commaIdx + 1).trim();
        const dashIdx = label.indexOf(' - ');
        if (dashIdx >= 0) {
          pendingArtist = label.slice(0, dashIdx).trim();
          pendingName = label.slice(dashIdx + 3).trim();
        } else {
          pendingName = label;
          pendingArtist = '';
        }
      }
    } else if (line.startsWith('#')) {
      // Other directives — skip
    } else {
      // A track URL or file path
      const url = resolveUrl(baseUrl, line);
      const fallback = safeDecode(url.split('/').pop()?.split('?')[0] ?? url);
      entries.push({
        url,
        name: pendingName || fallback,
        artist: pendingArtist,
        duration: pendingDuration,
      });
      pendingName = '';
      pendingArtist = '';
      pendingDuration = -1;
    }
  }

  return entries;
}

// ─── PLS ─────────────────────────────────────────────────────────────────────

function parsePls(text: string, baseUrl: string): PlaylistEntry[] {
  const files: Record<number, string> = {};
  const titles: Record<number, string> = {};
  const lengths: Record<number, number> = {};

  for (const line of text.split(/\r?\n/)) {
    const fm = line.match(/^File(\d+)\s*=\s*(.+)$/i);
    if (fm) { files[+fm[1]] = fm[2].trim(); continue; }
    const tm = line.match(/^Title(\d+)\s*=\s*(.+)$/i);
    if (tm) { titles[+tm[1]] = tm[2].trim(); continue; }
    const lm = line.match(/^Length(\d+)\s*=\s*(-?\d+)$/i);
    if (lm) { lengths[+lm[1]] = parseInt(lm[2], 10); }
  }

  return Object.keys(files)
    .map(Number)
    .sort((a, b) => a - b)
    .map(i => {
      const url = resolveUrl(baseUrl, files[i]);
      const title = titles[i] ?? '';
      const dashIdx = title.indexOf(' - ');
      return {
        url,
        name: dashIdx >= 0 ? title.slice(dashIdx + 3).trim() : title || safeDecode(url.split('/').pop() ?? url),
        artist: dashIdx >= 0 ? title.slice(0, dashIdx).trim() : '',
        duration: lengths[i] ?? -1,
      };
    });
}

// ─── XSPF ────────────────────────────────────────────────────────────────────

function parseXspf(text: string, baseUrl: string): PlaylistEntry[] {
  try {
    const doc = new DOMParser().parseFromString(text, 'text/xml');

    // XSPF uses the "http://xspf.org/ns/0/" namespace.
    // querySelectorAll with bare tag names misses namespaced elements in many browsers.
    // getElementsByTagNameNS with '*' (wildcard) matches regardless of namespace.
    const trackEls = Array.from(doc.getElementsByTagNameNS('*', 'track'));

    const getText = (parent: Element, localName: string) =>
      Array.from(parent.getElementsByTagNameNS('*', localName))[0]?.textContent?.trim() ?? '';

    return trackEls
      .map(t => {
        const location = getText(t, 'location');
        const title = getText(t, 'title');
        const creator = getText(t, 'creator');
        const durMs = parseInt(getText(t, 'duration') || '-1000', 10);
        if (!location) return null;
        return {
          url: resolveUrl(baseUrl, location),
          name: title || safeDecode(location.split('/').pop() ?? location),
          artist: creator,
          duration: durMs > 0 ? durMs / 1000 : -1,
        };
      })
      .filter((e): e is PlaylistEntry => e !== null);
  } catch {
    return [];
  }
}

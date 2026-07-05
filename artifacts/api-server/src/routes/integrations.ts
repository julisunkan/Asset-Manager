import { Router, type IRouter } from "express";
import { SearchSoundcloudResponse, SearchAudiomackResponse, SearchSpotifyResponse } from "@workspace/api-zod";
import { getSettingValue } from "./settings";

const router: IRouter = Router();

function getQuery(req: { query: Record<string, unknown> }): string {
  const q = req.query.q;
  return typeof q === "string" ? q.trim() : "";
}

// ── SoundCloud ────────────────────────────────────────────────────────────
// Public search via a registered app's Client ID. Stream URLs are resolved
// with the same client_id so they can be played directly by the local engine.
router.get("/integrations/soundcloud/search", async (req, res) => {
  const q = getQuery(req);
  if (!q) {
    res.status(400).json({ error: "Missing query parameter 'q'." });
    return;
  }

  const clientId = await getSettingValue("soundcloudClientId");
  if (!clientId) {
    res.status(400).json({ error: "SoundCloud Client ID is not configured. Add it in Settings." });
    return;
  }

  try {
    const url = `https://api.soundcloud.com/tracks?q=${encodeURIComponent(q)}&client_id=${encodeURIComponent(clientId)}&limit=20`;
    const resp = await fetch(url);
    if (!resp.ok) {
      res.status(400).json({ error: `SoundCloud API error (${resp.status}). Check your Client ID.` });
      return;
    }
    const raw = (await resp.json()) as unknown[];
    const results = raw
      .filter((t: any) => t?.streamable)
      .map((t: any) => ({
        id: String(t.id),
        name: t.title ?? "Untitled",
        artist: t.user?.username ?? "Unknown Artist",
        duration: typeof t.duration === "number" ? t.duration / 1000 : -1,
        streamUrl: `${t.stream_url}?client_id=${encodeURIComponent(clientId)}`,
        artworkUrl: t.artwork_url ?? null,
        source: "soundcloud" as const,
      }));
    res.json(SearchSoundcloudResponse.parse(results));
  } catch {
    res.status(400).json({ error: "Failed to reach SoundCloud. Check your connection and Client ID." });
  }
});

// ── Audiomack ─────────────────────────────────────────────────────────────
router.get("/integrations/audiomack/search", async (req, res) => {
  const q = getQuery(req);
  if (!q) {
    res.status(400).json({ error: "Missing query parameter 'q'." });
    return;
  }

  const apiKey = await getSettingValue("audiomackApiKey");
  const apiSecret = await getSettingValue("audiomackApiSecret");
  if (!apiKey || !apiSecret) {
    res.status(400).json({ error: "Audiomack API key/secret are not configured. Add them in Settings." });
    return;
  }

  try {
    const url = `https://api.audiomack.com/v1/search/songs?q=${encodeURIComponent(q)}&api_key=${encodeURIComponent(apiKey)}&api_key_secret=${encodeURIComponent(apiSecret)}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      res.status(400).json({ error: `Audiomack API error (${resp.status}). Check your API key/secret.` });
      return;
    }
    const raw = (await resp.json()) as { results?: unknown[] };
    const results = (raw.results ?? []).map((t: any) => ({
      id: String(t.id ?? t.slug ?? crypto.randomUUID()),
      name: t.title ?? "Untitled",
      artist: t.artist ?? t.uploader ?? "Unknown Artist",
      duration: typeof t.duration === "number" ? t.duration : -1,
      streamUrl: t.url ?? t.streaming_url ?? t.audio_url,
      artworkUrl: t.image ?? t.image_base ?? null,
      source: "audiomack" as const,
    })).filter((t: any) => !!t.streamUrl);
    res.json(SearchAudiomackResponse.parse(results));
  } catch {
    res.status(400).json({ error: "Failed to reach Audiomack. Check your connection and credentials." });
  }
});

// ── Spotify ───────────────────────────────────────────────────────────────
// Client Credentials flow: search/browse only. Spotify never exposes raw
// audio to third parties, so results have no stream URL and cannot be mixed.
let spotifyTokenCache: { token: string; expiresAt: number } | null = null;

async function getSpotifyToken(clientId: string, clientSecret: string): Promise<string | null> {
  if (spotifyTokenCache && spotifyTokenCache.expiresAt > Date.now()) {
    return spotifyTokenCache.token;
  }
  const resp = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });
  if (!resp.ok) return null;
  const data = (await resp.json()) as { access_token: string; expires_in: number };
  spotifyTokenCache = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 30) * 1000 };
  return data.access_token;
}

router.get("/integrations/spotify/search", async (req, res) => {
  const q = getQuery(req);
  if (!q) {
    res.status(400).json({ error: "Missing query parameter 'q'." });
    return;
  }

  const clientId = await getSettingValue("spotifyClientId");
  const clientSecret = await getSettingValue("spotifyClientSecret");
  if (!clientId || !clientSecret) {
    res.status(400).json({ error: "Spotify Client ID/Secret are not configured. Add them in Settings." });
    return;
  }

  try {
    const token = await getSpotifyToken(clientId, clientSecret);
    if (!token) {
      res.status(400).json({ error: "Spotify authentication failed. Check your Client ID/Secret." });
      return;
    }
    const resp = await fetch(
      `https://api.spotify.com/v1/search?type=track&limit=20&q=${encodeURIComponent(q)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!resp.ok) {
      res.status(400).json({ error: `Spotify API error (${resp.status}).` });
      return;
    }
    const data = (await resp.json()) as { tracks?: { items?: unknown[] } };
    const results = (data.tracks?.items ?? []).map((t: any) => ({
      id: t.id,
      name: t.name,
      artist: (t.artists ?? []).map((a: any) => a.name).join(", "),
      albumArt: t.album?.images?.[0]?.url ?? null,
      externalUrl: t.external_urls?.spotify ?? `https://open.spotify.com/track/${t.id}`,
    }));
    res.json(SearchSpotifyResponse.parse(results));
  } catch {
    res.status(400).json({ error: "Failed to reach Spotify. Check your connection and credentials." });
  }
});

export default router;

import { upsertTrack as apiUpsertTrack, updateTrack as apiUpdateTrack, deleteTrack as apiDeleteTrack, listTracks as apiListTracks } from '@workspace/api-client-react';
import type { Track as ApiTrack, UpsertTrack, UpdateTrack } from '@workspace/api-client-react';
import { TrackInfo } from '../types';
import { fingerprintFor } from './fingerprint';

const PERSISTED_KEYS = [
  'name', 'artist', 'album', 'genre', 'duration', 'bpm', 'bpmConfidence',
  'key', 'camelot', 'energy', 'mood', 'danceability', 'loudness', 'albumArt',
  'isFavorite', 'colorLabel', 'hotCues', 'loopIn', 'loopOut',
] as const;

type PersistedKey = (typeof PERSISTED_KEYS)[number];

function hasPersistedField(updates: Partial<TrackInfo>): boolean {
  return PERSISTED_KEYS.some((key) => key in updates);
}

function pickPersisted(updates: Partial<TrackInfo>): Partial<Record<PersistedKey, unknown>> {
  const result: Partial<Record<PersistedKey, unknown>> = {};
  for (const key of PERSISTED_KEYS) {
    if (key in updates) result[key] = updates[key];
  }
  return result;
}

function toUpsertPayload(track: TrackInfo, fingerprint: string): UpsertTrack {
  return {
    id: track.id,
    fingerprint,
    name: track.name,
    artist: track.artist,
    album: track.album,
    genre: track.genre,
    duration: track.duration,
    bpm: track.bpm,
    bpmConfidence: track.bpmConfidence,
    key: track.key,
    camelot: track.camelot,
    energy: track.energy,
    mood: track.mood,
    danceability: track.danceability,
    loudness: track.loudness,
    albumArt: track.albumArt,
    isFavorite: track.isFavorite,
    colorLabel: track.colorLabel,
    hotCues: track.hotCues,
    loopIn: track.loopIn,
    loopOut: track.loopOut,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

const patchTimers = new Map<string, ReturnType<typeof setTimeout>>();
const pendingPatches = new Map<string, Partial<Record<PersistedKey, unknown>>>();

function logSyncError(action: string, err: unknown) {
  // Persistence is best-effort — never break the DJ workflow over a sync failure.
  console.warn(`[library-sync] ${action} failed`, err);
}

/** Fire-and-forget: save a newly-added track's metadata to the library. */
export function syncUpsert(track: TrackInfo) {
  const fingerprint = fingerprintFor(track);
  if (!fingerprint) return;
  apiUpsertTrack(toUpsertPayload(track, fingerprint)).catch((err) => logSyncError('upsert', err));
}

/** Debounced: patch only the persisted subset of fields for a track. */
export function syncPatch(id: string, updates: Partial<TrackInfo>) {
  if (!hasPersistedField(updates)) return;

  const existing = pendingPatches.get(id) ?? {};
  pendingPatches.set(id, { ...existing, ...pickPersisted(updates) });

  const prevTimer = patchTimers.get(id);
  if (prevTimer) clearTimeout(prevTimer);

  const timer = setTimeout(() => {
    const payload = pendingPatches.get(id);
    pendingPatches.delete(id);
    patchTimers.delete(id);
    if (!payload) return;
    apiUpdateTrack(id, payload as UpdateTrack).catch((err) => {
      // A 404 just means the track was never persisted (e.g. it has no
      // fingerprint yet) — nothing to do in that case.
      logSyncError('patch', err);
    });
  }, 600);

  patchTimers.set(id, timer);
}

/** Fire-and-forget: remove a track's saved metadata. */
export function syncDelete(id: string) {
  const timer = patchTimers.get(id);
  if (timer) clearTimeout(timer);
  patchTimers.delete(id);
  pendingPatches.delete(id);
  apiDeleteTrack(id).catch((err) => logSyncError('delete', err));
}

/** Fetch all previously-saved track metadata, keyed by fingerprint. */
export async function fetchSavedTracksByFingerprint(): Promise<Map<string, ApiTrack>> {
  const tracks = await apiListTracks();
  return new Map(tracks.map((t) => [t.fingerprint, t]));
}

export function applySavedTrack(track: TrackInfo, saved: ApiTrack): TrackInfo {
  return {
    ...track,
    id: saved.id,
    bpm: saved.bpm ?? track.bpm,
    bpmConfidence: saved.bpmConfidence,
    key: saved.key ?? track.key,
    camelot: saved.camelot ?? track.camelot,
    energy: saved.energy,
    mood: saved.mood as TrackInfo['mood'],
    danceability: saved.danceability,
    loudness: saved.loudness,
    albumArt: saved.albumArt ?? track.albumArt,
    isFavorite: saved.isFavorite,
    colorLabel: saved.colorLabel ?? track.colorLabel,
    hotCues: saved.hotCues,
    loopIn: saved.loopIn ?? track.loopIn,
    loopOut: saved.loopOut ?? track.loopOut,
  };
}

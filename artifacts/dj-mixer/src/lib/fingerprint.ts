import { TrackInfo } from '../types';

/**
 * Derives a stable fingerprint for a track without ever reading or storing
 * the audio itself. Local files are identified by name+size+lastModified;
 * remote tracks are identified by their URL.
 */
export function fingerprintFor(track: Pick<TrackInfo, 'file' | 'url'>): string | null {
  if (track.file) {
    return `file:${track.file.name}:${track.file.size}:${track.file.lastModified}`;
  }
  if (track.url) {
    return `url:${track.url}`;
  }
  return null;
}

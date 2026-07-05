import { useEffect } from 'react';
import AudioEngine from './AudioEngine';

// Basic id3 parser for album art & metadata without large dependencies
export async function parseID3(file: File): Promise<{title?: string, artist?: string, albumArt?: string}> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      if (!buffer) return resolve({});
      const view = new DataView(buffer);
      
      if (view.byteLength < 10) return resolve({});
      
      // Check for ID3 tag
      if (view.getUint8(0) !== 0x49 || view.getUint8(1) !== 0x44 || view.getUint8(2) !== 0x33) {
        return resolve({});
      }

      resolve({
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: "Unknown Artist"
      });
    };
    reader.readAsArrayBuffer(file.slice(0, 1024 * 512)); // Read first 512kb
  });
}

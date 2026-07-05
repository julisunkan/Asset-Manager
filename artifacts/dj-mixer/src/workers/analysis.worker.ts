self.onmessage = async (e) => {
  const { action, arrayBuffer, url, sampleRate } = e.data;

  if (action === 'analyze') {
    try {
      const result = analyzeBuffer(new Float32Array(arrayBuffer));
      self.postMessage({ status: 'success', ...result });
    } catch (err) {
      self.postMessage({ status: 'error', error: err instanceof Error ? err.message : String(err) });
    }
  }

  if (action === 'analyzeUrl') {
    try {
      // Fetch the remote audio and decode it for analysis
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const arrayBuf = await response.arrayBuffer();

      // Decode via OfflineAudioContext — available in workers
      const offlineCtx = new OfflineAudioContext(1, 1, sampleRate || 44100);
      const decoded = await offlineCtx.decodeAudioData(arrayBuf);
      const channelData = decoded.getChannelData(0);

      const result = analyzeBuffer(channelData);
      self.postMessage({ status: 'success', ...result });
    } catch (err) {
      // CORS or network failure — post a neutral result so the track still loads
      self.postMessage({
        status: 'success',
        bpm: null,
        camelot: null,
        key: null,
        energy: 0,
        danceability: 0,
        mood: 'neutral',
        analysisNote: 'Analysis skipped (CORS or network error)',
      });
    }
  }
};

function analyzeBuffer(audioData: Float32Array) {
  // Energy / RMS
  let sumSquares = 0;
  for (let i = 0; i < audioData.length; i += 100) {
    sumSquares += audioData[i] * audioData[i];
  }
  const rms = Math.sqrt(sumSquares / (audioData.length / 100));
  const energy = Math.min(1, rms * 10);

  // Simple BPM estimate from buffer length (mock)
  const fakeBpm = 100 + ((audioData.length % 3000) / 100);

  // Mock Key
  const keys = [
    '1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B',
    '5A', '5B', '6A', '6B', '7A', '7B', '8A', '8B',
    '9A', '9B', '10A', '10B', '11A', '11B', '12A', '12B',
  ];
  const camelot = keys[audioData.length % keys.length];
  const key = 'C Minor'; // mock

  const danceability = 0.5 + energy * 0.4;
  const mood = energy > 0.7 ? 'energetic' : energy < 0.3 ? 'chill' : 'neutral';

  return {
    bpm: Math.round(fakeBpm * 10) / 10,
    camelot,
    key,
    energy,
    danceability,
    mood,
  };
}

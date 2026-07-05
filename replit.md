# DJ & Mixer

A professional browser-based DJ application — dual decks, full mixer, effects, and AI mix assistant — where all audio processing stays 100% local on the user's device.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

- **Audio chain per deck:** source → analyser → eqLow → eqMid → eqHigh → filter → trimGain (knob) → gainNode (volume fader) → crossfaderGainX → masterGain → destination. TrimGain and gainNode are separate so they don't overwrite each other.
- **AudioContext lazy-init:** context created only on first user gesture (required by browser autoplay policy). AudioEngine singleton used everywhere.
- **Web Worker for analysis:** BPM and key detection run in `analysis.worker.ts` via `new Worker(new URL(..., import.meta.url))` — never blocks the UI thread.
- **WaveSurfer.js v7:** uses `wavesurfer.loadBlob(file)` (v7 API), not `load(url)`. Waveform is visualization-only; audio playback is via DeckEngine's AudioBufferSourceNode.
- **FFmpeg.wasm export:** requires COOP/COEP headers for SharedArrayBuffer. Falls back to WAV-only export if headers aren't set.
- **Privacy:** no server endpoints for audio. The Express API server is unused by this app (only /api/healthz exists). Music files stay in browser memory (FileReader/File API only).

## Product

- Dual DJ decks with WaveSurfer.js waveforms, transport controls, BPM/pitch/sync, loops, and 8 hot cues per deck
- Center mixer: crossfader (equal-power curve), channel volume faders, 3-band EQ, filter, VU meters
- Effects rack: reverb, echo/delay, flanger, phaser, compressor, distortion, HPF/LPF, bass/treble boost, stereo width
- Music library: drag & drop or file picker, local ID3 tag parsing, BPM/key detection via Web Worker, search/sort/filter/favorites
- AI Mix Assistant (right sidebar): harmonic compatibility (Camelot wheel), transition suggestions, smart playlists, track energy/mood/danceability analysis
- Export via OfflineAudioContext + FFmpeg.wasm (WAV/MP3) — no upload, never leaves device
- Settings: theme, audio latency, export quality, keyboard shortcuts
- Privacy guarantee: music files never leave the browser

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

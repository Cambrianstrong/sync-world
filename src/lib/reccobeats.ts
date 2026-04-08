/**
 * Reccobeats integration — free AI audio analysis.
 *
 * Flow:
 *   1. POST the audio file bytes to /v1/analysis/audio-features
 *   2. Receive { tempo, key, mode, energy, valence, danceability, ... }
 *   3. Derive a "mood" label from the valence × energy quadrant
 *
 * Docs: https://reccobeats.com/docs
 */

const RECCOBEATS_ENDPOINT = 'https://api.reccobeats.com/v1/analysis/audio-features';

export interface AudioTags {
  mood: string | null;
  moods: string[];
  energy: number | null; // 0–1
  valence: number | null; // 0–1
  danceability: number | null;
  acousticness: number | null;
  instrumentalness: number | null;
  liveness: number | null;
  speechiness: number | null;
  loudness: number | null;
  bpm: number | null;
  key: string | null;
  mode: 'major' | 'minor' | null;
  vocal: 'vocal' | 'instrumental' | null;
  genre: string | null;
  genres: string[];
  raw: unknown;
}

const PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Derive a human mood label from the Russell circumplex (valence × arousal). */
function deriveMood(valence: number | null, energy: number | null): string | null {
  if (valence == null || energy == null) return null;
  const v = valence >= 0.5;
  const e = energy >= 0.5;
  if (v && e) return 'Uplifting';
  if (v && !e) return 'Chill';
  if (!v && e) return 'Intense';
  return 'Melancholic';
}

function deriveMoods(
  valence: number | null,
  energy: number | null,
  dance: number | null,
  acoustic: number | null
): string[] {
  const out: string[] = [];
  const primary = deriveMood(valence, energy);
  if (primary) out.push(primary);
  if (energy != null && energy > 0.75) out.push('Energetic');
  if (energy != null && energy < 0.3) out.push('Mellow');
  if (valence != null && valence > 0.75) out.push('Happy');
  if (valence != null && valence < 0.25) out.push('Dark');
  if (dance != null && dance > 0.7) out.push('Danceable');
  if (acoustic != null && acoustic > 0.6) out.push('Acoustic');
  return Array.from(new Set(out));
}

function formatKey(key: number | null | undefined, mode: number | null | undefined): string | null {
  if (key == null || key < 0 || key > 11) return null;
  const pitch = PITCH_CLASSES[key];
  if (mode === 0) return `${pitch} minor`;
  if (mode === 1) return `${pitch} major`;
  return pitch;
}

/**
 * Analyze an audio file by fetching it from a URL (server-side), then
 * posting the bytes to Reccobeats.
 */
export async function analyzeTrackFromUrl(fileName: string, url: string): Promise<AudioTags> {
  const apiKey = process.env.RECCOBEATS_API_KEY;

  // 1. Fetch the audio bytes — use Range to cap at ~8 MB so we stay under
  // Reccobeats' upload limit. MP3/AAC/OGG decode fine from a truncated stream;
  // large WAVs get their first ~45s of PCM which is enough for analysis.
  const MAX_BYTES = 8 * 1024 * 1024;
  const audioRes = await fetch(url, { headers: { Range: `bytes=0-${MAX_BYTES - 1}` } });
  if (!audioRes.ok && audioRes.status !== 206) {
    throw new Error(`Failed to fetch audio from signed URL: HTTP ${audioRes.status}`);
  }
  let audioBlob = await audioRes.blob();
  // Extra safety: if the server ignored Range and returned the whole file, slice it.
  if (audioBlob.size > MAX_BYTES) {
    audioBlob = audioBlob.slice(0, MAX_BYTES, audioBlob.type || 'audio/mpeg');
  }

  // 2. POST multipart to Reccobeats
  const form = new FormData();
  form.append('audioFile', audioBlob, fileName);

  const headers: Record<string, string> = {};
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const res = await fetch(RECCOBEATS_ENDPOINT, {
    method: 'POST',
    headers,
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Reccobeats HTTP ${res.status}: ${await res.text()}`);
  }

  const data: any = await res.json();

  // Reccobeats returns Spotify-style features. Field names may live at the
  // top level or under `audioFeatures`/`features` depending on API version —
  // normalize defensively.
  const f = data.audioFeatures || data.features || data;

  const tempo = typeof f.tempo === 'number' ? f.tempo : null;
  const keyNum = typeof f.key === 'number' ? f.key : null;
  const modeNum = typeof f.mode === 'number' ? f.mode : null;
  const energy = typeof f.energy === 'number' ? f.energy : null;
  const valence = typeof f.valence === 'number' ? f.valence : null;
  const dance = typeof f.danceability === 'number' ? f.danceability : null;
  const acoustic = typeof f.acousticness === 'number' ? f.acousticness : null;
  const instrumental = typeof f.instrumentalness === 'number' ? f.instrumentalness : null;
  const liveness = typeof f.liveness === 'number' ? f.liveness : null;
  const speech = typeof f.speechiness === 'number' ? f.speechiness : null;
  const loudness = typeof f.loudness === 'number' ? f.loudness : null;

  const vocal: 'vocal' | 'instrumental' | null =
    instrumental == null ? null : instrumental >= 0.5 ? 'instrumental' : 'vocal';

  return {
    mood: deriveMood(valence, energy),
    moods: deriveMoods(valence, energy, dance, acoustic),
    energy,
    valence,
    danceability: dance,
    acousticness: acoustic,
    instrumentalness: instrumental,
    liveness,
    speechiness: speech,
    loudness,
    bpm: tempo != null ? Math.round(tempo) : null,
    key: formatKey(keyNum, modeNum),
    mode: modeNum === 0 ? 'minor' : modeNum === 1 ? 'major' : null,
    vocal,
    genre: null,
    genres: [],
    raw: f,
  };
}

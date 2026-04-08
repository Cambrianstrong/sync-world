/**
 * Cyanite.ai integration — automatic AI tagging for uploaded tracks.
 *
 * Flow:
 *   1. libraryTrackUploadByUrl — tell Cyanite to ingest a public/signed URL
 *   2. Poll libraryTrack until audioAnalysisV7.__typename === 'AudioAnalysisV7Finished'
 *   3. Map the result into our { mood, energy, genre, bpm, key, tags } shape
 *
 * Docs: https://docs.cyanite.ai
 */

const CYANITE_ENDPOINT = 'https://api.cyanite.ai/graphql';

export interface CyaniteTags {
  mood: string | null;
  moods: string[];
  energy: number | null; // 0–1
  valence: number | null; // 0–1
  genre: string | null;
  genres: string[];
  subgenres: string[];
  instruments: string[];
  bpm: number | null;
  key: string | null;
  vocal: 'vocal' | 'instrumental' | null;
  raw: unknown;
}

async function gql<T = any>(query: string, variables: Record<string, unknown>): Promise<T> {
  const token = process.env.CYANITE_API_KEY;
  if (!token) throw new Error('CYANITE_API_KEY not set');

  const res = await fetch(CYANITE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`Cyanite HTTP ${res.status}: ${await res.text()}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(`Cyanite GraphQL error: ${JSON.stringify(json.errors)}`);
  }
  return json.data as T;
}

/** Kick off ingestion from a public/signed URL. Returns the Cyanite library track id. */
export async function uploadTrackByUrl(name: string, url: string): Promise<string> {
  const data = await gql<{
    libraryTrackUploadByUrl:
      | { __typename: 'LibraryTrackUploadByUrlSuccess'; libraryTrack: { id: string } }
      | { __typename: 'Error'; message: string };
  }>(
    `mutation UploadByUrl($input: LibraryTrackUploadByUrlInput!) {
      libraryTrackUploadByUrl(input: $input) {
        __typename
        ... on LibraryTrackUploadByUrlSuccess { libraryTrack { id } }
        ... on Error { message }
      }
    }`,
    { input: { name, url } }
  );

  const r = data.libraryTrackUploadByUrl;
  if (r.__typename !== 'LibraryTrackUploadByUrlSuccess') {
    throw new Error(`Cyanite upload failed: ${(r as any).message}`);
  }
  return r.libraryTrack.id;
}

/** Fetch analysis. Returns null if still processing. */
async function fetchAnalysis(libraryTrackId: string): Promise<CyaniteTags | null> {
  const data = await gql<any>(
    `query LibraryTrack($id: ID!) {
      libraryTrack(id: $id) {
        __typename
        ... on LibraryTrack {
          id
          audioAnalysisV7 {
            __typename
            ... on AudioAnalysisV7Finished {
              result {
                genreTags
                subgenreTags
                moodTags
                instrumentTags
                bpm
                key
                keyPrediction { value confidence }
                vocalGender
                voicePresenceProbability
                valence
                arousal
              }
            }
            ... on AudioAnalysisV7Failed { error { message } }
          }
        }
      }
    }`,
    { id: libraryTrackId }
  );

  const lt = data.libraryTrack;
  if (!lt || lt.__typename !== 'LibraryTrack') return null;
  const a = lt.audioAnalysisV7;
  if (!a) return null;
  if (a.__typename === 'AudioAnalysisV7Failed') {
    throw new Error(`Cyanite analysis failed: ${a.error?.message || 'unknown'}`);
  }
  if (a.__typename !== 'AudioAnalysisV7Finished') return null;

  const r = a.result || {};
  const moods: string[] = r.moodTags || [];
  const genres: string[] = r.genreTags || [];
  const subgenres: string[] = r.subgenreTags || [];
  const instruments: string[] = r.instrumentTags || [];

  const voiceProb = typeof r.voicePresenceProbability === 'number' ? r.voicePresenceProbability : null;

  return {
    mood: moods[0] || null,
    moods,
    energy: typeof r.arousal === 'number' ? r.arousal : null,
    valence: typeof r.valence === 'number' ? r.valence : null,
    genre: genres[0] || null,
    genres,
    subgenres,
    instruments,
    bpm: typeof r.bpm === 'number' ? r.bpm : null,
    key: r.keyPrediction?.value || r.key || null,
    vocal: voiceProb == null ? null : voiceProb >= 0.5 ? 'vocal' : 'instrumental',
    raw: r,
  };
}

/** Poll Cyanite until analysis is ready. Default: up to ~2 minutes. */
export async function waitForAnalysis(
  libraryTrackId: string,
  opts: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<CyaniteTags> {
  const timeoutMs = opts.timeoutMs ?? 120_000;
  const intervalMs = opts.intervalMs ?? 4_000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const tags = await fetchAnalysis(libraryTrackId);
    if (tags) return tags;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Cyanite analysis timed out after ${timeoutMs}ms`);
}

/** One-shot: ingest + wait + return tags. */
export async function analyzeTrackFromUrl(name: string, url: string): Promise<CyaniteTags> {
  const id = await uploadTrackByUrl(name, url);
  return waitForAnalysis(id);
}

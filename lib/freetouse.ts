import { CURATED_TRACKS } from "./curatedTracks";

/** FreeTouse public music API — https://api.freetouse.com/v3 */
const BASE = "https://api.freetouse.com/v3";

export interface FreeTouseTrack {
  id: string;
  title: string;
  artists: [number, { id: string; name: string }][];
  duration: number;
  thumbnails: { sm?: string; md?: string; lg?: string };
  files: { mp3: string };
  /** 300-point normalized waveform (0–100) */
  waveform: number[];
  genre: string | null;
  plays: number;
}

/** Helper to filter curated fallback catalog by keyword or genre */
function getCuratedFallback(query: string, limit = 8): FreeTouseTrack[] {
  const q = (query || "").trim().toLowerCase();
  if (!q || q === "love" || q === "romantic" || q === "trending") {
    return CURATED_TRACKS.slice(0, limit);
  }

  const matched = CURATED_TRACKS.filter((t) => {
    const title = (t.title || "").toLowerCase();
    const artist = (t.artists?.[0]?.[1]?.name || "").toLowerCase();
    const genre = (t.genre || "").toLowerCase();
    return title.includes(q) || artist.includes(q) || genre.includes(q);
  });

  if (matched.length > 0) {
    return matched.slice(0, limit);
  }

  return CURATED_TRACKS.slice(0, limit);
}

/** Search tracks by keyword. Resilient against DNS/network timeouts. */
export async function searchTracks(
  query: string,
  limit = 8
): Promise<FreeTouseTrack[]> {
  const cleanQuery = (query || "love").trim();
  const url = `${BASE}/music/tracks/search?query=${encodeURIComponent(cleanQuery)}&limit=${limit}&order=plays&sort=desc`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(3500),
      next: { revalidate: 120 },
    });

    if (res.ok) {
      const json = await res.json();
      const tracks = (json?.data ?? []) as FreeTouseTrack[];
      if (tracks.length > 0) {
        return tracks;
      }
    }
  } catch {
    // DNS resolution failure (EAI_AGAIN), timeout, or offline — silently fall back
  }

  return getCuratedFallback(cleanQuery, limit);
}

/** Get a single track by UUID. Resilient against DNS/network timeouts. */
export async function getTrack(id: string): Promise<FreeTouseTrack | null> {
  const url = `${BASE}/music/tracks/${id}`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(3500),
      next: { revalidate: 300 },
    });

    if (res.ok) {
      const json = await res.json();
      if (json?.data) {
        return json.data as FreeTouseTrack;
      }
    }
  } catch {
    // Fallback to local curated tracks
  }

  return CURATED_TRACKS.find((t) => t.id === id) ?? null;
}

/** Convenience: pick the primary artist display name from a track. */
export function artistName(track: FreeTouseTrack): string {
  return track.artists?.[0]?.[1]?.name ?? "Unknown Artist";
}


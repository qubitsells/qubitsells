import { NextResponse } from "next/server";

/**
 * Robust regex to parse videoId and starting time (?t=...) from any YouTube URL format:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://music.youtube.com/watch?v=VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - Plain 11-char ID
 */
export function extractYouTubeInfo(input: string): { videoId: string | null; startSeconds: number } {
  if (!input || typeof input !== "string") {
    return { videoId: null, startSeconds: 0 };
  }

  const clean = input.trim();
  let startSeconds = 0;

  // Extract start timestamp: ?t=90 or &t=1m30s or ?start=90
  const timeMatch = clean.match(/[?&](?:t|start)=([0-9mhseconds]+)/i);
  if (timeMatch && timeMatch[1]) {
    const raw = timeMatch[1].toLowerCase();
    if (/^\d+s?$/.test(raw)) {
      startSeconds = parseInt(raw, 10) || 0;
    } else {
      let sec = 0;
      const h = raw.match(/(\d+)h/);
      const m = raw.match(/(\d+)m/);
      const s = raw.match(/(\d+)s/);
      if (h) sec += parseInt(h[1], 10) * 3600;
      if (m) sec += parseInt(m[1], 10) * 60;
      if (s) sec += parseInt(s[1], 10);
      startSeconds = sec;
    }
  }

  // Extract 11-character video ID
  let videoId: string | null = null;
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = clean.match(regExp);

  if (match && match[1]) {
    videoId = match[1];
  } else if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
    videoId = clean;
  }

  return { videoId, startSeconds };
}

// Generate aesthetic simulated waveform (300 points) for visualizers
function generateAestheticWaveform(seed: string): number[] {
  const points: number[] = [];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }

  for (let i = 0; i < 300; i++) {
    const angle = (i / 300) * Math.PI * 16;
    const base = Math.sin(angle) * 25 + Math.cos(angle * 0.5) * 15 + 45;
    const pseudoRandom = Math.abs(Math.sin((i + hash) * 12.9898) * 43758.5453) % 30;
    const val = Math.min(100, Math.max(12, Math.round(base + pseudoRandom)));
    points.push(val);
  }
  return points;
}

async function handleYouTubeQuery(rawQuery: string) {
  if (!rawQuery || !rawQuery.trim()) {
    return NextResponse.json(
      { error: "Please provide a valid YouTube link or video ID" },
      { status: 400 }
    );
  }

  const { videoId, startSeconds } = extractYouTubeInfo(rawQuery);

  if (!videoId) {
    return NextResponse.json(
      {
        error: "Could not recognize a valid YouTube video. Please paste a link like https://youtube.com/watch?v=... or https://youtu.be/...",
      },
      { status: 400 }
    );
  }

  // Default fallback values
  let title = "YouTube Romantic Track";
  let artist = "YouTube Artist";
  let thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  // Fetch official YouTube oEmbed metadata (free, fast, no API key needed)
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      `https://www.youtube.com/watch?v=${videoId}`
    )}&format=json`;

    const res = await fetch(oembedUrl, {
      headers: { "User-Agent": "QubitSells-App/1.0" },
      next: { revalidate: 3600 },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.title) title = data.title;
      if (data.author_name) artist = data.author_name;
      if (data.thumbnail_url) thumbnailUrl = data.thumbnail_url;
    }
  } catch {
    // Fallback already assigned
  }

  const track = {
    id: `yt-${videoId}`,
    title,
    artist,
    thumbnailUrl,
    mp3Url: `https://www.youtube.com/watch?v=${videoId}`,
    duration: 300,
    startAt: startSeconds,
    waveform: generateAestheticWaveform(videoId),
    type: "youtube" as const,
    youtubeId: videoId,
    youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };

  return NextResponse.json({
    success: true,
    track,
    videoId,
    title,
    author: artist,
    artist,
    thumbnailUrl,
    duration: 300,
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawQuery = searchParams.get("url") || searchParams.get("q") || "";
    return await handleYouTubeQuery(rawQuery);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to load YouTube track";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let rawQuery = "";
    const rawText = await request.text();
    if (rawText && rawText.trim()) {
      try {
        const body = JSON.parse(rawText);
        rawQuery = body?.url || body?.q || (typeof body === "string" ? body : "");
      } catch {
        rawQuery = rawText.trim();
      }
    }
    return await handleYouTubeQuery(rawQuery);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to load YouTube track";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

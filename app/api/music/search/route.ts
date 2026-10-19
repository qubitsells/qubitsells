import { NextRequest, NextResponse } from "next/server";
import { searchTracks } from "@/lib/freetouse";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? req.nextUrl.searchParams.get("category") ?? "love";
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? "8"), 20);

  try {
    const tracks = await searchTracks(q.trim() || "love", limit);
    return NextResponse.json({ tracks });
  } catch {
    return NextResponse.json({ tracks: [] });
  }
}

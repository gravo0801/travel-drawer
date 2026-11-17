import { NextResponse } from "next/server";
import { getRecentlyAdded } from "@/lib/posts";
export const dynamic = "force-dynamic";
export function GET() {
  return NextResponse.json({ posts: getRecentlyAdded(10000).map(p => ({
    id:p.id, title:p.title, trip:p.trip, cover:p.cover ?? null, photoCount:p.photoCount
  })) }, { headers: { "Cache-Control": "public, max-age=0, must-revalidate" } });
}

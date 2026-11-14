import fs from "node:fs";
import path from "node:path";
import type { Post, PostSummary } from "./types";

const DIR = path.join(process.cwd(), "content", "posts");

function readAll(): Post[] {
  if (!fs.existsSync(DIR)) return [];
  return fs.readdirSync(DIR)
    .filter((d) => fs.existsSync(path.join(DIR, d, "post.json")))
    .map((d) => JSON.parse(fs.readFileSync(path.join(DIR, d, "post.json"), "utf8")) as Post);
}

function summarize(p: Post): PostSummary {
  const { blocks, ...rest } = p;
  const photos = (blocks ?? []).reduce((n, b) => n + (b.type === "photo" ? 1 : b.type === "gallery" ? b.photos.length : 0), 0);
  const first = (blocks ?? []).find((b) => b.type === "text");
  const excerpt = first && first.type === "text" ? first.text.replace(/\s+/g, " ").slice(0, 120) : undefined;
  return { ...rest, photoCount: p.photoCount ?? photos, excerpt };
}

const byTripDesc = (a: { trip: { date: string } }, b: { trip: { date: string } }) => (a.trip.date < b.trip.date ? 1 : -1);

export function getPosts(): PostSummary[] {
  return readAll().map(summarize).sort(byTripDesc);
}

/** 보관함에 올라온 글 전체(여행 날짜 최신순). */
export function getArchive(): PostSummary[] {
  return getPosts();
}

export function getPost(id: string): Post | null {
  const f = path.join(DIR, id, "post.json");
  if (!/^[\w-]+$/.test(id) || !fs.existsSync(f)) return null;
  return JSON.parse(fs.readFileSync(f, "utf8")) as Post;
}

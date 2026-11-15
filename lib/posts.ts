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

/** 비워 둔 칸은 저장은 빈칸 그대로, 목록에서는 "미정"으로 묶어 보여 줌 */
function summarize(p: Post): PostSummary {
  const { blocks, ...rest } = p;
  rest.title = p.title?.trim() || "(제목 없음)";
  rest.trip = { date: p.trip?.date ?? "", country: p.trip?.country?.trim() || "나라 미정", city: p.trip?.city?.trim() || "도시 미정" };
  const photos = (blocks ?? []).reduce((n, b) => n + (b.type === "photo" ? 1 : b.type === "gallery" ? b.photos.length : 0), 0);
  const first = (blocks ?? []).find((b) => b.type === "text");
  const excerpt = first && first.type === "text" ? first.text.replace(/\s+/g, " ").slice(0, 120) : undefined;
  return { ...rest, photoCount: p.photoCount ?? photos, excerpt: p.summary || excerpt };
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
  const p = JSON.parse(fs.readFileSync(f, "utf8")) as Post;
  p.trip = { date: p.trip?.date ?? "", country: p.trip?.country ?? "", city: p.trip?.city ?? "" };
  return p;
}

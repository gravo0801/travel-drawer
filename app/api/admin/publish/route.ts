import { requireAdmin, json } from "@/lib/server/auth";
import { commitFiles, postExists, listMedia } from "@/lib/server/github";
import type { Post } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

type Item = { post: Post; photos: { file: string; sha: string }[]; overwrite?: boolean };

/** 글 여러 편을 커밋 한 번으로 게시합니다(배포도 한 번). */
export async function POST(req: Request) {
  const who = await requireAdmin(req);
  if (who instanceof Response) return who;
  const { items } = (await req.json()) as { items: Item[] };
  if (!items?.length) return json(400, "게시할 글이 없습니다.");

  const files: { path: string; sha?: string | null; content?: string }[] = [];
  const conflicts: string[] = [];
  for (const { post, photos, overwrite } of items) {
    if (!/^[\w-]+$/.test(post.id)) return json(400, `글 번호가 올바르지 않습니다: ${post.id}`);
    const now = new Date().toISOString();
    post.addedAt = post.addedAt || now; // 수정이면 처음 올린 시각 유지
    if (overwrite) post.updatedAt = now;
    post.trip = { date: post.trip?.date ?? "", country: post.trip?.country ?? "", city: post.trip?.city ?? "" }; // 비워 둔 칸은 빈칸으로 저장
    if (!overwrite && (await postExists(post.id))) { conflicts.push(post.id); continue; }
    for (const ph of photos) {
      if (!/^img-\d{3}\.jpg$/.test(ph.file) || !/^[0-9a-f]{40}$/.test(ph.sha)) return json(400, "사진 정보가 올바르지 않습니다.");
      files.push({ path: `public/media/posts/${post.id}/${ph.file}`, sha: ph.sha });
    }
    files.push({ path: `content/posts/${post.id}/post.json`, content: JSON.stringify(post, null, 1) + "\n" });
    // 수정해서 다시 올릴 때: 이번에 쓰지 않는 예전 사진 파일은 지움
    if (overwrite) {
      const keep = new Set(photos.map((p) => p.file));
      for (const name of await listMedia(post.id)) if (!keep.has(name)) files.push({ path: `public/media/posts/${post.id}/${name}`, sha: null });
    }
  }
  if (conflicts.length) return Response.json({ error: "이미 같은 번호의 글이 있습니다.", conflicts }, { status: 409 });

  try {
    const titles = items.map((i) => i.post.title);
    const msg = items.length === 1 ? `글 게시: ${titles[0]}` : `글 ${items.length}편 게시\n\n${titles.map((t) => "- " + t).join("\n")}`;
    const sha = await commitFiles(files, msg);
    return Response.json({ ok: true, commit: sha, ids: items.map((i) => i.post.id), stamps: Object.fromEntries(items.map((i) => [i.post.id, i.post.updatedAt ?? i.post.addedAt])) });
  } catch (e) { return json(502, (e as Error).message); }
}

import { requireAdmin, json } from "@/lib/server/auth";
import { readPost } from "@/lib/server/github";

export const runtime = "nodejs";

/** 수정할 글의 최신 내용(post.json)을 저장소에서 읽어 옴 */
export async function POST(req: Request) {
  const who = await requireAdmin(req);
  if (who instanceof Response) return who;
  const { id } = (await req.json()) as { id?: string };
  if (!id || !/^[\w-]+$/.test(id)) return json(400, "글 번호가 올바르지 않습니다.");
  try {
    const post = await readPost(id);
    return post ? Response.json({ post }) : json(404, "글을 찾지 못했습니다.");
  } catch (e) { return json(502, (e as Error).message); }
}

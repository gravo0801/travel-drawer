import { requireAdmin, json } from "@/lib/server/auth";
import { createBlob } from "@/lib/server/github";

export const runtime = "nodejs";

/** 사진 한 장을 저장소에 미리 올리고 그 식별값(sha)을 돌려줍니다. 게시 단계에서 한 번에 커밋합니다. */
export async function POST(req: Request) {
  const who = await requireAdmin(req);
  if (who instanceof Response) return who;
  const { base64 } = (await req.json()) as { base64?: string };
  if (!base64 || !/^[A-Za-z0-9+/=]+$/.test(base64)) return json(400, "사진 데이터가 올바르지 않습니다.");
  try { return Response.json({ sha: await createBlob(base64) }); }
  catch (e) { return json(502, (e as Error).message); }
}

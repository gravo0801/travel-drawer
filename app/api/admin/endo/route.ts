import { requireAdmin, json } from "@/lib/server/auth";
import { readEndo } from "@/lib/server/endo";

export const runtime = "nodejs";
export const maxDuration = 15;

/** 관리자 로그인 후에만, 내시경 일별 건수(숫자만)를 돌려줍니다. */
export async function GET(req: Request) {
  const who = await requireAdmin(req);
  if (who instanceof Response) return who;
  try { return Response.json(await readEndo(), { headers: { "cache-control": "no-store" } }); }
  catch (e) { const s = (e as { status?: number }).status ?? 502; return json(s, (e as Error).message); }
}

import { requireAdmin, json } from "@/lib/server/auth";
import { readMt } from "@/lib/server/finance";

export const runtime = "nodejs";
export const maxDuration = 15;

/** 관리자 로그인 후에만, 마통 잔액 요약을 돌려줍니다. */
export async function GET(req: Request) {
  const who = await requireAdmin(req);
  if (who instanceof Response) return who;
  try { return Response.json(await readMt(), { headers: { "cache-control": "no-store" } }); }
  catch (e) { const s = (e as { status?: number }).status ?? 502; return json(s, (e as Error).message); }
}

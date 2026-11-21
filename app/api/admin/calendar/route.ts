import { requireAdmin, json } from "@/lib/server/auth";
import { readCal } from "@/lib/server/gcal";

export const runtime = "nodejs";
export const maxDuration = 20;

/** 관리자 로그인 후에만, 기간(from~to, YYYY-MM-DD) 안의 구글 캘린더 일정을 돌려줍니다. */
export async function GET(req: Request) {
  const who = await requireAdmin(req);
  if (who instanceof Response) return who;
  const q = new URL(req.url).searchParams;
  const ok = (s: string | null) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
  const from = q.get("from"), to = q.get("to");
  if (!ok(from) || !ok(to)) return json(400, "기간 형식이 올바르지 않습니다.");
  if (new Date(to!).getTime() - new Date(from!).getTime() > 100 * 864e5) return json(400, "기간이 너무 깁니다.");
  try { return Response.json({ events: await readCal(from!, to!) }, { headers: { "cache-control": "no-store" } }); }
  catch (e) { const s = (e as { status?: number }).status ?? 502; return json(s, (e as Error).message); }
}

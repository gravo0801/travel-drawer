import { requireAdmin, json } from "@/lib/server/auth";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * 네이버 블로그 사진을 대신 받아 줍니다 (브라우저는 네이버 사진을 직접 읽을 수 없음).
 * 본인 블로그 글을 옮길 때만 쓰며, 네이버 사진 서버 주소만 허용합니다.
 * 큰 원본부터 시도하고, 응답 용량 제한(약 4MB)을 넘으면 한 단계 작은 크기로 받습니다.
 */
const HOST = /(^|\.)(pstatic\.net|naver\.net|naver\.com)$/i;
const LIMIT = 4_200_000;

export async function POST(req: Request) {
  const who = await requireAdmin(req);
  if (who instanceof Response) return who;
  const { url } = (await req.json()) as { url?: string };
  let u: URL;
  try { u = new URL(url ?? ""); } catch { return json(400, "사진 주소가 올바르지 않습니다."); }
  if (u.protocol !== "https:" && u.protocol !== "http:") return json(400, "사진 주소가 올바르지 않습니다.");
  if (!HOST.test(u.hostname)) return json(400, "네이버 사진만 가져올 수 있습니다.");

  const base = `https://${u.hostname}${u.pathname}`;
  const candidates = [...new Set([base, `${base}?type=w3840`, `${base}?type=w966`, `${base}?type=w773`, u.toString().replace(/^http:/, "https:")])];
  for (const c of candidates) {
    try {
      const r = await fetch(c, { headers: { referer: "https://blog.naver.com/", "user-agent": "Mozilla/5.0" }, cache: "no-store" });
      if (!r.ok) continue;
      const type = r.headers.get("content-type") ?? "";
      if (!type.startsWith("image/")) continue;
      const buf = await r.arrayBuffer();
      if (buf.byteLength > LIMIT || buf.byteLength < 500) continue;
      return new Response(buf, { headers: { "content-type": type, "x-source-url": c, "cache-control": "no-store" } });
    } catch { /* 다음 크기로 */ }
  }
  return json(502, "사진을 가져오지 못했습니다.");
}

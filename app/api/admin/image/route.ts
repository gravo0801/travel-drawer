import { requireUser, json } from "@/lib/server/auth";

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
  const who = await requireUser(req);
  if (who instanceof Response) return who;
  const { url } = (await req.json()) as { url?: string };
  let u: URL;
  try { u = new URL(url ?? ""); } catch { return json(400, "사진 주소가 올바르지 않습니다."); }
  if (u.protocol !== "https:" && u.protocol !== "http:") return json(400, "사진 주소가 올바르지 않습니다.");
  if (!HOST.test(u.hostname)) return json(400, "네이버 사진만 가져올 수 있습니다.");

  // 네이버는 크기 옵션 없이 부르면 75px 미리보기를 줌 → 여러 크기를 동시에 받아 가장 큰 것을 고름
  const base = `https://${u.hostname}${u.pathname}`;
  const candidates = [...new Set([`${base}?type=w3840`, `${base}?type=w2`, `${base}?type=w966`, `${base}?type=w773`, u.toString().replace(/^http:/, "https:")])];
  const tried: string[] = [];
  const got = await Promise.all(candidates.map(async (c) => {
    try {
      const r = await fetch(c, { headers: { referer: "https://blog.naver.com/", "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36", accept: "image/avif,image/webp,image/*,*/*" }, cache: "no-store" });
      if (!r.ok) { tried.push(String(r.status)); return null; }
      const type = r.headers.get("content-type") ?? "";
      if (!type.startsWith("image/")) { tried.push(type || "형식?"); return null; }
      const buf = await r.arrayBuffer();
      if (buf.byteLength > LIMIT) { tried.push("용량 큼"); return null; }
      if (buf.byteLength < 500) { tried.push("빈 사진"); return null; }
      return { c, type, buf };
    } catch (e) { tried.push((e as Error).message.slice(0, 40)); return null; }
  }));
  const best = got.filter(Boolean).sort((x, y) => y!.buf.byteLength - x!.buf.byteLength)[0];
  if (best) return new Response(best.buf, { headers: { "content-type": best.type, "x-source-url": best.c, "cache-control": "no-store" } });
  return json(502, `네이버 사진 서버가 응답하지 않았습니다 (${[...new Set(tried)].join(", ")}).`);
}

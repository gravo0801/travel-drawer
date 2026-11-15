import { requireAdmin, json } from "@/lib/server/auth";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * 네이버 블로그 글 화면(HTML)을 대신 받아 줍니다. 글·사진 분리는 브라우저에서 합니다.
 * blog.naver.com 글만 허용합니다.
 */
export async function POST(req: Request) {
  const who = await requireAdmin(req);
  if (who instanceof Response) return who;
  const { blogId, logNo } = (await req.json()) as { blogId?: string; logNo?: string };
  if (!blogId || !logNo || !/^[\w-]+$/.test(blogId) || !/^\d+$/.test(logNo)) return json(400, "네이버 글 주소가 올바르지 않습니다.");
  const headers = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36", referer: `https://blog.naver.com/${blogId}`, "accept-language": "ko-KR,ko;q=0.9" };
  const urls = [
    `https://blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${logNo}&redirect=Dlog&widgetTypeCall=true&directAccess=false`,
    `https://m.blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${logNo}`,
  ];
  for (const u of urls) {
    try {
      const r = await fetch(u, { headers, cache: "no-store" });
      if (!r.ok) continue;
      const html = await r.text();
      if (/se-main-container|postViewArea|se_component_wrap/.test(html)) return Response.json({ html, source: u, url: `https://blog.naver.com/${blogId}/${logNo}` });
    } catch { /* 다음 주소 */ }
  }
  return json(502, "네이버 글을 불러오지 못했습니다. 글이 비공개이거나 주소가 다를 수 있습니다. 대신 [수정하기] 화면에서 복사해 붙여넣어 주세요.");
}

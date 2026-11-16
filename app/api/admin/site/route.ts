import { requireAdmin, json } from "@/lib/server/auth";
import { commitFiles, readText } from "@/lib/server/github";
import { FONTS, SITE_DEFAULT, type SiteConfig, type SiteSlot, type SlotKey } from "@/lib/site";

export const runtime = "nodejs";
export const maxDuration = 60;

type InSlot = { sha?: string; src?: string; w: number; h: number; fx: number; fy: number } | null;
const KEYS: SlotKey[] = ["hero", "archive", "footer"];
const num = (n: unknown, lo: number, hi: number, d: number) => (typeof n === "number" && isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : d);

/** 화면 설정(테마·정렬·글꼴·큰 사진 3곳)을 저장소에 커밋 → 모든 기기에 같은 모습으로 적용 */
export async function POST(req: Request) {
  const who = await requireAdmin(req);
  if (who instanceof Response) return who;
  const b = (await req.json()) as { theme?: string; align?: string; fonts?: { t?: string; b?: string }; slots?: Partial<Record<SlotKey, InSlot>> };
  const fid = new Set<string>(FONTS.map((f) => f.id));
  const next: SiteConfig = {
    v: new Date().toISOString(),
    theme: b.theme === "light" ? "light" : "dark",
    align: b.align === "left" || b.align === "right" ? b.align : "center",
    fonts: { t: fid.has(b.fonts?.t ?? "") ? b.fonts!.t! : SITE_DEFAULT.fonts.t, b: fid.has(b.fonts?.b ?? "") ? b.fonts!.b! : SITE_DEFAULT.fonts.b },
    slots: {},
  };

  let old: SiteConfig = SITE_DEFAULT;
  try { const t = await readText("content/site.json"); if (t) old = { ...SITE_DEFAULT, ...JSON.parse(t) }; } catch {}

  const files: { path: string; sha?: string | null; content?: string }[] = [];
  const stamp = Date.now().toString(36);
  for (const k of KEYS) {
    const s = b.slots?.[k];
    if (!s) continue;
    const base = { w: num(s.w, 1, 20000, 2400), h: num(s.h, 1, 20000, 1350), fx: num(s.fx, 0, 100, 50), fy: num(s.fy, 0, 100, 50) };
    let slot: SiteSlot;
    if (s.sha) {
      if (!/^[0-9a-f]{40}$/.test(s.sha)) return json(400, "사진 정보가 올바르지 않습니다.");
      const src = `/media/site/custom/${k}-${stamp}.jpg`;
      files.push({ path: "public" + src, sha: s.sha });
      slot = { src, ...base };
    } else if (s.src && old.slots[k]?.src === s.src) slot = { src: s.src, ...base };
    else continue;
    next.slots[k] = slot;
  }
  // 바뀌었거나 기본 그림으로 되돌려서 더는 쓰지 않는 예전 사진 파일은 지움
  for (const k of KEYS) {
    const o = old.slots[k]?.src;
    if (o && o.startsWith("/media/site/custom/") && next.slots[k]?.src !== o) files.push({ path: "public" + o, sha: null });
  }
  files.push({ path: "content/site.json", content: JSON.stringify(next, null, 1) + "\n" });

  try {
    await commitFiles(files, "화면 설정 저장 (모든 기기 공통)");
    return Response.json({ ok: true, v: next.v });
  } catch (e) { return json(502, (e as Error).message); }
}

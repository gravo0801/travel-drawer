import { requireAdmin, json } from "@/lib/server/auth";
import { commitFiles, readText } from "@/lib/server/github";
import { DASH_DEFAULT, DASH_WIDGETS, FONTS, SITE_DEFAULT, type DashCfg, type SiteConfig } from "@/lib/site";

export const runtime = "nodejs";

const PALETTES = ["sage", "ocean", "lavender", "peach", "rose", "sand", "ink"];

/** 대시보드 꾸밈 설정을 content/site.json 의 dashboard 칸에 저장 → 모든 기기 공통 */
export async function POST(req: Request) {
  const who = await requireAdmin(req);
  if (who instanceof Response) return who;
  const b = (await req.json()) as Partial<DashCfg>;
  const fid = new Set<string>(FONTS.map((f) => f.id));
  const wid = new Set<string>(DASH_WIDGETS);
  const cfg: DashCfg = {
    v: new Date().toISOString(),
    palette: PALETTES.includes(b.palette ?? "") ? b.palette! : DASH_DEFAULT.palette,
    accent: /^#[0-9a-f]{6}$/i.test(b.accent ?? "") ? b.accent! : "",
    titleFont: fid.has(b.titleFont ?? "") ? b.titleFont! : DASH_DEFAULT.titleFont,
    bodyFont: fid.has(b.bodyFont ?? "") ? b.bodyFont! : DASH_DEFAULT.bodyFont,
    size: b.size === "s" || b.size === "l" ? b.size : "m",
    widgets: Array.isArray(b.widgets) ? [...new Set(b.widgets.filter((w) => wid.has(w)))] : DASH_DEFAULT.widgets,
    hero: /^(site|post:[\w-]+)$/.test(b.hero ?? "") ? b.hero! : "site",
    heroCaption: String(b.heroCaption ?? "").replace(/[\r\n]+/g, " ").slice(0, 60),
  };
  let site: SiteConfig = SITE_DEFAULT;
  try { const t = await readText("content/site.json"); if (t) site = { ...SITE_DEFAULT, ...JSON.parse(t) }; } catch {}
  site.dashboard = cfg;
  try {
    await commitFiles([{ path: "content/site.json", content: JSON.stringify(site, null, 1) + "\n" }], "대시보드 화면 설정 저장");
    return Response.json({ ok: true, v: cfg.v });
  } catch (e) { return json(502, (e as Error).message); }
}

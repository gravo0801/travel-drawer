import fs from "node:fs";
import path from "node:path";
import { SITE_DEFAULT, type SiteConfig } from "./site";

/** content/site.json 읽기 (서버 전용). 없거나 깨져 있으면 기본값. */
export function loadSite(): SiteConfig {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(process.cwd(), "content", "site.json"), "utf8")) as Partial<SiteConfig>;
    return { ...SITE_DEFAULT, ...j, fonts: { ...SITE_DEFAULT.fonts, ...(j.fonts ?? {}) }, slots: j.slots ?? {} };
  } catch { return SITE_DEFAULT; }
}

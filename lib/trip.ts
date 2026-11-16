/** 같은 여행 묶기: 여행 연월(YYYY-MM) + 나라 */
type T = { trip: { date: string; country: string }; series?: string; title?: string };

/** 여행 연월. 날짜 칸이 연도뿐이거나 비었으면 여행 묶음 이름(2026.01 …)에서 찾음 */
export function tripMonth(p: T): string {
  const d = p.trip.date ?? "";
  if (/^\d{4}-\d{2}/.test(d)) return d.slice(0, 7);
  const s = p.series?.match(/(\d{4})[.\-/](\d{1,2})/);
  if (s) return `${s[1]}-${s[2].padStart(2, "0")}`;
  return d.slice(0, 4);
}
export const tripKey = (p: T) => `${tripMonth(p)}|${p.trip.country}`;
/** 제목의 "N일차" */
export function dayNo(title = ""): number | null {
  const m = title.match(/(\d{1,2})\s*일\s*차/);
  return m ? +m[1] : null;
}
/** 여행 안의 글 순서: 일차 → 올린 순 */
export function byDay<P extends T & { addedAt?: string; publishedAt?: string }>(a: P, b: P) {
  const da = dayNo(a.title), db = dayNo(b.title);
  if (da !== null && db !== null && da !== db) return da - db;
  if (da !== null && db === null) return -1;
  if (da === null && db !== null) return 1;
  return (a.trip.date || "").localeCompare(b.trip.date || "") || (a.addedAt ?? a.publishedAt ?? "").localeCompare(b.addedAt ?? b.publishedAt ?? "");
}
export const seriesName = (month: string, country: string) => (/^\d{4}-\d{2}$/.test(month) && country ? `${month.replace("-", ".")} ${country}` : "");

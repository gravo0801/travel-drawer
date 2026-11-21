/** 구글 캘린더 비공개 iCal 주소(GCAL_ICS, 여러 개면 쉼표로 구분)에서 기간 안의 일정만 뽑습니다. (서버 전용) */
import ical from "node-ical";

export type CalEvent = { title: string; start: string; end: string; allDay: boolean; cal: number; where?: string };
type Ev = ical.VEvent & { recurrences?: Record<string, ical.VEvent>; exdate?: Record<string, unknown> };

const kst = (d: Date) => d.toLocaleString("sv-SE", { timeZone: "Asia/Seoul" }).replace(" ", "T").slice(0, 16);
const pad = (n: number) => String(n).padStart(2, "0");
/** 종일 일정은 날짜만 가진 값이라 서버 시간대와 상관없이 "그 날짜"를 그대로 읽습니다. */
const day = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const txt = (v: unknown) => (typeof v === "string" ? v : v && typeof v === "object" && "val" in v ? String((v as { val: unknown }).val) : "");

export async function readCal(from: string, to: string): Promise<CalEvent[]> {
  const urls = (process.env.GCAL_ICS || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!urls.length) throw Object.assign(new Error("GCAL_ICS 환경변수가 없습니다."), { status: 503 });
  const a = new Date(from + "T00:00:00+09:00"), b = new Date(to + "T23:59:59+09:00");
  const out: CalEvent[] = [];

  await Promise.all(urls.map(async (u, ci) => {
    const r = await fetch(u.replace(/^webcal:/, "https:"), { next: { revalidate: 300 } });
    if (!r.ok) throw Object.assign(new Error(`캘린더를 읽지 못했습니다 (${r.status}). 주소를 확인해 주세요.`), { status: 502 });
    const data = ical.parseICS(await r.text());
    for (const k of Object.keys(data)) {
      const ev = data[k] as Ev;
      if (!ev || ev.type !== "VEVENT" || !ev.start) continue;
      const allDay = ev.datetype === "date" || (ev.start as Date & { dateOnly?: boolean }).dateOnly === true;
      const len = ev.end ? ev.end.getTime() - ev.start.getTime() : 0;
      const push = (s: Date, e: Date, src: Ev) => {
        if (e < a && s < a || s > b) return;
        const title = txt(src.summary) || "(제목 없음)";
        const where = txt(src.location) || undefined;
        if (allDay) { const last = new Date(Math.max(s.getTime(), e.getTime() - 864e5)); out.push({ title, start: day(s), end: day(last), allDay: true, cal: ci, where }); }
        else out.push({ title, start: kst(s), end: kst(e), allDay: false, cal: ci, where });
      };
      if (ev.rrule) {
        const base = ev.rrule.options.dtstart as Date;
        const dates = ev.rrule.between(new Date(a.getTime() - len - 864e5), new Date(b.getTime() + 864e5), true);
        for (const d of dates) {
          const s = new Date(ev.start.getTime() + (d.getTime() - base.getTime()));
          const key = day(s);
          if (ev.exdate && (ev.exdate[key] || Object.keys(ev.exdate).some((x) => x.slice(0, 10) === key))) continue;
          const ov = ev.recurrences?.[key];
          if (ov?.start) push(ov.start, ov.end ?? ov.start, ov); else push(s, new Date(s.getTime() + len), ev);
        }
      } else push(ev.start, ev.end ?? ev.start, ev);
    }
  }));
  const rank = (e: CalEvent) => e.start + (e.allDay ? "" : "~");
  return out.sort((x, y) => (rank(x) < rank(y) ? -1 : 1)).slice(0, 600);
}

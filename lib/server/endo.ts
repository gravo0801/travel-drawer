/**
 * 내시경 앱(EndoApp)의 일별 시술 건수만 읽어 옵니다. (서버 전용)
 * 환자 정보가 들어 있는 필드(실패 케이스 상세 등)는 요청하지 않고, 숫자 건수 필드만 가져옵니다.
 */
import { dec, DEFAULT_KEY } from "./finance";

const PROJECT = "endoapp-cc066";
const USER = "endoapp-user-01"; // EndoApp 소스에 고정된 사용자 칸 이름
const FIELDS = ["key", "egd", "cfs", "cpp", "bxe", "emr", "bxc", "clo", "failureCount"] as const;

export type EndoRow = { k: string; egd: number; cfs: number; cpp: number; bxe: number; emr: number; bxc: number; clo: number; fail: number };
export type EndoData = { today: string; from: string; rows: EndoRow[]; at: string };

const num = (n: unknown) => (Number.isFinite(+(n as number)) && +(n as number) >= 0 ? +(n as number) : 0);
export const kstToday = (now = Date.now()) => new Date(now + 9 * 3600e3).toISOString().slice(0, 10);

/** 지난달 1일부터 오늘까지의 일별 건수 */
export async function readEndo(now = Date.now()): Promise<EndoData> {
  const today = kstToday(now);
  const y = +today.slice(0, 4), m = +today.slice(5, 7);
  const from = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 10);
  const key = process.env.GF_FIREBASE_KEY || DEFAULT_KEY;
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${USER}:runQuery?key=${encodeURIComponent(key)}`;
  const body = {
    structuredQuery: {
      from: [{ collectionId: "days" }],
      select: { fields: FIELDS.map((fieldPath) => ({ fieldPath })) },
      where: { fieldFilter: { field: { fieldPath: "key" }, op: "GREATER_THAN_OR_EQUAL", value: { stringValue: from } } },
      orderBy: [{ field: { fieldPath: "key" }, direction: "ASCENDING" }],
      limit: 100,
    },
  };
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
  if (r.status === 403 || r.status === 401) throw Object.assign(new Error("EndoApp 데이터를 읽을 권한이 없습니다 (403). Firestore 규칙을 확인해 주세요."), { status: 502 });
  if (!r.ok) throw Object.assign(new Error(`EndoApp 데이터를 읽지 못했습니다 (${r.status}).`), { status: 502 });
  const out = (await r.json()) as { document?: { fields?: Record<string, { [k: string]: unknown }> } }[];
  const rows: EndoRow[] = [];
  for (const o of Array.isArray(out) ? out : []) {
    const f = o.document?.fields; if (!f) continue;
    const k = dec(f.key as never);
    if (typeof k !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(k) || k > today) continue;
    const v = (n: string) => num(dec(f[n] as never));
    rows.push({ k, egd: v("egd"), cfs: v("cfs"), cpp: v("cpp"), bxe: v("bxe"), emr: v("emr"), bxc: v("bxc"), clo: v("clo"), fail: v("failureCount") });
  }
  return { today, from, rows, at: new Date(now).toISOString() };
}

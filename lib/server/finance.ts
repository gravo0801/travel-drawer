/** 마통 앱(gravo-finance)의 Firestore 문서에서 우리은행 마이너스통장 잔액만 읽어 옵니다. (서버 전용) */
const PROJECT = "endoapp-cc066";
const COLL = "gravo_finance_v2";
export const DEFAULT_KEY = "AIzaSyAN7s01gb9AsmeMVdgWGY6pllX9cm1SLJ0"; // 마통 앱에 이미 공개된 웹 키 (비밀 아님)

type FV = { [k: string]: unknown };
export function dec(v: FV | undefined): unknown {
  if (!v) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return Number(v.doubleValue);
  if ("booleanValue" in v) return v.booleanValue;
  if ("timestampValue" in v) return v.timestampValue;
  if ("arrayValue" in v) return (((v.arrayValue as FV).values as FV[]) ?? []).map(dec);
  if ("mapValue" in v) { const o: Record<string, unknown> = {}; const f = ((v.mapValue as FV).fields as Record<string, FV>) ?? {}; for (const k of Object.keys(f)) o[k] = dec(f[k]); return o; }
  return null;
}

export type Mt = { balance: number; date: string; limit: number; goal: number; points: { d: string; v: number }[]; prev?: { d: string; v: number } };
type Tx = { date?: string; time?: string; seq?: number; type?: string; account?: string; balance?: number | null };

export async function readMt(): Promise<Mt> {
  const code = process.env.GF_CODE;
  if (!code) throw Object.assign(new Error("GF_CODE 환경변수가 없습니다."), { status: 503 });
  const key = process.env.GF_FIREBASE_KEY || DEFAULT_KEY;
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${COLL}/${encodeURIComponent(code)}__mt?key=${encodeURIComponent(key)}&mask.fieldPaths=ref&mask.fieldPaths=tx`;
  const r = await fetch(url, { cache: "no-store" });
  if (r.status === 404) throw Object.assign(new Error("마통 앱에서 이 동기화 코드의 데이터를 찾지 못했습니다."), { status: 404 });
  if (!r.ok) throw Object.assign(new Error(`마통 데이터를 읽지 못했습니다 (${r.status}).`), { status: 502 });
  const f = ((await r.json()) as { fields?: Record<string, FV> }).fields ?? {};
  const ref = (dec(f.ref) as Record<string, unknown>) ?? {};
  const tx = (dec(f.tx) as Record<string, Tx>) ?? {};

  const m = new Map<string, number>();
  const hist = Array.isArray(ref.history) ? (ref.history as { date?: string; balance?: number }[]) : [];
  hist.forEach((h) => { if (h.date && Number.isFinite(+(h.balance as number))) m.set(h.date, +(h.balance as number)); });
  const sorted = Object.values(tx)
    .filter((t) => t.type === "bank" && t.account === "우리" && t.date && Number.isFinite(t.balance as number))
    .sort((a, b) => (a.date! < b.date! ? -1 : a.date! > b.date! ? 1 : String(a.time || "") < String(b.time || "") ? -1 : String(a.time || "") > String(b.time || "") ? 1 : (a.seq || 0) - (b.seq || 0)));
  sorted.forEach((t) => m.set(t.date!, t.balance as number));
  const points = [...m.entries()].map(([d, v]) => ({ d, v })).sort((a, b) => (a.d < b.d ? -1 : 1));
  if (!points.length) throw Object.assign(new Error("우리은행 잔액 기록이 아직 없습니다."), { status: 404 });

  const last = points[points.length - 1];
  const cut = new Date(new Date(last.d + "T00:00:00Z").getTime() - 30 * 864e5).toISOString().slice(0, 10);
  const prev = [...points].reverse().find((p) => p.d <= cut);
  const cfg = (ref.config as { od_limit_man?: number }) ?? {};
  return { balance: last.v, date: last.d, limit: (cfg.od_limit_man || 15000) * 10000, goal: 50000000, points: points.slice(-40), prev };
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { doc, getDoc, getFirestore, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { firebaseApp } from "@/lib/firebase";
import Icon from "./Icon";
import "./voucher.css";

type ActivityKind = "reserved" | "used";
type Activity = { id: string; kind: ActivityKind; date: string; count: number; note: string };
export type Voucher = {
  id: string; issuer: string; card: string; title: string; period: string;
  quota: number; expiresAt: string; note: string; activities: Activity[];
};
type SyncMode = "loading" | "local" | "cloud";
type VoucherForm = Omit<Voucher, "id" | "activities"> & { id: string };
type ActivityForm = { voucherId: string; kind: ActivityKind; date: string; count: number; note: string };

const nowKst = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
const text = (v: unknown, n = 160) => (typeof v === "string" ? v : "").trim().slice(0, n);
const date = (v: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(text(v)) && !Number.isNaN(Date.parse(text(v))) ? text(v) : "";
const positive = (v: unknown, max = 100) => Math.max(1, Math.min(max, Math.trunc(Number(v) || 1)));
const count = (v: unknown, max = 100) => Math.max(0, Math.min(max, Math.trunc(Number(v) || 0)));
const localKey = (id: string) => `drawer.vouchers.v1.${id}`;
const cloudKey = (id: string) => `drawer.vouchers.cloud.v1.${id}`;
const dirtyKey = (id: string) => `drawer.vouchers.dirty.v1.${id}`;

function normalise(input: unknown): Voucher[] {
  if (!Array.isArray(input)) return [];
  const unique = new Map<string, Voucher>();
  for (const raw of input.slice(0, 150)) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    const issuer = text(o.issuer, 60), card = text(o.card, 100), title = text(o.title, 120);
    if (!issuer || !title) continue;
    const activities: Activity[] = [];
    if (Array.isArray(o.activities)) for (const r of o.activities.slice(0, 100)) {
      if (!r || typeof r !== "object") continue;
      const a = r as Record<string, unknown>;
      if (a.kind !== "reserved" && a.kind !== "used") continue;
      activities.push({ id: text(a.id, 80) || uid(), kind: a.kind, date: date(a.date) || nowKst(), count: positive(a.count), note: text(a.note, 300) });
    }
    const v: Voucher = {
      id: text(o.id, 80) || uid(), issuer, card, title, period: text(o.period, 30) || String(new Date().getFullYear()),
      quota: positive(o.quota), expiresAt: date(o.expiresAt), note: text(o.note, 700), activities,
    };
    unique.set(v.id, v);
  }
  return [...unique.values()];
}

const totals = (v: Voucher) => {
  const used = v.activities.filter(a => a.kind === "used").reduce((n, a) => n + a.count, 0);
  const reserved = v.activities.filter(a => a.kind === "reserved").reduce((n, a) => n + a.count, 0);
  return { used, reserved, remaining: Math.max(0, v.quota - used - reserved) };
};
const daysTo = (ymd: string) => Math.round((Date.parse(ymd + "T00:00:00Z") - Date.parse(nowKst() + "T00:00:00Z")) / 86400000);
const status = (v: Voucher) => {
  const t = totals(v);
  if (t.remaining > 0 && v.expiresAt && daysTo(v.expiresAt) < 0) return "expired";
  if (t.remaining === 0 && t.reserved === 0) return "used";
  if (t.reserved > 0) return "reserved";
  return "available";
};
const statusText: Record<ReturnType<typeof status>, string> = { used: "사용 완료", reserved: "예약·적용", available: "사용 가능", expired: "기간 만료" };
const blank = (): VoucherForm => ({
  id: "", issuer: "", card: "", title: "", period: String(+nowKst().slice(0, 4)),
  quota: 1, expiresAt: "", note: "",
});

function useVoucherStore(user: User | null) {
  const [items, setItems] = useState<Voucher[]>([]);
  const [mode, setMode] = useState<SyncMode>("loading");
  const [cloudOn, setCloudOn] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);

  useEffect(() => {
    if (!user) return;
    let cached: Voucher[] = [];
    try { cached = normalise(JSON.parse(localStorage.getItem(localKey(user.uid)) || "[]")); } catch {}
    setItems(cached);
    const enabled = localStorage.getItem(cloudKey(user.uid)) === "1";
    if (enabled !== cloudOn) { setCloudOn(enabled); return; }
    if (!enabled) { setMode("local"); return; }
    const app = firebaseApp();
    if (!app) { setMode("local"); setMessage("Firebase 연결 설정을 확인해 주세요."); return; }
    let dead = false;
    setMode("loading");
    const ref = doc(getFirestore(app), "drawer_voucher_ledgers", user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      if (dead || pending.current) return;
      if (localStorage.getItem(dirtyKey(user.uid)) === "1") {
        setMode("local");
        setMessage("이 기기에 동기화되지 않은 변경 사항이 있습니다. JSON 백업 후 '클라우드로 저장'을 눌러 반영하세요.");
        return;
      }
      if (snap.exists()) {
        const fresh = normalise(snap.data().items);
        setItems(fresh);
        try { localStorage.setItem(localKey(user.uid), JSON.stringify(fresh)); } catch {}
      } else if (cached.length) {
        setMode("local");
        setMessage("클라우드에 아직 기록이 없습니다. '클라우드로 저장'을 눌러 로컬 기록을 올리세요.");
        return;
      }
      setMode("cloud"); setMessage("");
    }, (err) => {
      if (dead) return;
      setMode("local");
      setMessage(`클라우드 접근 실패 (${err.code || "권한 또는 DB 설정"}). 이 기기에만 저장 중입니다.`);
    });
    return () => { dead = true; unsub(); };
  }, [user?.uid, cloudOn]);

  async function save(input: Voucher[]) {
    if (!user) return;
    const next = normalise(input);
    pending.current = true;
    setItems(next);
    try { localStorage.setItem(localKey(user.uid), JSON.stringify(next)); } catch {}
    if (!cloudOn || !firebaseApp()) { setMode("local"); pending.current = false; return; }
    setBusy(true);
    try {
      const ref = doc(getFirestore(firebaseApp()!), "drawer_voucher_ledgers", user.uid);
      await setDoc(ref, { schema: 1, items: next, updatedAt: serverTimestamp() });
      localStorage.removeItem(dirtyKey(user.uid));
      setMode("cloud"); setMessage("");
    } catch (e) {
      localStorage.setItem(dirtyKey(user.uid), "1");
      setMode("local");
      setMessage(`클라우드 저장 실패: ${(e as Error).message}. 로컬에는 저장되었습니다.`);
    } finally { pending.current = false; setBusy(false); }
  }

  async function connect() {
    if (!user) return;
    const app = firebaseApp();
    if (!app) { setMessage("Firebase 로그인 설정이 없습니다."); return; }
    setBusy(true);
    try {
      const ref = doc(getFirestore(app), "drawer_voucher_ledgers", user.uid);
      const snap = await getDoc(ref);
      const remote = snap.exists() ? normalise(snap.data().items) : [];
      if (items.length && remote.length && JSON.stringify(items) !== JSON.stringify(remote) &&
          !window.confirm("이 기기 기록으로 기존 클라우드 기록을 덮어쓰시겠습니까? 먼저 JSON 백업을 권장합니다.")) return;
      const chosen = items.length ? items : remote;
      if (items.length || !snap.exists()) await setDoc(ref, { schema: 1, items: chosen, updatedAt: serverTimestamp() });
      try {
        localStorage.setItem(cloudKey(user.uid), "1");
        localStorage.setItem(localKey(user.uid), JSON.stringify(chosen));
        localStorage.removeItem(dirtyKey(user.uid));
      } catch {}
      setItems(chosen); setCloudOn(true); setMode("cloud"); setMessage("클라우드 연결이 완료되었습니다.");
    } catch (e) {
      setMode("local");
      setMessage(`클라우드 연결 실패: ${(e as Error).message}. Firestore DB와 보안 규칙을 확인해 주세요.`);
    } finally { setBusy(false); }
  }

  return { items, mode, cloudOn, message, busy, save, connect };
}

export function VoucherWidget({ user, onOpen }: { user: User | null; onOpen: () => void }) {
  const { items, mode } = useVoucherStore(user);
  const used = items.reduce((n, v) => n + totals(v).used, 0);
  const reserved = items.reduce((n, v) => n + totals(v).reserved, 0);
  const available = items.reduce((n, v) => n + (status(v) === "expired" ? 0 : totals(v).remaining), 0);
  const upcoming = items.filter(v => v.expiresAt && totals(v).remaining > 0 && daysTo(v.expiresAt) >= 0)
    .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt)).slice(0, 3);
  return (
    <div className="vch-widget">
      <div className="vch-metrics">
        <div><b>{available}</b><small>사용 가능</small></div>
        <div><b>{reserved}</b><small>예약·적용</small></div>
        <div><b>{used}</b><small>사용 완료</small></div>
      </div>
      {items.length === 0 ? <p className="vch-empty">카드별 혜택을 등록하면 사용 현황과 만료일이 이곳에 표시됩니다.</p>
        : <ul className="vch-next">{upcoming.length ? upcoming.map(v => <li key={v.id}>
            <span><b>{v.title}</b><small>{v.issuer} · {v.card}</small></span>
            <em className={daysTo(v.expiresAt) <= 30 ? "vch-urgent" : ""}>D-{daysTo(v.expiresAt)}</em>
          </li>) : <li className="vch-all-done">만료 예정인 미사용 혜택이 없습니다.</li>}</ul>}
      <div className="vch-bottom"><span><Icon n="lock" size={13} />{mode === "cloud" ? "클라우드 동기화" : mode === "loading" ? "확인 중" : "이 기기에 저장"}</span>
        <button className="addl" onClick={onOpen}>카드 혜택 관리 <Icon n="arrow" size={14} /></button>
      </div>
    </div>
  );
}

export function VoucherManager({ user }: { user: User | null }) {
  const store = useVoucherStore(user);
  const [editing, setEditing] = useState<VoucherForm | null>(null);
  const [activity, setActivity] = useState<ActivityForm | null>(null);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [alert, setAlert] = useState("");
  const file = useRef<HTMLInputElement | null>(null);
  const periods = useMemo(() => [...new Set(store.items.map(v => v.period))].sort().reverse(), [store.items]);
  const list = useMemo(() => store.items
    .filter(v => (filter === "all" || v.period === filter) && `${v.issuer} ${v.card} ${v.title} ${v.note}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => (a.expiresAt || "9999").localeCompare(b.expiresAt || "9999") || a.issuer.localeCompare(b.issuer)), [store.items, filter, query]);

  async function saveBenefit() {
    if (!editing || !editing.issuer.trim() || !editing.title.trim()) { setAlert("카드사와 혜택 이름을 입력해 주세요."); return; }
    const old = store.items.find(x => x.id === editing.id);
    if (old && positive(editing.quota) < totals(old).used + totals(old).reserved) { setAlert("총 제공 횟수가 이미 사용·예약된 횟수보다 작을 수 없습니다."); return; }
    const v: Voucher = { ...editing, id: editing.id || uid(), issuer: editing.issuer.trim(), card: editing.card.trim(), title: editing.title.trim(),
      quota: positive(editing.quota), period: editing.period.trim() || String(new Date().getFullYear()), expiresAt: editing.expiresAt, note: editing.note.trim(),
      activities: store.items.find(x => x.id === editing.id)?.activities ?? [] };
    await store.save([...store.items.filter(x => x.id !== v.id), v]);
    setEditing(null); setAlert("");
  }
  async function addActivity() {
    if (!activity) return;
    const v = store.items.find(x => x.id === activity.voucherId);
    if (!v) return;
    const t = totals(v);
    if (activity.count > t.remaining) { setAlert(`남은 수량은 ${t.remaining}회입니다.`); return; }
    const next = store.items.map(x => x.id === v.id ? { ...x, activities: [...x.activities, {
      id: uid(), kind: activity.kind, date: activity.date || nowKst(), count: positive(activity.count), note: activity.note.trim().slice(0, 300),
    }] } : x);
    await store.save(next);
    setActivity(null); setAlert("");
  }
  async function removeBenefit(id: string) {
    if (!window.confirm("이 혜택과 사용 내역을 모두 삭제하시겠습니까?")) return;
    await store.save(store.items.filter(v => v.id !== id));
  }
  async function removeActivity(benefitId: string, recordId: string) {
    if (!window.confirm("이 사용 기록을 삭제하시겠습니까?")) return;
    await store.save(store.items.map(v => v.id === benefitId ? { ...v, activities: v.activities.filter(a => a.id !== recordId) } : v));
  }
  async function confirmUsage(benefitId: string, recordId: string) {
    await store.save(store.items.map(v => v.id === benefitId ? { ...v, activities: v.activities.map(a => a.id === recordId ? { ...a, kind: "used" as const, date: nowKst() } : a) } : v));
  }
  function exportJson() {
    const data = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), vouchers: store.items }, null, 2);
    const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = `drawer-vouchers-${nowKst()}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importJson(f: File | undefined) {
    if (!f) return;
    if (f.size > 1024 * 1024) { setAlert("JSON 파일은 1MB 이하만 가져올 수 있습니다."); return; }
    try {
      const parsed = JSON.parse(await f.text()) as unknown;
      const obj = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
      const raw = Array.isArray(parsed) ? parsed : obj.vouchers;
      const fresh = normalise(raw);
      if (!fresh.length) throw new Error("유효한 카드 혜택 기록이 없습니다.");
      const merged = new Map(store.items.map(v => [v.id, v]));
      fresh.forEach(v => merged.set(v.id, v));
      if (merged.size > 150) throw new Error("최대 150개까지 저장할 수 있습니다.");
      await store.save([...merged.values()]);
      setAlert(`${fresh.length}개의 기록을 가져왔습니다. 같은 ID는 최신 파일로 대체했습니다.`);
    } catch (e) { setAlert("가져오기 실패: " + (e as Error).message); }
    if (file.current) file.current.value = "";
  }

  return (
    <main className="pg vch-page">
      <div className="hello">
        <div><p className="xeye">Your benefits, in one place</p><h1>카드 혜택 <em>관리</em></h1><p className="lead">항공·호텔 바우처부터 라운지·쿠폰까지 사용 여부를 구분해 기록합니다.</p></div>
        <button className="xbtn xpri" onClick={() => { setEditing(blank()); setActivity(null); }}><Icon n="plus" size={17} />혜택 추가</button>
      </div>
      <div className="vch-toolbar xcard">
        <div className="vch-sync"><span className={"vch-led " + (store.mode === "cloud" ? "ok" : "loc")} />
          <div><b>{store.mode === "cloud" ? "클라우드 동기화" : store.mode === "loading" ? "연결 확인 중" : "브라우저에만 저장"}</b>
            <small>{store.mode === "cloud" ? "로그인한 기기 사이에 기록이 공유됩니다." : "현재 기기의 데이터입니다. JSON 백업을 권장합니다."}</small></div></div>
        <div className="vch-actions">
          <button className="xbtn line xsm" onClick={exportJson}><Icon n="move" size={15} />JSON 백업</button>
          <button className="xbtn line xsm" onClick={() => file.current?.click()}>JSON 가져오기</button>
          <input ref={file} type="file" accept=".json,application/json" hidden onChange={e => void importJson(e.target.files?.[0])} />
          {store.mode !== "cloud" && <button className="xbtn line xsm" disabled={store.busy} onClick={() => void store.connect()}>{store.busy ? "연결 중…" : "클라우드로 저장"}</button>}
        </div>
      </div>
      {(store.message || alert) && <p className="vch-notice" role="status">{alert || store.message}</p>}
      <div className="vch-filters">
        <input aria-label="혜택 검색" placeholder="카드사 · 카드명 · 혜택 검색" value={query} onChange={e => setQuery(e.target.value)} />
        <select aria-label="혜택 연도" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">전체 기간</option>{periods.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <span>{list.length}개 혜택</span>
      </div>
      {!list.length && <div className="xcard vch-blank"><Icon n="note" size={26} /><b>아직 등록된 혜택이 없습니다.</b>
        <p>상단의 ‘혜택 추가’에서 한도와 만료일을 설정하고, 사용 또는 예약 내역을 기록하세요.</p>
        <button className="xbtn xpri xsm" onClick={() => setEditing(blank())}>첫 혜택 등록</button>
      </div>}
      <div className="vch-list">
        {list.map(v => { const t = totals(v), st = status(v), remain = v.expiresAt ? daysTo(v.expiresAt) : null; return (
          <article key={v.id} className="xcard vch-item">
            <div className="vch-cardhead">
              <div><small>{v.issuer} · {v.card || "카드명 미입력"} · {v.period}</small><h3>{v.title}</h3></div>
              <span className={"vch-status " + st}>{statusText[st]}</span>
            </div>
            <div className="vch-progress" aria-label={`사용 ${t.used}회, 예약 ${t.reserved}회, 잔여 ${t.remaining}회`}>
              <span style={{ width: `${Math.min(100, t.used / v.quota * 100)}%` }} className="used" />
              <span style={{ width: `${Math.min(100, t.reserved / v.quota * 100)}%` }} className="reserved" />
            </div>
            <div className="vch-stats"><span>사용 <b>{t.used}</b></span><span>예약 <b>{t.reserved}</b></span><span>잔여 <b>{t.remaining}</b> / {v.quota}</span>
              {v.expiresAt && <span className={remain !== null && remain >= 0 && remain <= 30 && t.remaining > 0 ? "vch-warning" : ""}>만료 {v.expiresAt}{remain !== null && remain >= 0 ? ` (D-${remain})` : ""}</span>}
            </div>
            {v.note && <p className="vch-note">{v.note}</p>}
            {v.activities.length > 0 && <ul className="vch-history">{[...v.activities].reverse().map(a => (
              <li key={a.id}><span className={"vch-dot " + a.kind} />
                <span><b>{a.kind === "used" ? "사용 완료" : "예약·적용"} {a.count}회</b><small>{a.date}{a.note ? " · " + a.note : ""}</small></span>
                {a.kind === "reserved" && <button className="vch-smallbtn" onClick={() => void confirmUsage(v.id, a.id)}>이용 완료로 전환</button>}
                <button className="vch-smallbtn" aria-label="기록 삭제" onClick={() => void removeActivity(v.id, a.id)}>삭제</button>
              </li>
            ))}</ul>}
            <div className="vch-cardactions">
              <button className="xbtn line xsm" disabled={!t.remaining} onClick={() => { setActivity({ voucherId: v.id, kind: "reserved", date: nowKst(), count: 1, note: "" }); setEditing(null); }}>예약·적용 기록</button>
              <button className="xbtn line xsm" disabled={!t.remaining} onClick={() => { setActivity({ voucherId: v.id, kind: "used", date: nowKst(), count: 1, note: "" }); setEditing(null); }}>사용 완료 기록</button>
              <button className="vch-smallbtn" onClick={() => { setEditing({ ...v }); setActivity(null); }}>수정</button>
              <button className="vch-smallbtn" onClick={() => void removeBenefit(v.id)}>삭제</button>
            </div>
            {activity?.voucherId === v.id && <div className="vch-subform">
              <strong>{activity.kind === "reserved" ? "예약·적용" : "사용 완료"} 기록</strong>
              <div className="vch-fields">
                <label>날짜<input type="date" value={activity.date} onChange={e => setActivity({ ...activity, date: e.target.value })} /></label>
                <label>횟수<input type="number" min="1" max={t.remaining} value={activity.count} onChange={e => setActivity({ ...activity, count: +e.target.value })} /></label>
                <label className="wide">설명<input maxLength={300} placeholder="예: 방콕 호텔 예약 시 바우처 적용" value={activity.note} onChange={e => setActivity({ ...activity, note: e.target.value })} /></label>
              </div>
              <div className="vch-formactions"><button className="xbtn line xsm" onClick={() => setActivity(null)}>취소</button><button className="xbtn xpri xsm" disabled={store.busy} onClick={() => void addActivity()}>기록 저장</button></div>
            </div>}
          </article>
        ); })}
      </div>
      {editing && <div className="scrim2" onClick={() => setEditing(null)}>
        <div className="dlg vch-dialog" role="dialog" aria-modal="true" aria-label="카드 혜택 편집" onClick={e => e.stopPropagation()}>
          <header><div><p className="xeye">Benefit editor</p><h2>{editing.id ? "혜택 수정" : "새 카드 혜택"}</h2></div><button className="ibtn" aria-label="닫기" onClick={() => setEditing(null)}><Icon n="close" /></button></header>
          {alert && <p className="vch-notice" role="alert" style={{ margin: "12px 24px 0" }}>{alert}</p>}
          <div className="vch-fields">
            <label>카드사 *<input maxLength={60} placeholder="예: KB국민카드" value={editing.issuer} onChange={e => setEditing({ ...editing, issuer: e.target.value })} /></label>
            <label>카드명<input maxLength={100} placeholder="예: ROVL" value={editing.card} onChange={e => setEditing({ ...editing, card: e.target.value })} /></label>
            <label className="wide">혜택 이름 *<input maxLength={120} placeholder="예: 호텔 20만원 바우처" value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} /></label>
            <label>혜택 귀속 연도/기간<input maxLength={30} placeholder="예: 2026" value={editing.period} onChange={e => setEditing({ ...editing, period: e.target.value })} /></label>
            <label>총 제공 횟수<input type="number" min="1" max="100" value={editing.quota} onChange={e => setEditing({ ...editing, quota: +e.target.value })} /></label>
            <label className="wide">사용 만료일 (선택)<input type="date" value={editing.expiresAt} onChange={e => setEditing({ ...editing, expiresAt: e.target.value })} /></label>
            <label className="wide">메모<textarea rows={3} maxLength={700} placeholder="적용 조건·주의사항 등. 카드번호·인증정보는 입력하지 마세요." value={editing.note} onChange={e => setEditing({ ...editing, note: e.target.value })} /></label>
          </div>
          <footer><p className="hint">카드번호, 인증코드, 예약번호 등 민감한 식별정보는 저장하지 않는 것이 안전합니다.</p>
            <div className="xrow"><button className="xbtn line" onClick={() => setEditing(null)}>취소</button>
              <button className="xbtn xpri" disabled={store.busy} onClick={() => void saveBenefit()}><Icon n="check" size={16} />저장</button></div></footer>
        </div>
      </div>}
      <p className="priv vch-footer"><Icon n="lock" size={13} />이 데이터는 공개 GitHub 저장소에 기록되지 않습니다. Firestore 보안 규칙 적용 전에는 로컬 보관을 이용하세요.</p>
    </main>
  );
}

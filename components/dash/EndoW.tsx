"use client";
import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import Icon from "./Icon";
import { useRefreshPulse } from "./useRefreshPulse";

type Row = { k: string; egd: number; cfs: number; cpp: number; bxe: number; emr: number; bxc: number; clo: number; fail: number };
type Data = { today: string; from: string; rows: Row[]; at: string };
type Scope = "today" | "week" | "month";

const APP = "https://gravo0801.github.io/endoapp/";
const DAY = ["일", "월", "화", "수", "목", "금", "토"];
const utc = (k: string) => new Date(k + "T00:00:00Z");
const key = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (k: string, n: number) => { const d = utc(k); d.setUTCDate(d.getUTCDate() + n); return key(d); };
const dow = (k: string) => DAY[utc(k).getUTCDay()];
const md = (k: string) => `${+k.slice(5, 7)}월 ${+k.slice(8)}일`;
const sum = (rows: Row[]) => rows.reduce((a, r) => ({ egd: a.egd + r.egd, cfs: a.cfs + r.cfs, cpp: a.cpp + r.cpp, bxe: a.bxe + r.bxe, emr: a.emr + r.emr, bxc: a.bxc + r.bxc, clo: a.clo + r.clo, fail: a.fail + r.fail }), { egd: 0, cfs: 0, cpp: 0, bxe: 0, emr: 0, bxc: 0, clo: 0, fail: 0 });
const chips = [["cpp", "용종절제"], ["emr", "EMR"], ["bxe", "위 Bx"], ["bxc", "대장 Bx"], ["clo", "CLO"], ["fail", "진입 실패"]] as const;

/** 내시경 앱의 일별·월별 건수 — 열 때마다 최신 값을 읽어 오므로 EndoApp에 입력하면 그대로 반영됩니다 */
export default function EndoW({ user }: { user: User | null }) {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [scope, setScope] = useState<Scope>("month");
  const tick = useRefreshPulse(5 * 60_000);
  useEffect(() => {
    if (!user) return; let off = false;
    (async () => {
      try {
        const r = await fetch("/api/admin/endo", { headers: { authorization: `Bearer ${await user.getIdToken()}` }, cache: "no-store" });
        const j = await r.json();
        if (off) return; if (!r.ok) setErr(j.error || "불러오지 못했습니다."); else { setD(j); setErr(""); }
      } catch { if (!off) setErr("네트워크 오류로 불러오지 못했습니다."); }
    })();
    return () => { off = true; };
  }, [user, tick]);

  const v = useMemo(() => {
    if (!d) return null;
    const by = new Map(d.rows.map((r) => [r.k, r]));
    const t = d.today, ym = t.slice(0, 7), pym = key(new Date(Date.UTC(+t.slice(0, 4), +t.slice(5, 7) - 2, 1))).slice(0, 7);
    const dn = +t.slice(8);
    const inR = (a: string, b: string) => d.rows.filter((r) => r.k >= a && r.k <= b);
    const range = scope === "today" ? [t, t] : scope === "week" ? [addDays(t, -6), t] : [ym + "-01", t];
    const prev = scope === "today" ? [addDays(t, -1), addDays(t, -1)] : scope === "week" ? [addDays(t, -13), addDays(t, -7)] : [pym + "-01", pym + "-" + String(dn).padStart(2, "0")];
    const rows = inR(range[0], range[1]), pr = inR(prev[0], prev[1]);
    const s = sum(rows), ps = sum(pr);
    const last = new Date(Date.UTC(+t.slice(0, 4), +t.slice(5, 7), 0)).getUTCDate();
    const bars = Array.from({ length: last }, (_, i) => { const k = ym + "-" + String(i + 1).padStart(2, "0"); const r = by.get(k); return { k, day: i + 1, egd: r?.egd ?? 0, cfs: r?.cfs ?? 0, fut: k > t }; });
    const mx = Math.max(10, ...bars.map((b) => b.egd + b.cfs));
    const label = scope === "today" ? `${md(t)} (${dow(t)})` : scope === "week" ? `${md(range[0])} ~ ${md(t)}` : `${+ym.slice(0, 4)}년 ${+ym.slice(5)}월`;
    const cmp = scope === "today" ? "어제" : scope === "week" ? "지난 7일" : "지난달 같은 날까지";
    return { s, total: s.egd + s.cfs, prevTotal: ps.egd + ps.cfs, days: rows.filter((r) => r.egd + r.cfs > 0).length, bars, mx, label, cmp, t };
  }, [d, scope]);

  if (err) return <div className="en"><p className="mt-note">{err}</p><a className="xbtn line xsm" href={APP} target="_blank" rel="noopener"><Icon n="open" size={15} />EndoApp 열기</a></div>;
  if (!d || !v) return <div className="en"><p className="mt-note">불러오는 중…</p></div>;
  const { s, total } = v, diff = total - v.prevTotal;
  const ratio = total ? (s.egd / total) * 100 : 50;
  return (
    <div className="en">
      <div className="en-tabs" role="tablist" aria-label="기간">
        {([["today", "오늘"], ["week", "7일"], ["month", "이번 달"]] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={scope === k} onClick={() => setScope(k)}>{l}</button>)}
      </div>
      <div className="en-top">
        <div className="en-n"><b>{total.toLocaleString()}<em>건</em></b><small>{v.label}{scope !== "today" && v.days > 0 ? ` · 근무 ${v.days}일` : ""}</small></div>
        <div className="en-sp">
          <span className="en-e"><i />위내시경 <b>{s.egd.toLocaleString()}</b></span>
          <span className="en-c"><i />대장내시경 <b>{s.cfs.toLocaleString()}</b></span>
        </div>
      </div>
      <div className="en-split" role="img" aria-label={`위 ${s.egd}건, 대장 ${s.cfs}건`}><u style={{ width: ratio + "%" }} /></div>
      <p className={"en-df " + (diff >= 0 ? "en-up" : "en-dn")}>
        {v.prevTotal === 0 && total === 0 ? <>{scope === "today" ? "오늘 입력된 기록이 아직 없어요." : "이 기간에 기록이 없어요."}</>
          : <>{v.cmp}보다 <b>{diff === 0 ? "같아요" : `${diff > 0 ? "▲" : "▼"} ${Math.abs(diff)}건`}</b><span> ({v.cmp} {v.prevTotal.toLocaleString()}건)</span></>}
      </p>
      <ul className="en-chips">{chips.map(([k, l]) => <li key={k} className={s[k] ? "" : "z"}><span>{l}</span><b>{s[k].toLocaleString()}</b></li>)}</ul>
      <div className="en-chart" aria-label="이번 달 일별 건수">
        <div className="en-bars">{v.bars.map((b) => (
          <div key={b.k} className={"b" + (b.k === v.t ? " now" : "") + (b.fut ? " fut" : "")} title={`${md(b.k)} (${dow(b.k)}) · 위 ${b.egd} · 대장 ${b.cfs}`}>
            <span className="st"><i className="c" style={{ height: (b.cfs / v.mx) * 100 + "%" }} /><i className="e" style={{ height: (b.egd / v.mx) * 100 + "%" }} /></span>
          </div>
        ))}</div>
        <div className="en-ax" aria-hidden="true">{v.bars.map((b) => <span key={b.k}>{b.day === 1 || b.day % 5 === 0 || b.k === v.t ? b.day : ""}</span>)}</div>
      </div>
      <div className="mt-ft"><small>EndoApp에 입력하면 자동 반영 · 기준일 {md(d.today)}</small><a href={APP} target="_blank" rel="noopener">EndoApp 열기 <Icon n="open" size={14} /></a></div>
    </div>
  );
}

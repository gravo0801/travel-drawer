"use client";
import { useEffect, useMemo, useState } from "react";
import Icon from "./Icon";
import { ALL_CODES, cname } from "@/lib/visitedCodes";

type MapData = typeof import("@/lib/worldmap");

/** 다녀온 나라 지도 — 지도(또는 검색)에서 눌러 표시, 저장하면 모든 기기에 반영 */
export default function VisitedW({ visited, derived, setVisited, saved, save }: {
  visited: string[]; derived: Set<string>; setVisited: (v: string[]) => void; saved: string[]; save: (v: string[]) => Promise<string>;
}) {
  const [map, setMap] = useState<MapData | null>(null);
  const [q, setQ] = useState(""); const [tip, setTip] = useState(""); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const [base, setBase] = useState(saved);
  useEffect(() => { let on = true; import("@/lib/worldmap").then((m) => { if (on) setMap(m); }); return () => { on = false; }; }, []);

  const mine = useMemo(() => new Set(visited), [visited]);
  const all = useMemo(() => new Set([...visited, ...derived]), [visited, derived]);
  const changed = JSON.stringify(visited) !== JSON.stringify(base);
  const list = useMemo(() => [...all].sort((a, b) => cname(a).localeCompare(cname(b), "ko")), [all]);
  const found = useMemo(() => {
    const k = q.replace(/\s/g, "").toLowerCase(); if (!k) return [];
    return ALL_CODES.filter((c) => cname(c).replace(/\s/g, "").includes(k)).slice(0, 8);
  }, [q]);

  function toggle(c: string) {
    setMsg("");
    if (derived.has(c) && !mine.has(c)) { setTip(`${cname(c)} — 블로그 여행기에서 자동으로 표시된 나라예요.`); return; }
    const n = new Set(mine); const was = n.has(c); if (was) n.delete(c); else n.add(c);
    setVisited([...n].sort()); setTip(was ? `${cname(c)} 표시를 뺐어요.` : `${cname(c)} 표시했어요.`);
  }
  async function doSave() { setBusy(true); const m = await save(visited); setMsg(m); if (m.startsWith("저장했")) setBase(visited); setBusy(false); }

  return (
    <div className="vm">
      <div className="vm-top">
        <div className="vm-n"><b>{all.size}</b><span>개 국가·지역</span></div>
        <p className="vm-tip" aria-live="polite">{tip || "지도에서 나라를 누르면 다녀온 곳으로 표시돼요."}</p>
      </div>
      <div className="vm-map">
        {map ? (
          <svg viewBox={`0 0 ${map.MAP_W} ${map.MAP_H}`} role="img" aria-label="세계 지도 — 다녀온 나라는 강조색으로 표시">
            {map.MAP_PATHS.map(([c, d]) => (
              <path key={c} d={d} className={all.has(c) ? (mine.has(c) ? "on" : "auto") : ""} onClick={() => toggle(c)}><title>{cname(c)}</title></path>
            ))}
          </svg>
        ) : <div className="vm-load">지도를 불러오는 중…</div>}
      </div>

      <label className="vm-search"><Icon n="search" size={16} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="나라 이름으로 찾기 (예: 싱가포르)" aria-label="나라 검색" />
      </label>
      {found.length > 0 && <ul className="vm-found">{found.map((c) => (
        <li key={c}><button onClick={() => { toggle(c); setQ(""); }}>
          <span>{cname(c)}</span><small>{all.has(c) ? (mine.has(c) ? "표시됨 · 누르면 해제" : "자동 표시") : "누르면 표시"}</small>
        </button></li>
      ))}</ul>}

      {list.length > 0 && <ul className="vm-chips" aria-label="다녀온 곳">{list.map((c) => (
        <li key={c} className={mine.has(c) ? "" : "auto"}>{cname(c)}{mine.has(c) && <button onClick={() => toggle(c)} aria-label={`${cname(c)} 빼기`}><Icon n="close" size={12} /></button>}</li>
      ))}</ul>}

      <div className="vm-foot">
        <p className="hint">{msg || (changed ? "바꾼 내용은 이 기기에 먼저 보여요. 저장하면 모든 기기에 적용돼요." : "연한 색은 블로그 여행기에서 자동으로 가져온 나라예요.")}</p>
        {changed && <button className="xbtn xpri" onClick={doSave} disabled={busy}><Icon n="check" size={16} />{busy ? "저장 중…" : "저장"}</button>}
      </div>
    </div>
  );
}

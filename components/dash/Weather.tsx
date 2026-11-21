"use client";
/**
 * 날씨 위젯 — Open-Meteo (무료, 키 불필요)
 * - 기본: 지금 이 화면을 보는 기기의 위치(허용 시). 허용 전·실패 시 서울 삼성동.
 * - 프리셋 도시: 모든 기기 공통(site.json의 dashboard.cities)으로 저장, '표시'를 켠 도시만 아래 줄에 나옴.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Icon from "./Icon";
import { useRefreshPulse } from "./useRefreshPulse";
import type { WxCity } from "@/lib/site";

type Here = { lat: number; lon: number; name: string; gps: boolean };
type Now = {
  t: number; feel: number; code: number; day: boolean; hum: number; wind: number;
  hi: number; lo: number; pop: number; tz: string;
  hours: { h: string; t: number; code: number; pop: number; day: boolean }[];
  days: { d: string; hi: number; lo: number; code: number; pop: number }[];
};
type Mini = { t: number; code: number; day: boolean; hi: number; lo: number; tz: string };
type Air = { pm10: number; pm25: number };

const SAMSEONG: Here = { lat: 37.5088, lon: 127.0631, name: "서울 삼성동", gps: false };
const GEO_OK = "drawer.geo", GEO_LAST = "drawer.geo.last";
const WD = ["일", "월", "화", "수", "목", "금", "토"];
const r = (n: number) => Math.round(n);

/** WMO 날씨 코드 → 아이콘·이름 */
export function wmo(code: number, day = true): { icon: string; label: string; mood: string } {
  if (code === 0) return { icon: day ? "sun" : "moon", label: "맑음", mood: day ? "clear" : "night" };
  if (code <= 2) return { icon: day ? "pcloud" : "ncloud", label: code === 1 ? "대체로 맑음" : "구름 조금", mood: day ? "clear" : "night" };
  if (code === 3) return { icon: "cloud", label: "흐림", mood: "cloud" };
  if (code === 45 || code === 48) return { icon: "fog", label: "안개", mood: "cloud" };
  if (code >= 51 && code <= 57) return { icon: "rain", label: "이슬비", mood: "rain" };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { icon: "rain", label: code >= 80 ? "소나기" : code >= 65 ? "강한 비" : "비", mood: "rain" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { icon: "snow", label: "눈", mood: "snow" };
  if (code >= 95) return { icon: "storm", label: "뇌우", mood: "rain" };
  return { icon: "cloud", label: "흐림", mood: "cloud" };
}
const pmGrade = (v: number, kind: "10" | "25") => {
  const c = kind === "10" ? [30, 80, 150] : [15, 35, 75];
  return v <= c[0] ? ["좋음", "g0"] : v <= c[1] ? ["보통", "g1"] : v <= c[2] ? ["나쁨", "g2"] : ["매우 나쁨", "g3"];
};
const localTime = (tz: string) => { try { return new Date().toLocaleTimeString("ko-KR", { timeZone: tz, hour: "numeric", minute: "2-digit" }); } catch { return ""; } };
const read = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } };

async function fetchNow(lat: number, lon: number): Promise<Now> {
  const u = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&timezone=auto&forecast_days=6`
    + "&current=temperature_2m,apparent_temperature,weather_code,is_day,relative_humidity_2m,wind_speed_10m"
    + "&hourly=temperature_2m,weather_code,precipitation_probability,is_day"
    + "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max";
  const j = await (await fetch(u)).json();
  if (!j.current) throw new Error(j.reason || "날씨를 불러오지 못했습니다.");
  const c = j.current, h = j.hourly, d = j.daily;
  const i0 = Math.max(0, (h.time as string[]).findIndex((t) => t >= c.time.slice(0, 13)));
  return {
    t: c.temperature_2m, feel: c.apparent_temperature, code: c.weather_code, day: !!c.is_day, hum: c.relative_humidity_2m, wind: c.wind_speed_10m,
    hi: d.temperature_2m_max[0], lo: d.temperature_2m_min[0], pop: d.precipitation_probability_max[0] ?? 0, tz: j.timezone,
    hours: Array.from({ length: 8 }, (_, k) => i0 + k * 3).filter((i) => i < h.time.length)
      .map((i) => ({ h: h.time[i].slice(11, 13), t: h.temperature_2m[i], code: h.weather_code[i], pop: h.precipitation_probability[i] ?? 0, day: !!h.is_day[i] })),
    days: (d.time as string[]).slice(1, 6).map((t, k) => ({ d: t, hi: d.temperature_2m_max[k + 1], lo: d.temperature_2m_min[k + 1], code: d.weather_code[k + 1], pop: d.precipitation_probability_max[k + 1] ?? 0 })),
  };
}
async function fetchAir(lat: number, lon: number): Promise<Air | null> {
  try {
    const j = await (await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm10,pm2_5`)).json();
    return j.current ? { pm10: j.current.pm10, pm25: j.current.pm2_5 } : null;
  } catch { return null; }
}
async function fetchMinis(cs: WxCity[]): Promise<Mini[]> {
  if (!cs.length) return [];
  const u = `https://api.open-meteo.com/v1/forecast?latitude=${cs.map((c) => c.lat).join(",")}&longitude=${cs.map((c) => c.lon).join(",")}`
    + "&timezone=auto&forecast_days=1&current=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min";
  const j = await (await fetch(u)).json();
  const arr = Array.isArray(j) ? j : [j];
  return arr.map((x) => ({ t: x.current.temperature_2m, code: x.current.weather_code, day: !!x.current.is_day, hi: x.daily.temperature_2m_max[0], lo: x.daily.temperature_2m_min[0], tz: x.timezone }));
}
async function placeName(lat: number, lon: number): Promise<string> {
  try {
    const j = await (await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ko`)).json();
    const sub = (j.localityInfo?.administrative as { name: string; order: number }[] | undefined)?.filter((a) => a.order >= 6).sort((a, b) => b.order - a.order)[0]?.name;
    const parts = [j.city || j.principalSubdivision, sub && sub !== j.city ? sub : j.locality].filter(Boolean);
    return [...new Set(parts)].join(" ") || "현재 위치";
  } catch { return "현재 위치"; }
}

export default function WeatherW({ cities, saveCities }: { cities: WxCity[]; saveCities: (c: WxCity[]) => Promise<string> }) {
  const [here, setHere] = useState<Here>(SAMSEONG);
  const [geo, setGeo] = useState<"" | "asking" | "denied">("");
  const [sel, setSel] = useState<number>(-1); // -1 = 내 위치, 그 외 = 프리셋 번호
  const [now, setNow] = useState<Now | null>(null);
  const [air, setAir] = useState<Air | null>(null);
  const [minis, setMinis] = useState<Mini[]>([]);
  const [err, setErr] = useState("");
  const [edit, setEdit] = useState(false);
  const refreshTick = useRefreshPulse(15 * 60_000);

  const shown = useMemo(() => cities.map((c, i) => ({ c, i })).filter((x) => x.c.on), [cities]);
  const target = sel >= 0 && cities[sel] ? { lat: cities[sel].lat, lon: cities[sel].lon, name: cities[sel].n, sub: cities[sel].c } : { lat: here.lat, lon: here.lon, name: here.name, sub: here.gps ? "지금 있는 곳" : "기본 위치" };

  const locate = useCallback((ask: boolean) => {
    if (!("geolocation" in navigator)) return;
    if (ask) setGeo("asking");
    navigator.geolocation.getCurrentPosition(async (p) => {
      const lat = +p.coords.latitude.toFixed(3), lon = +p.coords.longitude.toFixed(3);
      const prev = read<Here | null>(GEO_LAST, null);
      const name = prev && Math.abs(prev.lat - lat) < 0.01 && Math.abs(prev.lon - lon) < 0.01 ? prev.name : await placeName(lat, lon);
      const h = { lat, lon, name, gps: true };
      try { localStorage.setItem(GEO_OK, "1"); localStorage.setItem(GEO_LAST, JSON.stringify(h)); } catch {}
      setHere(h); setGeo(""); setSel(-1);
    }, (e) => {
      if (e.code === 1) { try { localStorage.removeItem(GEO_OK); } catch {} setGeo("denied"); } else setGeo("");
    }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 10 * 60 * 1000 });
  }, []);

  /* 처음: 이 기기에서 위치를 허용한 적이 있으면 마지막 위치를 먼저 보여주고 새로 확인 */
  useEffect(() => {
    const last = read<Here | null>(GEO_LAST, null);
    if (last) setHere(last);
    if (read<number>(GEO_OK, 0) === 1) locate(false);
  }, [locate]);

  useEffect(() => {
    let off = false; setErr("");
    Promise.all([fetchNow(target.lat, target.lon), fetchAir(target.lat, target.lon)])
      .then(([n, a]) => { if (!off) { setNow(n); setAir(a); } })
      .catch((e) => { if (!off) setErr((e as Error).message || "날씨를 불러오지 못했습니다."); });
    return () => { off = true; };
  }, [target.lat, target.lon, refreshTick]);

  const key = shown.map((x) => `${x.c.lat},${x.c.lon}`).join("|");
  useEffect(() => {
    let off = false;
    fetchMinis(shown.map((x) => x.c)).then((m) => { if (!off) setMinis(m); }).catch(() => {});
    return () => { off = true; };
  }, [key, refreshTick]); // eslint-disable-line react-hooks/exhaustive-deps

  const w = now ? wmo(now.code, now.day) : null;
  const umbrella = now && (now.pop >= 60 || now.hours.slice(0, 4).some((h) => h.pop >= 60));

  return (
    <div className={"wx" + (w ? " m-" + w.mood : "")}>
      <div className="wx-top">
        <div className="wx-place">
          <b>{target.name}</b>
          <small>{target.sub}{now && sel >= 0 ? " · 현지 " + localTime(now.tz) : ""}</small>
        </div>
        <div className="wx-acts">
          <button className={"wx-ib" + (sel === -1 && here.gps ? " on" : "")} onClick={() => (here.gps && sel !== -1 ? setSel(-1) : locate(true))} aria-label="내 위치 날씨" title="내 위치 날씨">
            <Icon n="locate" size={18} />
          </button>
          <button className="wx-ib" onClick={() => setEdit((e) => !e)} aria-label="도시 편집" title="도시 편집"><Icon n={edit ? "close" : "sliders"} size={18} /></button>
        </div>
      </div>

      {geo === "asking" && <p className="wx-note">위치를 확인하는 중… 브라우저가 묻는 창에서 ‘허용’을 눌러 주세요.</p>}
      {geo === "denied" && <p className="wx-note">위치 권한이 꺼져 있어 삼성동 날씨를 보여 드려요. 브라우저 주소창의 자물쇠 → 위치 → 허용으로 바꿀 수 있습니다.</p>}

      {edit ? <CityEditor cities={cities} saveCities={saveCities} /> : err ? <p className="wx-note">{err}</p> : !now || !w ? <p className="wx-note">날씨를 불러오는 중…</p> : (<>
        <div className="wx-main">
          <span className="wx-big"><Icon n={w.icon} size={64} /></span>
          <div className="wx-t"><b>{r(now.t)}<em>°</em></b><span>{w.label}</span></div>
          <ul className="wx-facts">
            <li><span>체감</span><b>{r(now.feel)}°</b></li>
            <li><span>최고·최저</span><b>{r(now.hi)}° / {r(now.lo)}°</b></li>
            <li><span>강수 확률</span><b>{now.pop}%</b></li>
            <li><span>습도·바람</span><b>{now.hum}% · {(now.wind / 3.6).toFixed(1)}m/s</b></li>
          </ul>
        </div>
        {(air || umbrella) && <div className="wx-chips">
          {umbrella && <span className="wx-chip rain"><Icon n="drop" size={14} />우산 챙기세요</span>}
          {air && (() => { const a = pmGrade(air.pm10, "10"), b = pmGrade(air.pm25, "25"); return (<>
            <span className={"wx-chip " + a[1]}>미세먼지 <b>{a[0]}</b> {r(air.pm10)}</span>
            <span className={"wx-chip " + b[1]}>초미세 <b>{b[0]}</b> {r(air.pm25)}</span>
          </>); })()}
        </div>}
        <div className="wx-hours" aria-label="3시간 간격 예보">
          {now.hours.map((h, i) => { const x = wmo(h.code, h.day); return (
            <div key={i}><small>{i === 0 ? "지금" : +h.h + "시"}</small><Icon n={x.icon} size={20} /><b>{r(h.t)}°</b>{h.pop >= 30 ? <i>{h.pop}%</i> : <i />}</div>
          ); })}
        </div>
        <div className="wx-days">
          {(() => { const lo = Math.min(...now.days.map((d) => d.lo)), hi = Math.max(...now.days.map((d) => d.hi)), sp = hi - lo || 1; return now.days.map((d) => (
            <div key={d.d}>
              <small>{WD[new Date(d.d + "T00:00").getDay()]}</small>
              <Icon n={wmo(d.code).icon} size={18} />
              <span className="lo">{r(d.lo)}°</span>
              <span className="bar"><i style={{ left: ((d.lo - lo) / sp) * 100 + "%", right: (1 - (d.hi - lo) / sp) * 100 + "%" }} /></span>
              <span className="hi">{r(d.hi)}°</span>
            </div>
          )); })()}
        </div>
      </>)}

      {!edit && <div className="wx-cities">
        {sel !== -1 && <button className="wx-city" onClick={() => setSel(-1)}><Icon n="locate" size={15} /><span><b>{here.gps ? "내 위치" : "삼성동"}</b></span></button>}
        {shown.map(({ c, i }, k) => { const m = minis[k]; return (
          <button key={c.n + i} className={"wx-city" + (sel === i ? " on" : "")} onClick={() => setSel(sel === i ? -1 : i)} title={`${c.n}, ${c.c}`}>
            {m ? <Icon n={wmo(m.code, m.day).icon} size={18} /> : <Icon n="pin" size={15} />}
            <span><b>{c.n}</b><small>{m ? `${r(m.t)}° · ${localTime(m.tz)}` : c.c}</small></span>
          </button>
        ); })}
        {!cities.length && <button className="wx-city add" onClick={() => setEdit(true)}><Icon n="plus" size={15} /><span><b>도시 추가</b><small>방콕, 시드니…</small></span></button>}
      </div>}
    </div>
  );
}

type Hit = { name: string; country: string; admin1?: string; latitude: number; longitude: number };
function CityEditor({ cities, saveCities }: { cities: WxCity[]; saveCities: (c: WxCity[]) => Promise<string> }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [list, setList] = useState<WxCity[]>(cities);
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(list) !== JSON.stringify(cities);

  async function search(e: React.FormEvent) {
    e.preventDefault(); if (!q.trim()) return; setHits(null); setMsg("");
    try {
      const j = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q.trim())}&count=6&language=ko&format=json`)).json();
      setHits(j.results ?? []);
    } catch { setMsg("검색하지 못했습니다."); }
  }
  const add = (h: Hit) => {
    if (list.length >= 12) { setMsg("도시는 12곳까지 저장할 수 있어요."); return; }
    setList([...list, { n: h.name, c: [h.admin1, h.country].filter(Boolean).join(", "), lat: +h.latitude.toFixed(3), lon: +h.longitude.toFixed(3), on: true }]);
    setHits(null); setQ("");
  };
  const mv = (i: number, d: number) => { const n = [...list]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; setList(n); };
  async function save() { setBusy(true); setMsg(await saveCities(list)); setBusy(false); }

  return (
    <div className="wx-edit">
      <form onSubmit={search} className="wx-search">
        <Icon n="search" size={17} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="도시 이름 (예: 방콕, Sydney, Queenstown)" aria-label="도시 검색" />
        <button className="xbtn line xsm" type="submit">찾기</button>
      </form>
      {hits && (hits.length ? <ul className="wx-hits">{hits.map((h, i) => (
        <li key={i}><button onClick={() => add(h)}><Icon n="plus" size={15} /><b>{h.name}</b><small>{[h.admin1, h.country].filter(Boolean).join(", ")}</small></button></li>
      ))}</ul> : <p className="wx-note">찾지 못했어요. 영어 이름으로도 검색해 보세요.</p>)}
      <ul className="wx-list">
        {list.map((c, i) => (
          <li key={c.n + i}>
            <label><input type="checkbox" checked={c.on} onChange={(e) => setList(list.map((x, k) => (k === i ? { ...x, on: e.target.checked } : x)))} /><span><b>{c.n}</b><small>{c.c}</small></span></label>
            <span className="wx-li-acts">
              <button onClick={() => mv(i, -1)} aria-label="위로"><Icon n="up" size={15} /></button>
              <button onClick={() => mv(i, 1)} aria-label="아래로"><Icon n="down" size={15} /></button>
              <button onClick={() => setList(list.filter((_, k) => k !== i))} aria-label="삭제"><Icon n="trash" size={15} /></button>
            </span>
          </li>
        ))}
        {!list.length && <li className="wx-note">아직 저장한 도시가 없어요. 위에서 검색해 추가하세요.</li>}
      </ul>
      <p className="wx-note">체크한 도시만 위젯 아래에 표시됩니다. 저장하면 폰·PC 모두 같은 목록이 보여요.</p>
      <div className="wx-save"><button className="xbtn xpri xsm" disabled={!dirty || busy} onClick={save}><Icon n="check" size={15} />{busy ? "저장 중…" : "모든 기기에 저장"}</button>{msg && <small>{msg}</small>}</div>
    </div>
  );
}

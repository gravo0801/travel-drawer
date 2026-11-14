"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PostSummary } from "@/lib/types";
import { countryEn } from "@/lib/countries";
import { SlotImage } from "./SettingsProvider";

type G<T> = { k: string; a: T[] };
function groupBy<T>(arr: T[], fn: (x: T) => string): G<T>[] {
  const m = new Map<string, T[]>();
  arr.forEach((x) => { const k = fn(x); if (!m.has(k)) m.set(k, []); m.get(k)!.push(x); });
  return [...m].map(([k, a]) => ({ k, a }));
}
const yearOf = (p: PostSummary) => p.trip.date.slice(0, 4);
const md = (p: PostSummary) => (p.trip.date.length >= 7 ? p.trip.date.slice(5).replace("-", ".") : "");

export default function Archive({ posts }: { posts: PostSummary[] }) {
  const [q, setQ] = useState("");
  const [cs, setCs] = useState<string[]>([]);
  const [shut, setShut] = useState<Record<string, boolean>>({});
  const [cur, setCur] = useState("");
  const [toast, setToast] = useState("");
  const [pv, setPv] = useState<{ p: PostSummary; x: number; y: number } | null>(null);
  const main = useRef<HTMLDivElement>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = {}; posts.forEach((p) => { c[p.trip.country] = (c[p.trip.country] ?? 0) + 1; });
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }, [posts]);
  const vis = useMemo(() => posts.filter((p) => {
    if (cs.length && !cs.includes(p.trip.country)) return false;
    if (!q.trim()) return true;
    const hay = [p.title, p.trip.country, countryEn(p.trip.country), p.trip.city, p.trip.date, ...(p.hashtags ?? [])].join(" ").toLowerCase();
    return q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
  }), [posts, q, cs]);
  const years = groupBy(vis, yearOf);
  const allYears = groupBy(posts, yearOf);
  const max = Math.max(1, ...allYears.map((g) => g.a.length));
  const have = Object.fromEntries(years.map((g) => [g.k, g.a.length]));
  const allShut = years.length > 0 && years.every((g) => shut[g.k]);

  useEffect(() => {
    const els = main.current?.querySelectorAll<HTMLElement>(".yr"); if (!els) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) setCur(e.target.getAttribute("data-y") ?? ""); }), { rootMargin: "-170px 0px -65% 0px" });
    els.forEach((e) => io.observe(e)); return () => io.disconnect();
  }, [vis, shut]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 2600); return () => clearTimeout(t); }, [toast]);

  const fine = typeof window !== "undefined" && matchMedia("(hover: hover) and (pointer: fine)").matches;
  const jump = (y: string) => {
    setShut((s) => ({ ...s, [y]: false }));
    requestAnimationFrame(() => document.getElementById("y" + y)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }));
  };

  return (
    <section id="archive" className="archive">
      <div className="a-bg"><SlotImage k="archive" /></div>
      <div className="a-in">
        <div className="sec-h"><span className="eyebrow">Archive</span><h2>연도 · 나라 · 도시로 찾기</h2><p>제목만 훑어도 어느 해, 어느 나라, 어느 도시였는지 한눈에 보입니다.</p>
          {posts.some((p) => p.sample) && <div className="note">흐리게 표시된 제목은 가상의 샘플입니다. 실제 849개 글을 옮기면 사라집니다.</div>}
        </div>
        <div className="panel">
          <div className="tool">
            <label className="search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
              <input type="search" placeholder="제목, 나라, 도시, 해시태그로 검색" aria-label="글 검색" value={q} onChange={(e) => setQ(e.target.value)} /></label>
            <div className="chips" role="group" aria-label="나라 선택">
              <button className="chip" type="button" aria-pressed={!cs.length} onClick={() => setCs([])}>전체<small>{posts.length}</small></button>
              {counts.map(([c, n]) => (
                <button key={c} className="chip" type="button" aria-pressed={cs.includes(c)} onClick={() => setCs((x) => (x.includes(c) ? x.filter((y) => y !== c) : [...x, c]))}>{c}<small>{n}</small></button>
              ))}
            </div>
            <button className="ttl" type="button" onClick={() => setShut(Object.fromEntries(years.map((g) => [g.k, !allShut])))}>{allShut ? "모두 펼치기" : "모두 접기"}</button>
          </div>
          <div className="count" role="status">{vis.length}편 표시 중 · 연도 {years.length}개</div>
          <div className="wrap">
            <nav className="rail" aria-label="연도 바로가기">
              {allYears.map((g) => { const n = have[g.k] ?? 0; return (
                <button key={g.k} type="button" className={(n ? "" : "dim ") + (cur === g.k ? "on" : "")} disabled={!n} onClick={() => jump(g.k)} aria-label={`${g.k}년 ${n}편`}>
                  <span>{g.k}</span><i style={{ ["--w" as string]: (n / max).toFixed(2) }} />
                </button>); })}
            </nav>
            <div ref={main} onMouseLeave={() => setPv(null)}>
              {!vis.length && <div className="empty">조건에 맞는 글이 없습니다.<br />검색어나 나라 선택을 바꿔 보세요.</div>}
              {years.map((g) => {
                const byC = groupBy(g.a, (p) => p.trip.country);
                return (
                  <section key={g.k} className={"yr" + (shut[g.k] ? " shut" : "")} id={"y" + g.k} data-y={g.k}>
                    <header className="yh">
                      <h3 className="ynum">{g.k}</h3>
                      <div className="ysum">{byC.map((c) => <div className="ys" key={c.k}><b>{c.k}</b> <span>{groupBy(c.a, (p) => p.trip.city).map((x) => x.k).join(" · ")}</span></div>)}</div>
                      <button className="yt" type="button" aria-expanded={!shut[g.k]} onClick={() => setShut((s) => ({ ...s, [g.k]: !s[g.k] }))}>{shut[g.k] ? "펼치기" : "접기"} · {g.a.length}편</button>
                    </header>
                    {!shut[g.k] && (
                      <div className="ybody">
                        {byC.map((c) => (
                          <div className="crow" key={c.k}>
                            <div className="cn">{c.k}<span className="ce">{countryEn(c.k)}</span><span className="cc">{c.a.length}편</span></div>
                            <div>{groupBy(c.a, (p) => p.trip.city).map((ct) => (
                              <div className="cg" key={ct.k}>
                                <div className="city">{ct.k}</div>
                                <ul className="posts">{ct.a.map((p) => {
                                  const inner = <><span className="pd">{md(p)}</span><span className="pt">{p.title}</span><span className="pn">사진 {p.photoCount}</span></>;
                                  const hover = fine ? { onMouseEnter: (e: React.MouseEvent) => setPv({ p, x: e.clientX, y: e.clientY }), onMouseMove: (e: React.MouseEvent) => setPv({ p, x: e.clientX, y: e.clientY }), onMouseLeave: () => setPv(null) } : {};
                                  return <li key={p.id}>{p.sample
                                    ? <button type="button" className="row sample" onClick={() => setToast("가상의 샘플 제목입니다. 글 이전 뒤에 실제 글로 바뀝니다.")} {...hover}>{inner}</button>
                                    : <Link className="row" href={`/posts/${p.id}`} {...hover}>{inner}</Link>}</li>;
                                })}</ul>
                              </div>))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      {pv && (() => { const w = 250; let x = pv.x + 22, y = pv.y + 18; if (x + w > innerWidth - 8) x = pv.x - w - 22; if (y + 250 > innerHeight - 8) y = innerHeight - 258; return (
        <div className="pv on" style={{ left: x, top: Math.max(8, y) }} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="im">{pv.p.cover ? <img src={pv.p.cover} alt="" /> : <span className="ph">{pv.p.trip.city}</span>}</div>
          <p><b>{yearOf(pv.p)} · {pv.p.trip.country} · {pv.p.trip.city}</b>{pv.p.title}</p>
        </div>); })()}
      {toast && <div className="toast" role="status">{toast}</div>}
    </section>
  );
}

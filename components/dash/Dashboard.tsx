"use client";
import { useEffect, useMemo, useState } from "react";
import { getAuth, onAuthStateChanged, signOut, type User } from "firebase/auth";
import { firebaseApp } from "@/lib/firebase";
import { login } from "@/lib/login";
import { DASH_DEFAULT, DASH_WIDGETS, FONTS, type DashCfg } from "@/lib/site";
import { tripKey, tripMonth } from "@/lib/trip";
import Icon from "./Icon";
import "./dash.css";

export type DPost = { id: string; title: string; trip: { date: string; country: string; city: string }; cover: string | null; photoCount: number; addedAt: string };
type Trip = { id: string; name: string; start: string; end: string };
type Private = { trips: Trip[]; memo: string };
type Page = "home" | "calendar";

/* ── 분위기(팔레트) ── 밝은 배경 2색 · 포인트 · 사이드바 · 어두운 화면용 포인트 */
const PAL: Record<string, { n: string; a: string; b: string; acc: string; side: string; accD: string }> = {
  sage: { n: "세이지 가든", a: "#f5f4ee", b: "#e6ece4", acc: "#2f6b55", side: "#15252a", accD: "#8fcfb4" },
  ocean: { n: "오션 블루", a: "#f3f6fa", b: "#e0e9f3", acc: "#2f5f96", side: "#121d2b", accD: "#93badf" },
  lavender: { n: "라벤더 미스트", a: "#f6f4f9", b: "#e7e1f0", acc: "#6b4f9a", side: "#1c1828", accD: "#c3aee6" },
  peach: { n: "피치 선셋", a: "#fbf6f0", b: "#f1e2d4", acc: "#a65a3a", side: "#271b16", accD: "#efb08f" },
  rose: { n: "로즈 클라우드", a: "#faf4f5", b: "#efdfe4", acc: "#9c4767", side: "#271820", accD: "#eaa2bd" },
  sand: { n: "웜 샌드", a: "#f8f5ee", b: "#ebe3d2", acc: "#7a6534", side: "#221f18", accD: "#dcc48c" },
  ink: { n: "잉크 & 페이퍼", a: "#f6f5f2", b: "#e9e7e1", acc: "#2b2b2b", side: "#141414", accD: "#e6e1d6" },
};
const SIZE = { s: 15, m: 16, l: 17.5 } as const;
const APPS = [
  { n: "VitalSync", sub: "운동 기록", icon: "pulse", hue: "teal", url: "https://vitalsync-sigma.vercel.app/" },
  { n: "Portfolio", sub: "투자 현황", icon: "chart", hue: "blue", url: "https://my-portfolio-blue-pi-68.vercel.app/" },
  { n: "EndoApp", sub: "내시경 업무", icon: "scope", hue: "violet", url: "https://gravo0801.github.io/endoapp/" },
  { n: "Google 캘린더", sub: "일정", icon: "calendar", hue: "amber", url: "https://calendar.google.com/" },
];
const WNAME: Record<string, string> = { mt: "마통 잔액", gc: "오늘 일정", trips: "다음 여행", migrate: "블로그 이전", timeline: "여행 연표", apps: "나의 앱", memo: "메모" };
const WICON: Record<string, string> = { mt: "chart", gc: "calendar", trips: "plane", migrate: "move", timeline: "globe", apps: "widgets", memo: "note" };

const fam = (id: string) => (FONTS.find((f) => f.id === id) ?? FONTS[0]).family;
const kst = () => new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const days = (a: string, b: string) => Math.round((new Date(b + "T00:00").getTime() - new Date(a + "T00:00").getTime()) / 864e5);
const dot = (s: string) => s.replace(/-/g, ".");
function read<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } }
function write(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

/** "여행 3일차 - Fran`s 아침식사, …" → 제목 "방콕 3일차", 부제 "Fran`s 아침식사, …" */
export function splitTitle(p: DPost): { head: string; sub: string } {
  const t = p.title.replace(/^\s*\[[^\]]*\]\s*/, "");
  const i = t.indexOf(" - ");
  let head = i > 0 ? t.slice(0, i).trim() : t, sub = i > 0 ? t.slice(i + 3).trim() : "";
  const m = head.match(/^여행\s*(\d+)\s*일차$/);
  if (m && p.trip.city && !p.trip.city.includes("미정")) head = `${p.trip.city} ${m[1]}일차`;
  if (head.length > 28 && !sub) { sub = head; head = `${p.trip.city} 여행`; }
  return { head, sub };
}

export default function Dashboard({ posts, dash, siteHero, admins, total }: { posts: DPost[]; dash: DashCfg; siteHero: string; admins: string[]; total: number }) {
  /* ── 로그인 잠금 ── */
  const app = firebaseApp();
  const [user, setUser] = useState<User | null>(null);
  const [auth, setAuth] = useState<"loading" | "out" | "denied" | "ok">("loading");
  const [err, setErr] = useState("");
  useEffect(() => {
    if (!app) { setAuth("out"); return; }
    return onAuthStateChanged(getAuth(app), (u) => { setUser(u); setAuth(!u ? "out" : admins.includes(u.uid) ? "ok" : "denied"); });
  }, [app, admins]);

  /* ── 꾸밈 설정: 모든 기기 공통(site.json) + 이 기기에서 바꾼 값(저장 전) ── */
  const [cfg, setCfgS] = useState<DashCfg>(dash);
  const [dark, setDark] = useState(false);
  const [priv, setPrivS] = useState<Private>({ trips: [], memo: "" });
  const [page, setPage] = useState<Page>("home");
  const [dlg, setDlg] = useState<"" | "design" | "widgets">("");
  useEffect(() => {
    const loc = read<{ base: string; cfg: DashCfg } | null>("drawer.cfg.v2", null);
    if (loc && loc.base === dash.v) setCfgS({ ...DASH_DEFAULT, ...loc.cfg });
    setDark(read("drawer.dark", false));
    setPrivS({ trips: [], memo: "", ...read<Partial<Private>>("drawer.private.v1", {}) });
    const h = () => setPage(location.hash === "#calendar" ? "calendar" : "home");
    h(); window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, [dash.v]);
  const setCfg = (c: Partial<DashCfg>) => setCfgS((o) => { const n = { ...o, ...c }; write("drawer.cfg.v2", { base: dash.v, cfg: n }); return n; });
  const setPriv = (p: Partial<Private>) => setPrivS((o) => { const n = { ...o, ...p }; write("drawer.private.v1", n); return n; });
  const toggleDark = () => setDark((d) => { write("drawer.dark", !d); return !d; });
  const go = (p: Page) => { location.hash = p === "home" ? "" : p; setPage(p); window.scrollTo(0, 0); };

  const pal = PAL[cfg.palette] ?? PAL.sage;
  const style = {
    "--a": pal.a, "--b": pal.b, "--acc": dark ? pal.accD : cfg.accent || pal.acc, "--side": pal.side,
    "--tf": fam(cfg.titleFont), "--bf": fam(cfg.bodyFont), "--fs": SIZE[cfg.size] + "px",
  } as React.CSSProperties;

  if (auth !== "ok") return <Gate state={auth} user={user} err={err} hero={siteHero} style={style}
    onLogin={async () => { setErr(""); if (!app) { setErr("Firebase 설정이 없어 로그인할 수 없습니다."); return; } const e = await login(app); if (e) setErr(e); }}
    onOut={() => app && signOut(getAuth(app))} />;

  const name = (user?.displayName || "").trim();
  return (
    <div className={"dash" + (dark ? " dark" : "")} style={style}>
      <aside className="side">
        <a className="xbrand" href="/me"><span className="mark"><Icon n="logo" size={22} /></span>DRAWER<i>.</i></a>
        <p className="lbl">나의 공간</p>
        <nav>
          <button className={page === "home" ? "xon" : ""} onClick={() => go("home")}><Icon n="overview" />오버뷰</button>
          <button className={page === "calendar" ? "xon" : ""} onClick={() => go("calendar")}><Icon n="calendar" />캘린더</button>
        </nav>
        <p className="lbl">여행 블로그</p>
        <nav>
          <a href="/"><Icon n="book" />블로그 보기<small>{posts.length}</small></a>
          <a href="/write"><Icon n="pen" />글쓰기 · 가져오기</a>
        </nav>
        <p className="lbl">나의 앱</p>
        <nav>
          {APPS.slice(0, 3).map((a) => <a key={a.n} href={a.url} target="_blank" rel="noopener"><Icon n={a.icon} />{a.sub}<Icon n="open" size={14} className="ext" /></a>)}
        </nav>
        <div className="side-foot">
          <button onClick={() => setDlg("design")}><Icon n="sliders" />디자인 설정</button>
          <button onClick={() => setDlg("widgets")}><Icon n="widgets" />위젯 편집</button>
          <div className="me">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {user?.photoURL ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" /> : <span>{(name || "G").slice(0, 1)}</span>}
            <div><b>{name || "나"}</b><small>{user?.email}</small></div>
            <button aria-label="로그아웃" title="로그아웃" onClick={() => app && signOut(getAuth(app))}><Icon n="logout" size={17} /></button>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="top">
          <a className="xbrand xsm" href="/me"><span className="mark"><Icon n="logo" size={19} /></span>DRAWER<i>.</i></a>
          <p className="crumb">나의 공간 <span>/</span> <b>{page === "home" ? "오버뷰" : "캘린더"}</b></p>
          <div className="top-r">
            <span className="today">{new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", weekday: "short" }).format(new Date())}</span>
            <button className="ibtn" onClick={toggleDark} aria-label={dark ? "밝은 화면" : "어두운 화면"} title={dark ? "밝은 화면" : "어두운 화면"}><Icon n={dark ? "sun" : "moon"} /></button>
          </div>
        </header>
        {page === "home"
          ? <Overview user={user} posts={posts} cfg={cfg} siteHero={siteHero} total={total} name={name} priv={priv} setPriv={setPriv} setCfg={setCfg} onWidgets={() => setDlg("widgets")} />
          : <CalendarPage user={user} trips={priv.trips} />}
      </div>

      <nav className="tabbar">
        <button className={page === "home" ? "xon" : ""} onClick={() => go("home")}><Icon n="overview" /><span>오버뷰</span></button>
        <button className={page === "calendar" ? "xon" : ""} onClick={() => go("calendar")}><Icon n="calendar" /><span>캘린더</span></button>
        <a href="/"><Icon n="book" /><span>블로그</span></a>
        <a href="/write"><Icon n="pen" /><span>글쓰기</span></a>
        <button onClick={() => setDlg("design")}><Icon n="sliders" /><span>설정</span></button>
      </nav>

      {dlg && <Dialog cfg={cfg} setCfg={setCfg} dark={dark} toggleDark={toggleDark} posts={posts} siteHero={siteHero}
        tab={dlg} close={() => setDlg("")} user={user} saved={dash} />}
    </div>
  );
}

/* ───────────── 잠금 화면 ───────────── */
function Gate({ state, user, err, hero, style, onLogin, onOut }: { state: string; user: User | null; err: string; hero: string; style: React.CSSProperties; onLogin: () => void; onOut: () => void }) {
  return (
    <div className="dash gate" style={style}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="gate-bg" src={hero} alt="" aria-hidden="true" />
      {state !== "loading" && (
        <div className="gate-card">
          <span className="mark xbig"><Icon n="logo" size={30} /></span>
          <h1>DRAWER<i>.</i></h1>
          {state === "denied" ? (<>
            <p><b>{user?.email}</b> 계정에는 들어올 권한이 없습니다.</p>
            <button className="xbtn xghost" onClick={onOut}><Icon n="logout" size={17} />다른 계정으로 로그인</button>
          </>) : (<>
            <p>나만 보는 개인 공간입니다.<br />Google 계정으로 로그인해 주세요.</p>
            <button className="xbtn xpri" onClick={onLogin}><Icon n="lock" size={17} />Google 계정으로 로그인</button>
          </>)}
          {err && <p className="xerr" role="alert">{err}</p>}
          <a className="gate-link" href="/">여행 블로그 보기 <Icon n="arrow" size={15} /></a>
        </div>
      )}
    </div>
  );
}

/* ───────────── 오버뷰 ───────────── */
function Overview({ user, posts, cfg, siteHero, total, name, priv, setPriv, setCfg, onWidgets }: {
  user: User | null; posts: DPost[]; cfg: DashCfg; siteHero: string; total: number; name: string; priv: Private; setPriv: (p: Partial<Private>) => void; setCfg: (c: Partial<DashCfg>) => void; onWidgets: () => void;
}) {
  const now = kst(), h = now.getHours();
  const hello = h < 5 ? "고요한 밤이에요" : h < 11 ? "좋은 아침이에요" : h < 17 ? "좋은 오후예요" : h < 22 ? "편안한 저녁이에요" : "고요한 밤이에요";
  const countries = new Set(posts.map((p) => p.trip.country).filter((c) => c && !c.includes("미정")));
  const photos = posts.reduce((n, p) => n + (p.photoCount || 0), 0);
  const heroes = useMemo(() => [{ k: "site", src: siteHero, cap: cfg.heroCaption || "나의 여행 서랍에서" },
    ...posts.filter((p) => p.cover).slice(0, 3).map((p) => ({ k: "post:" + p.id, src: p.cover!, cap: `${tripMonth(p).slice(0, 4)} · ${p.trip.country} ${p.trip.city}` }))], [posts, siteHero, cfg.heroCaption]);
  const hero = heroes.find((x) => x.k === cfg.hero) ?? heroes[0];
  const next = priv.trips.filter((t) => (t.end || t.start) >= ymd(now)).sort((a, b) => a.start.localeCompare(b.start))[0];

  const W: Record<string, React.ReactNode> = {
    mt: <MtW user={user} />,
    gc: <GcW user={user} />,
    trips: <TripsW trips={priv.trips} setTrips={(trips) => setPriv({ trips })} />,
    migrate: <MigrateW done={posts.length} total={total} />,
    timeline: <TimelineW posts={posts} />,
    apps: <AppsW />,
    memo: <MemoW memo={priv.memo} setMemo={(memo) => setPriv({ memo })} />,
  };
  const on = cfg.widgets.filter((w) => W[w]);

  return (
    <main className="pg">
      <div className="hello">
        <div>
          <p className="xeye">The Personal Edition</p>
          <h1>{hello}{name ? <>, <em>{name}</em>님</> : ""}</h1>
          {next ? <p className="lead">다음 여행 <b>{next.name}</b>까지 <b>{Math.max(0, days(ymd(now), next.start))}일</b> 남았어요.</p>
            : <p className="lead">오늘도 한 장면씩, 서랍에 담아 둘까요?</p>}
        </div>
        <button className="xbtn line" onClick={onWidgets}><Icon n="widgets" size={17} />위젯 편집</button>
      </div>

      <section className="xhero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={hero.src} src={hero.src} alt="" />
        <div className="hero-in">
          <h2>일상과 여행 사이<i>.</i></h2>
          <p>열심히 보낸 하루도, 낯선 도시의 한 장면도.<br />나만의 속도로 차곡차곡 모아가는 이야기.</p>
          <a className="hero-cta" href="/">여행의 서랍 열기 <Icon n="arrow" size={17} /></a>
        </div>
        <div className="hero-cap"><Icon n="pin" size={15} />{hero.cap}</div>
        <div className="hero-pick" role="group" aria-label="큰 사진 고르기">
          {heroes.map((x) => (
            <button key={x.k} aria-pressed={x.k === hero.k} aria-label={x.cap} title={x.cap} onClick={() => setCfg({ hero: x.k })}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={x.src} alt="" />
            </button>
          ))}
        </div>
      </section>

      <section className="stats">
        <Stat icon="book" v={posts.length} u="편" l="여행기" />
        <Stat icon="globe" v={countries.size} u="곳" l="다녀온 나라" />
        <Stat icon="camera" v={photos.toLocaleString()} u="장" l="담아 둔 사진" />
        <Stat icon="move" v={Math.round((posts.length / total) * 1000) / 10} u="%" l="네이버 이전" />
      </section>

      {on.length > 0 && <section className="grid">{on.map((w) => (
        <article key={w} className={"xcard w-" + w}>
          <header className="ch"><span className="ci"><Icon n={WICON[w]} size={18} /></span><h3>{WNAME[w]}</h3></header>
          {W[w]}
        </article>
      ))}</section>}

      <section className="stories">
        <div className="sh"><div><p className="xeye">Stories worth keeping</p><h2>다시 펼쳐보는 여행의 장면</h2></div><a className="more" href="/#archive">전체 여행기 <Icon n="arrow" size={15} /></a></div>
        <div className="st-grid">
          {posts.slice(0, 3).map((p, i) => { const t = splitTitle(p); return (
            <a key={p.id} className={"story" + (i === 0 ? " xbig" : "")} href={`/posts/${p.id}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <span className="xph">{p.cover ? <img src={p.cover} alt="" loading="lazy" /> : null}</span>
              <span className="xtx">
                <small>{tripMonth(p).slice(0, 4)} · {p.trip.country} · {p.trip.city}</small>
                <b>{t.head}</b>
                {t.sub && <span className="sub">{t.sub}</span>}
                <span className="xmeta"><Icon n="camera" size={14} />{p.photoCount}장<Icon n="arrow" size={15} className="go" /></span>
              </span>
            </a>
          ); })}
        </div>
      </section>
      <footer className="xfoot"><span><Icon n="logo" size={15} />DRAWER</span>일상의 기록이, 삶의 풍경이 되는 곳.</footer>
    </main>
  );
}

function Stat({ icon, v, u, l }: { icon: string; v: number | string; u: string; l: string }) {
  return <div className="xstat"><span className="si"><Icon n={icon} size={19} /></span><div><b>{v}<em>{u}</em></b><small>{l}</small></div></div>;
}

/* 다음 여행 D-day (이 기기에만 저장) */
function TripsW({ trips, setTrips }: { trips: Trip[]; setTrips: (t: Trip[]) => void }) {
  const today = ymd(kst());
  const [add, setAdd] = useState(false);
  const [f, setF] = useState({ name: "", start: "", end: "" });
  const list = trips.filter((t) => (t.end || t.start) >= today).sort((a, b) => a.start.localeCompare(b.start));
  const save = () => {
    if (!f.name.trim() || !f.start) return;
    setTrips([...trips, { id: Date.now().toString(36), name: f.name.trim().slice(0, 30), start: f.start, end: f.end && f.end >= f.start ? f.end : "" }]);
    setF({ name: "", start: "", end: "" }); setAdd(false);
  };
  const [first, ...rest] = list;
  const d = first ? days(today, first.start) : 0;
  return (
    <div className="trips">
      {first ? (
        <div className="dday">
          <div className="dnum">{d > 0 ? <>D<span>−</span>{d}</> : <>여행 중</>}</div>
          <div><b>{first.name}</b><small>{dot(first.start)}{first.end ? ` – ${dot(first.end).slice(5)}` : ""}{first.end ? ` · ${days(first.start, first.end)}박` : ""}</small></div>
          <button className="x" aria-label={`${first.name} 지우기`} onClick={() => setTrips(trips.filter((t) => t.id !== first.id))}><Icon n="trash" size={16} /></button>
        </div>
      ) : !add && <div className="xempty"><Icon n="plane" size={28} /><p>다가오는 여행을 적어 두면<br />남은 날을 세어 드려요.</p></div>}
      {rest.length > 0 && <ul className="tl">{rest.map((t) => (
        <li key={t.id}><span>D−{days(today, t.start)}</span><b>{t.name}</b><small>{dot(t.start).slice(2)}</small>
          <button className="x" aria-label={`${t.name} 지우기`} onClick={() => setTrips(trips.filter((x) => x.id !== t.id))}><Icon n="close" size={14} /></button></li>
      ))}</ul>}
      {add ? (
        <div className="tform">
          <input placeholder="여행지 (예: 뉴질랜드 남섬)" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} aria-label="여행지" />
          <label>출발<input type="date" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></label>
          <label>도착<input type="date" value={f.end} min={f.start} onChange={(e) => setF({ ...f, end: e.target.value })} /></label>
          <div className="xrow"><button className="xbtn line xsm" onClick={() => setAdd(false)}>취소</button><button className="xbtn xpri xsm" onClick={save} disabled={!f.name.trim() || !f.start}>추가</button></div>
        </div>
      ) : <button className="addl" onClick={() => setAdd(true)}><Icon n="plus" size={16} />여행 추가</button>}
      <p className="priv"><Icon n="lock" size={13} />이 기기에만 저장 · 공개되지 않음</p>
    </div>
  );
}

/* 네이버 → 새 블로그 이전 진행률 */
type MtData = { balance: number; date: string; limit: number; goal: number; points: { d: string; v: number }[]; prev?: { d: string; v: number } };
const won = (n: number) => Math.round(n).toLocaleString("ko-KR");
function MtW({ user }: { user: User | null }) {
  const [d, setD] = useState<MtData | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (!user) return; let off = false;
    (async () => {
      try {
        const r = await fetch("/api/admin/finance", { headers: { authorization: `Bearer ${await user.getIdToken()}` }, cache: "no-store" });
        const j = await r.json();
        if (off) return; if (!r.ok) setErr(j.error || "불러오지 못했습니다."); else setD(j);
      } catch { if (!off) setErr("네트워크 오류로 불러오지 못했습니다."); }
    })();
    return () => { off = true; };
  }, [user]);
  const app = "https://gravo-finance.vercel.app/";
  if (err) return <div className="mt"><p className="mt-note">{err}</p><a className="xbtn line xsm" href={app} target="_blank" rel="noopener"><Icon n="open" size={15} />마통 앱 열기</a></div>;
  if (!d) return <div className="mt"><p className="mt-note">불러오는 중…</p></div>;
  const debt = Math.max(0, -d.balance), over = d.balance > 0;
  const use = Math.min(1, debt / d.limit), goal = Math.min(1, d.goal / d.limit);
  const diff = d.prev ? debt - Math.max(0, -d.prev.v) : null;
  const pts = d.points.map((p) => Math.max(0, -p.v));
  const lo = Math.min(...pts), hi = Math.max(...pts), span = hi - lo || 1;
  const line = pts.map((v, i) => `${pts.length > 1 ? (i / (pts.length - 1)) * 100 : 100},${28 - ((v - lo) / span) * 24}`).join(" ");
  return (
    <div className="mt">
      <div className="mt-n"><b>{over ? "+" : ""}{won(over ? d.balance / 1e4 : debt / 1e4)}<em>만원</em></b><small>{over ? "예금 잔액" : "마이너스 사용 중"}</small></div>
      <div className="mt-bar" role="img" aria-label={`한도 대비 ${Math.round(use * 100)}% 사용`}>
        <i style={{ width: use * 100 + "%" }} /><u style={{ left: goal * 100 + "%" }} title="목표선 5,000만원" />
      </div>
      <div className="mt-sc"><span>사용률 <b>{Math.round(use * 100)}%</b></span><span>한도 {won(d.limit / 1e4)}만원</span></div>
      {diff != null && <p className={"mt-df " + (diff <= 0 ? "dn" : "up")}>30일 전보다 <b>{diff <= 0 ? "▼" : "▲"} {won(Math.abs(diff) / 1e4)}만원</b></p>}
      {pts.length > 1 && <svg className="mt-sp" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true"><polyline points={line} fill="none" strokeWidth="1.6" vectorEffect="non-scaling-stroke" /></svg>}
      <div className="mt-ft"><small>{dot(d.date)} 기준 · 정확히 {won(debt)}원</small><a href={app + "#tx"} target="_blank" rel="noopener">마통 앱 <Icon n="arrow" size={14} /></a></div>
    </div>
  );
}

function MigrateW({ done, total }: { done: number; total: number }) {
  const r = 34, c = 2 * Math.PI * r, pct = Math.min(1, done / total);
  return (
    <div className="mig">
      <div className="rw">
        <svg viewBox="0 0 84 84" className="ring" aria-hidden="true">
          <circle cx="42" cy="42" r={r} className="rt" />
          <circle cx="42" cy="42" r={r} className="rv" strokeDasharray={`${Math.max(2, c * pct)} ${c}`} />
        </svg>
        <b className="rn">{done}<em>/{total}</em></b>
      </div>
      <small className="msub">네이버 블로그에서 옮겨 온 글</small>
      <a className="xbtn xpri xsm" href="/write"><Icon n="pen" size={15} />다음 글 옮기기</a>
    </div>
  );
}

/* 여행 연표: 연도 + 나라 = 한 여행 */
function TimelineW({ posts }: { posts: DPost[] }) {
  const trips = useMemo(() => {
    const m = new Map<string, DPost[]>();
    posts.forEach((p) => { const k = tripKey(p); if (!m.has(k)) m.set(k, []); m.get(k)!.push(p); });
    return [...m.values()].map((a) => ({ year: tripMonth(a[0]).slice(0, 4), country: a[0].trip.country, cities: [...new Set(a.map((p) => p.trip.city))].join(" · "), n: a.length }))
      .sort((a, b) => (a.year < b.year ? 1 : -1)).slice(0, 5);
  }, [posts]);
  return (
    <ol className="tline">
      {trips.map((t) => (
        <li key={t.year + t.country}><a href={`/#y${t.year}`}>
          <span className="xyr">{t.year || "—"}</span>
          <span className="tt"><b>{t.country}</b><small>{t.cities}</small></span>
          <span className="xn">{t.n}편</span>
        </a></li>
      ))}
    </ol>
  );
}

function AppsW() {
  return (
    <div className="apps">
      {APPS.map((a) => (
        <a key={a.n} className={"app h-" + a.hue} href={a.url} target="_blank" rel="noopener">
          <span className="ai"><Icon n={a.icon} size={22} /></span>
          <span className="at"><b>{a.n}</b><small>{a.sub}</small></span>
          <Icon n="open" size={15} className="ext" />
        </a>
      ))}
      <p className="soon">각 앱의 요약 숫자는 연결 작업 후 이 자리에 나타납니다.</p>
    </div>
  );
}

function MemoW({ memo, setMemo }: { memo: string; setMemo: (m: string) => void }) {
  return (
    <div className="memo">
      <textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="오늘 기억하고 싶은 한 가지…" aria-label="메모" />
      <p className="priv"><Icon n="lock" size={13} />이 기기에만 저장 · 공개되지 않음</p>
    </div>
  );
}

/* ───────────── 캘린더 ───────────── */
type GEv = { title: string; start: string; end: string; allDay: boolean; cal: number; where?: string };
/** 구글 캘린더 일정 (관리자 전용 API). 기간이 바뀔 때마다 다시 불러옵니다. */
function useCal(user: User | null, from: string, to: string) {
  const [ev, setEv] = useState<GEv[] | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (!user) return; let off = false; setEv(null); setErr("");
    (async () => {
      try {
        const r = await fetch(`/api/admin/calendar?from=${from}&to=${to}`, { headers: { authorization: `Bearer ${await user.getIdToken()}` }, cache: "no-store" });
        const j = await r.json();
        if (off) return; if (!r.ok) setErr(j.error || "불러오지 못했습니다."); else setEv(j.events);
      } catch { if (!off) setErr("네트워크 오류로 불러오지 못했습니다."); }
    })();
    return () => { off = true; };
  }, [user, from, to]);
  return { ev, err };
}
const evDay = (e: GEv, d: string) => d >= e.start.slice(0, 10) && d <= e.end.slice(0, 10);
const evTime = (e: GEv) => (e.allDay ? "" : e.start.slice(11, 16));
const addDays = (d: string, n: number) => ymd(new Date(new Date(d + "T00:00").getTime() + n * 864e5));
const WD = ["일", "월", "화", "수", "목", "금", "토"];

function GcW({ user }: { user: User | null }) {
  const today = ymd(kst()), to = addDays(today, 6);
  const { ev, err } = useCal(user, today, to);
  if (err) return <p className="mt-note">{err}</p>;
  if (!ev) return <p className="mt-note">불러오는 중…</p>;
  const rows = Array.from({ length: 7 }, (_, i) => addDays(today, i)).map((d) => ({ d, list: ev.filter((e) => evDay(e, d)) })).filter((r) => r.list.length);
  if (!rows.length) return <p className="mt-note">앞으로 7일 동안 잡힌 일정이 없어요.</p>;
  return (
    <ul className="gc">
      {rows.slice(0, 4).map(({ d, list }) => (
        <li key={d}>
          <span className={"gd" + (d === today ? " now" : "")}><b>{+d.slice(8)}</b><small>{d === today ? "오늘" : WD[new Date(d + "T00:00").getDay()]}</small></span>
          <span className="gl">{list.slice(0, 3).map((e, i) => <span key={i} className={"gi c" + (e.cal % 4)}>{evTime(e) && <em>{evTime(e)}</em>}{e.title}</span>)}{list.length > 3 && <small>외 {list.length - 3}건</small>}</span>
        </li>
      ))}
    </ul>
  );
}

function CalendarPage({ trips, user }: { trips: Trip[]; user: User | null }) {
  const t = kst();
  const [m, setM] = useState(new Date(t.getFullYear(), t.getMonth(), 1));
  const today = ymd(t);
  const last = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [...Array(m.getDay()).fill(null), ...Array.from({ length: last }, (_, i) => ymd(new Date(m.getFullYear(), m.getMonth(), i + 1)))];
  const first = ymd(new Date(m.getFullYear(), m.getMonth(), 1)), lastD = ymd(new Date(m.getFullYear(), m.getMonth() + 1, 0));
  const { ev: gev, err: gerr } = useCal(user, first, lastD);
  const on = (d: string) => trips.filter((x) => d >= x.start && d <= (x.end || x.start));
  const move = (n: number) => setM(new Date(m.getFullYear(), m.getMonth() + n, 1));
  return (
    <main className="pg">
      <div className="hello"><div><p className="xeye">Make room for your days</p><h1>{m.getFullYear()}년 <em>{m.getMonth() + 1}월</em></h1><p className="lead">구글 캘린더 일정과 다음 여행이 함께 표시됩니다.</p></div>
        <div className="cal-nav">
          <button className="ibtn" onClick={() => move(-1)} aria-label="이전 달"><Icon n="left" /></button>
          <button className="xbtn line xsm" onClick={() => setM(new Date(t.getFullYear(), t.getMonth(), 1))}>오늘</button>
          <button className="ibtn" onClick={() => move(1)} aria-label="다음 달"><Icon n="right" /></button>
        </div>
      </div>
      <section className="xcard cal">
        {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => <div key={d} className={"dl" + (i === 0 ? " sun" : i === 6 ? " sat" : "")}>{d}</div>)}
        {cells.map((d, i) => d === null ? <div key={"e" + i} className="dc blank" /> : (
          <div key={d} className={"dc" + (d === today ? " now" : "") + (i % 7 === 0 ? " sun" : i % 7 === 6 ? " sat" : "")}>
            <span className="dn">{+d.slice(8)}</span>
            {on(d).map((x) => <span key={x.id} className={"ev" + (d === x.start ? " st" : "")}>{d === x.start || i % 7 === 0 ? <><Icon n="plane" size={12} />{x.name}</> : " "}</span>)}
            {(gev ?? []).filter((e) => evDay(e, d)).slice(0, 3).map((e, k) => <span key={k} className={"gi c" + (e.cal % 4)} title={e.title + (e.where ? " · " + e.where : "")}>{evTime(e) && <em>{evTime(e)}</em>}{e.title}</span>)}
            {(gev ?? []).filter((e) => evDay(e, d)).length > 3 && <small className="gmore">+{(gev ?? []).filter((e) => evDay(e, d)).length - 3}건</small>}
          </div>
        ))}
      </section>
      <p className="priv cal-note"><Icon n="lock" size={13} />{gerr ? gerr + " " : ""}여행 일정은 오버뷰의 ‘다음 여행’에서, 일반 일정은 구글 캘린더에서 추가·수정합니다.</p>
    </main>
  );
}

/* ───────────── 설정 창 ───────────── */
function Dialog({ cfg, setCfg, dark, toggleDark, posts, siteHero, tab: t0, close, user, saved }: {
  cfg: DashCfg; setCfg: (c: Partial<DashCfg>) => void; dark: boolean; toggleDark: () => void; posts: DPost[]; siteHero: string;
  tab: "design" | "widgets"; close: () => void; user: User | null; saved: DashCfg;
}) {
  const [tab, setTab] = useState<"look" | "type" | "photo" | "widgets">(t0 === "widgets" ? "widgets" : "look");
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { const e = (k: KeyboardEvent) => k.key === "Escape" && close(); addEventListener("keydown", e); return () => removeEventListener("keydown", e); }, [close]);
  const changed = JSON.stringify({ ...cfg, v: "" }) !== JSON.stringify({ ...saved, v: "" });
  async function saveAll() {
    if (!user) return; setBusy(true); setMsg("");
    try {
      const r = await fetch("/api/admin/dashboard", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify(cfg) });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? `실패 (${r.status})`);
      setMsg("저장했습니다. 1~2분 뒤 폰·PC 어디서든 같은 모습으로 보입니다.");
    } catch (e) { setMsg("저장 실패: " + (e as Error).message); } finally { setBusy(false); }
  }
  const heroes = [{ k: "site", src: siteHero, cap: "첫 화면 사진" }, ...posts.filter((p) => p.cover).slice(0, 3).map((p) => ({ k: "post:" + p.id, src: p.cover!, cap: `${p.trip.country} ${p.trip.city}` }))];
  const ws = cfg.widgets;
  const mv = (i: number, d: number) => { const n = [...ws]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; setCfg({ widgets: n }); };
  return (
    <div className="scrim2" onClick={close}>
      <div className="dlg" role="dialog" aria-modal="true" aria-labelledby="dlg-t" onClick={(e) => e.stopPropagation()}>
        <header><div><p className="xeye">Make it yours</p><h2 id="dlg-t">나의 공간, 나의 취향</h2></div><button className="ibtn" onClick={close} aria-label="닫기"><Icon n="close" /></button></header>
        <div className="tabs" role="tablist">
          {([["look", "분위기"], ["type", "글꼴"], ["photo", "큰 사진"], ["widgets", "위젯"]] as const).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
        <div className="body">
          {tab === "look" && (<>
            <div className="pals">{Object.entries(PAL).map(([k, p]) => (
              <button key={k} className="pal" aria-pressed={cfg.palette === k} onClick={() => setCfg({ palette: k, accent: "" })}>
                <span className="xsw" style={{ background: `linear-gradient(135deg, ${p.a}, ${p.b})` }}><i style={{ background: p.side }} /><i style={{ background: p.acc }} /></span>
                <small>{p.n}</small>
              </button>
            ))}</div>
            <div className="frow">
              <label className="fld">포인트 색<span className="color"><input type="color" value={cfg.accent || pal(cfg.palette).acc} onChange={(e) => setCfg({ accent: e.target.value })} />{cfg.accent && <button className="lnk" onClick={() => setCfg({ accent: "" })}>기본색</button>}</span></label>
              <label className="fld">어두운 화면<span className="sw2"><button aria-pressed={!dark} onClick={() => dark && toggleDark()}><Icon n="sun" size={16} />밝게</button><button aria-pressed={dark} onClick={() => !dark && toggleDark()}><Icon n="moon" size={16} />어둡게</button></span></label>
            </div>
            <p className="hint">밝게·어둡게는 기기마다 따로 고를 수 있습니다.</p>
          </>)}
          {tab === "type" && (<>
            {([["titleFont", "제목 글꼴"], ["bodyFont", "본문 글꼴"]] as const).map(([k, l]) => (
              <label className="fld" key={k}>{l}<select value={cfg[k]} onChange={(e) => setCfg({ [k]: e.target.value })}>{FONTS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
            ))}
            <div className="fld">글자 크기<span className="sw2">{(["s", "m", "l"] as const).map((s) => <button key={s} aria-pressed={cfg.size === s} onClick={() => setCfg({ size: s })}>{{ s: "작게", m: "보통", l: "크게" }[s]}</button>)}</span></div>
            <div className="tprev"><b style={{ fontFamily: fam(cfg.titleFont) }}>일상과 여행 사이.</b><p style={{ fontFamily: fam(cfg.bodyFont) }}>느긋하게 걷던 골목, 우연히 만난 풍경. 사진과 글로 하루의 장면을 남깁니다.</p></div>
          </>)}
          {tab === "photo" && (<>
            <div className="hpick">{heroes.map((x) => (
              <button key={x.k} aria-pressed={cfg.hero === x.k} onClick={() => setCfg({ hero: x.k })}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={x.src} alt="" /><small>{x.cap}</small>
              </button>
            ))}</div>
            <label className="fld">첫 화면 사진 설명<input value={cfg.heroCaption} maxLength={60} placeholder="예: 두바이 사막, 2025" onChange={(e) => setCfg({ heroCaption: e.target.value })} /></label>
            <p className="hint">첫 화면 사진은 블로그 [설정 → 사진 바꾸기]에서 바꿀 수 있습니다. 여행기 사진은 장소가 자동으로 붙습니다.</p>
          </>)}
          {tab === "widgets" && (<>
            <ul className="wlist">{[...ws, ...DASH_WIDGETS.filter((w) => !ws.includes(w))].map((w) => { const i = ws.indexOf(w); return (
              <li key={w} className={i < 0 ? "off" : ""}>
                <label><input type="checkbox" checked={i >= 0} onChange={(e) => setCfg({ widgets: e.target.checked ? [...ws, w] : ws.filter((x) => x !== w) })} />
                  <span className="ci"><Icon n={WICON[w]} size={17} /></span>{WNAME[w]}</label>
                {i >= 0 && <span className="ord"><button className="ibtn xsm" onClick={() => mv(i, -1)} disabled={i === 0} aria-label={`${WNAME[w]} 위로`}><Icon n="up" size={16} /></button><button className="ibtn xsm" onClick={() => mv(i, 1)} disabled={i === ws.length - 1} aria-label={`${WNAME[w]} 아래로`}><Icon n="down" size={16} /></button></span>}
              </li>
            ); })}</ul>
          </>)}
        </div>
        <footer>
          <p className="hint">{msg || (changed ? "바꾼 설정은 이 기기에 먼저 보입니다. 저장해야 다른 기기에도 적용됩니다." : "모든 기기에 같은 설정이 적용되어 있습니다.")}</p>
          <div className="xrow">
            <button className="xbtn line" onClick={() => setCfg({ ...DASH_DEFAULT, v: cfg.v })}>기본값</button>
            <button className="xbtn xpri" disabled={busy || !changed} onClick={saveAll}><Icon n="check" size={16} />{busy ? "저장 중…" : "모든 기기에 저장"}</button>
          </div>
        </footer>
      </div>
    </div>
  );
}
const pal = (k: string) => PAL[k] ?? PAL.sage;

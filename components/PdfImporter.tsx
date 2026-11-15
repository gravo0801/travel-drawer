"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, type User } from "firebase/auth";
import { firebaseApp } from "@/lib/firebase";
import { extractPdf } from "@/lib/pdf-extract";
import { pdfToPost, guessTrip } from "@/lib/pdf-to-post";
import { parsePaste, parseHtml, hasImages, naverPostId, type Pasted } from "@/lib/paste-to-blocks";
import type { Block, Photo, Post } from "@/lib/types";
import PostView from "./PostView";

/* ---------- 상태 ---------- */
type Ph = { key: string; blob: Blob; url: string; w: number; h: number };
type DBlock = { type: "text"; text: string } | { type: "photo"; ph: string } | { type: "gallery"; phs: string[] };
type Status = "queued" | "extract" | "ready" | "error" | "publishing" | "done";
type Meta = {
  postId: string; title: string; date: string; country: string; city: string; series: string; category: string;
  hashtags: string; summary: string; places: string[]; cover?: string; publishedAt: string; naverUrl?: string;
};
type Draft = {
  id: string; kind: "pdf" | "new"; file?: File; orig?: Post; status: Status; step: string; error?: string; warnings: string[];
  photos: Record<string, Ph>; blocks: DBlock[]; meta: Meta; selected: boolean; overwrite: boolean;
  manuscript?: string; hints?: { naverUrl?: string; postedAt?: string; hashtags: string[] };
};

const STATUS: Record<Status, string> = {
  queued: "대기 중", extract: "PDF 읽는 중", ready: "확인 대기", error: "오류", publishing: "게시 중", done: "게시 완료",
};
const today = () => new Date().toISOString().slice(0, 10);
const pad = (n: number) => String(n).padStart(3, "0");
const MAX_EDGE = 2400;
const FAIL = "⚠ 사진을 가져오지 못한 자리 — 이 문단을 지우고 '아래에 사진 추가'로 사진을 넣어 주세요.";

/** 편집 상태 → 실제 글(post.json) 형식. preview면 사진 주소를 브라우저 임시 주소로. */
function build(d: Draft, preview: boolean): { post: Post; files: { file: string; blob: Blob }[] } {
  const m = d.meta;
  const files: { file: string; blob: Blob }[] = [];
  const srcOf = new Map<string, string>();
  const use = (key: string) => {
    if (!srcOf.has(key)) {
      const file = `img-${pad(files.length + 1)}.jpg`;
      files.push({ file, blob: d.photos[key].blob });
      srcOf.set(key, preview ? d.photos[key].url : `/media/posts/${m.postId}/${file}`);
    }
    const p = d.photos[key];
    return { src: srcOf.get(key)!, w: p.w, h: p.h };
  };
  const blocks: Block[] = d.blocks.filter((b) => preview || b.type !== "text" || b.text.trim()).map((b) =>
    b.type === "text" ? b : b.type === "photo" ? { type: "photo", ...use(b.ph) } : { type: "gallery", photos: b.phs.map(use) });
  const cover = m.cover && srcOf.has(m.cover) ? srcOf.get(m.cover)! : files.length ? srcOf.values().next().value! : null;
  const post: Post = {
    id: m.postId, title: m.title.trim() || (preview ? "제목을 입력하세요" : ""), trip: { date: m.date.trim(), country: m.country.trim(), city: m.city.trim() },
    publishedAt: m.publishedAt, series: m.series.trim() || (m.date.length >= 7 && m.city.trim() ? `${m.date.slice(0, 4)}.${m.date.slice(5, 7)} ${m.city.trim()}` : undefined), category: m.category.trim() || null,
    hashtags: m.hashtags.split(/[\s,#]+/).map((t) => t.trim()).filter(Boolean),
    summary: m.summary.trim() || undefined, places: m.places.length ? m.places : undefined,
    cover, blocks, naverUrl: m.naverUrl ?? null, source: d.orig?.source ?? (d.kind === "new" ? "editor" : m.naverUrl ? "naver" : "pdf"), photoCount: files.length,
  };
  return { post, files };
}

async function toBase64(b: Blob): Promise<string> {
  const s = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(b); });
  return s.slice(s.indexOf(",") + 1);
}

/** 원본 사진으로 교체할 때: 회전 정보 반영, 너무 크면 줄여서 JPEG로. */
async function loadOriginal(f: Blob): Promise<{ blob: Blob; w: number; h: number }> {
  const bmp = await createImageBitmap(f);
  const k = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  const x = c.getContext("2d")!; x.imageSmoothingQuality = "high"; x.drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise<Blob>((r, j) => c.toBlob((b) => (b ? r(b) : j(new Error("변환 실패"))), "image/jpeg", 0.9));
  return { blob, w: c.width, h: c.height };
}

/** 2026.01.23 / 2026/1/23 / 20260123 같은 입력을 2026-01-23 형식으로 */
function normDate(v: string): string {
  const t = v.trim();
  const m = t.match(/^(\d{4})[.\/\-\s]?(\d{1,2})(?:[.\/\-\s]?(\d{1,2}))?\.?$/);
  if (!m || +m[2] > 12) return v;
  return [m[1], m[2].padStart(2, "0"), m[3] && m[3].padStart(2, "0")].filter(Boolean).join("-");
}
const dateOk = (v: string) => /^\d{4}(-\d{2}(-\d{2})?)?$/.test(v.trim());

/** 사진 90도 회전 (시계 방향) */
async function rotate(p: { blob: Blob }): Promise<{ blob: Blob; w: number; h: number }> {
  const bmp = await createImageBitmap(p.blob);
  const c = document.createElement("canvas");
  c.width = bmp.height; c.height = bmp.width;
  const x = c.getContext("2d")!;
  x.translate(c.width, 0); x.rotate(Math.PI / 2); x.drawImage(bmp, 0, 0);
  const blob = await new Promise<Blob>((r, j) => c.toBlob((b) => (b ? r(b) : j(new Error("회전 실패"))), "image/jpeg", 0.92));
  return { blob, w: c.width, h: c.height };
}

/* ---------- 화면 ---------- */
export default function PdfImporter() {
  const app = firebaseApp();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [cur, setCur] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; links?: { id: string; title: string }[] } | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [pasting, setPasting] = useState("");
  const [naverUrl, setNaverUrl] = useState("");
  const [cfg, setCfg] = useState<{ firebase: boolean; adminUids: boolean; githubToken: boolean } | null>(null);
  const [uidCopied, setUidCopied] = useState(false);
  useEffect(() => { fetch("/api/admin/status").then((r) => r.json()).then(setCfg).catch(() => {}); }, []);

  // ?edit=글번호 로 들어오면 그 글을 불러와 수정
  const editLoaded = useRef(false);
  useEffect(() => {
    const id = new URLSearchParams(location.search).get("edit");
    if (!id || !user || editLoaded.current) return;
    editLoaded.current = true;
    (async () => {
      setPasting("수정할 글을 불러오는 중…");
      try {
        const { post } = (await api("/api/admin/post", { id })) as { post: Post };
        const photos: Record<string, Ph> = {};
        const bySrc = new Map<string, string>();
        const all: Photo[] = (post.blocks ?? []).flatMap((b) => (b.type === "photo" ? [b] : b.type === "gallery" ? b.photos : []));
        let done = 0;
        for (const ph of all) {
          if (bySrc.has(ph.src)) continue;
          setPasting(`수정할 글을 불러오는 중… 사진 ${++done}/${all.length}`);
          try {
            const r = await fetch(ph.src, { cache: "no-store" });
            if (!r.ok) throw new Error();
            const blob = await r.blob();
            const key = crypto.randomUUID();
            photos[key] = { key, blob, url: URL.createObjectURL(blob), w: ph.w, h: ph.h };
            bySrc.set(ph.src, key);
          } catch { /* 아직 배포 전인 사진 등 */ }
        }
        const blocks: DBlock[] = (post.blocks ?? []).flatMap((b): DBlock[] => {
          if (b.type === "text") return [{ type: "text", text: b.text }];
          if (b.type === "photo") return bySrc.get(b.src) ? [{ type: "photo", ph: bySrc.get(b.src)! }] : [{ type: "text", text: FAIL }];
          const phs = b.photos.map((p) => bySrc.get(p.src)).filter(Boolean) as string[];
          return phs.length ? [{ type: "gallery", phs }] : [];
        });
        const did = crypto.randomUUID();
        setDrafts((ds) => [...ds, {
          id: did, kind: "new", orig: post, status: "ready", step: "", warnings: [], photos, blocks: blocks.length ? blocks : [{ type: "text", text: "" }], selected: true, overwrite: true,
          meta: {
            postId: post.id, title: post.title ?? "", date: post.trip?.date ?? "", country: post.trip?.country ?? "", city: post.trip?.city ?? "",
            series: post.series ?? "", category: post.category ?? "", hashtags: (post.hashtags ?? []).join(" "), summary: post.summary ?? "",
            places: post.places ?? [], cover: post.cover ? bySrc.get(post.cover) : undefined, publishedAt: post.publishedAt ?? today(), naverUrl: post.naverUrl ?? undefined,
          },
        }]);
        setCur(did);
        setMsg({ ok: true, text: "글을 불러왔습니다. 고친 뒤 [수정 내용 게시]를 누르세요." });
      } catch (e) { setMsg({ ok: false, text: `글을 불러오지 못했습니다: ${(e as Error).message}` }); }
      setPasting("");
    })();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps
  const busy = useRef(false);
  const fileIn = useRef<HTMLInputElement>(null);
  const replaceIn = useRef<HTMLInputElement>(null);
  const replaceKey = useRef<string | null>(null);
  const photoIn = useRef<HTMLInputElement>(null);
  const photoAt = useRef(-1);
  const pickPhotos = (at: number) => { photoAt.current = at; photoIn.current?.click(); };

  useEffect(() => {
    if (!app) { setReady(true); return; }
    return onAuthStateChanged(getAuth(app), (u) => { setUser(u); setReady(true); });
  }, [app]);

  const patch = useCallback((id: string, f: (d: Draft) => Partial<Draft>) =>
    setDrafts((ds) => ds.map((d) => (d.id === id ? { ...d, ...f(d) } : d))), []);

  const api = useCallback(async (path: string, body: unknown) => {
    if (!user) throw new Error("로그인이 필요합니다.");
    const r = await fetch(path, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({ error: `서버 오류 (${r.status})` }));
    if (!r.ok) throw Object.assign(new Error(j.error ?? `오류 ${r.status}`), { data: j });
    return j;
  }, [user]);

  function addFiles(list: FileList | File[]) {
    const pdfs = [...list].filter((f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name));
    if (!pdfs.length) { setMsg({ ok: false, text: "PDF 파일만 올릴 수 있습니다." }); return; }
    const next: Draft[] = pdfs.map((file) => ({
      id: crypto.randomUUID(), kind: "pdf", file, status: "queued", step: "", warnings: [], photos: {}, blocks: [], selected: true, overwrite: false,
      meta: { postId: "", title: file.name.replace(/\.pdf$/i, ""), date: "", country: "", city: "", series: "", category: "", hashtags: "", summary: "", places: [], publishedAt: today() },
    }));
    setDrafts((ds) => [...ds, ...next]);
    setCur((c) => c ?? next[0].id);
    setMsg(null);
  }

  function newPost(): string {
    const id = crypto.randomUUID();
    setDrafts((ds) => [...ds, {
      id, kind: "new", status: "ready", step: "", warnings: [], photos: {}, blocks: [{ type: "text", text: "" }], selected: true, overwrite: false,
      meta: { postId: `p${Date.now().toString(36)}`, title: "", date: "", country: "", city: "", series: "", category: "", hashtags: "", summary: "", places: [], publishedAt: today() },
    }]);
    setCur(id); setEditing(0); setMsg(null);
    return id;
  }

  /** 붙여넣기: 네이버 글 수정 화면에서 복사한 글·사진을 순서대로 넣음 */
  async function fetchImage(src: string): Promise<Blob> {
    if (src.startsWith("data:")) return (await fetch(src)).blob();
    const u = new URL(src, location.href);
    if (/(^|\.)(pstatic\.net|naver\.net|naver\.com)$/i.test(u.hostname)) {
      const r = await fetch("/api/admin/image", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${await user!.getIdToken()}` }, body: JSON.stringify({ url: u.toString() }) });
      if (r.ok) return r.blob();
      const why = ((await r.json().catch(() => ({}))) as { error?: string }).error ?? `오류 ${r.status}`;
      // 서버가 못 받으면 브라우저에서 직접 시도
      try { const d2 = await fetch(u.toString().replace(/^http:/, "https:"), { mode: "cors", referrerPolicy: "no-referrer" }); if (d2.ok) return d2.blob(); } catch { /* 무시 */ }
      throw new Error(why);
    }
    const r = await fetch(u.toString());
    if (!r.ok) throw new Error("fail");
    return r.blob();
  }

  /** 붙여넣기 하나로 끝: 새 글이 없으면 만들고, 네이버 글 주소면 글·사진을 통째로 가져옴 */
  async function onPasteContent(dt: DataTransfer, at?: number) {
    const target = d && d.kind === "new" && d.status === "ready" ? d.id : newPost();
    const plain = dt.getData("text/plain").trim();
    if (!hasImages(dt) && plain.length < 400 && naverPostId(plain) && !/\s/.test(plain)) { await importUrl(plain, target); return; }
    await importParsed(parsePaste(dt), at, undefined, target);
  }

  /** 네이버 글 주소로 글·사진 통째로 가져오기 */
  async function importUrl(url = naverUrl, target?: string) {
    const ids = naverPostId(url);
    if (!ids) { setMsg({ ok: false, text: "네이버 블로그 글 주소를 넣어 주세요. 예: https://blog.naver.com/bbae30714/224187426392" }); return; }
    setPasting("네이버 글을 불러오는 중…");
    try {
      const r = await api("/api/admin/naver", ids);
      const parsed = parseHtml(r.html);
      await importParsed(parsed, undefined, { url: r.url, logNo: ids.logNo }, target);
      setNaverUrl("");
    } catch (e) { setPasting(""); setMsg({ ok: false, text: (e as Error).message }); }
  }

  async function importParsed({ title, parts, postedAt }: Pasted, at?: number, naver?: { url: string; logNo: string }, target?: string) {
    const id = target ?? d?.id;
    if (!id) return;
    if (!parts.length) { setMsg({ ok: false, text: "붙여넣은 내용에서 글이나 사진을 찾지 못했습니다." }); return; }
    const nImg = parts.filter((p) => p.type !== "text").length;
    setPasting(`붙여넣는 중… 사진 0/${nImg}`);
    const photos: Record<string, Ph> = {};
    const blocks: DBlock[] = [];
    let paras: string[] = [], done = 0, failed = 0, small = 0, why = "";
    const flush = () => { if (paras.length) blocks.push({ type: "text", text: paras.join("\n\n") }); paras = []; };
    // 해시태그만 있는 문단은 태그로 옮기고, 문단 끝의 태그도 떼어 냄
    const tagSet = new Set<string>();
    for (const p of parts) if (p.type === "text") {
      (p.text.match(/#[^\s#]+/g) ?? []).forEach((t) => tagSet.add(t.slice(1)));
      p.text = p.text.replace(/(\s*#[^\s#]+)+\s*$/, "").trim();
    }
    // 사진은 4장씩 동시에 받고, 넣는 순서는 원래대로
    type Got = { ok: true; o: { blob: Blob; w: number; h: number } } | { ok: false; why: string };
    const imgParts = parts.filter((p) => p.type !== "text");
    const results: Got[] = new Array(imgParts.length);
    let next = 0;
    const worker = async () => {
      for (let i = next++; i < imgParts.length; i = next++) {
        const p = imgParts[i];
        try {
          if (p.type === "missing") throw new Error("붙여넣은 내용에 사진이 없음(화면에 아직 안 불러온 사진)");
          const o = await loadOriginal(p.type === "file" ? p.file : await fetchImage((p as { src: string }).src));
          if (Math.max(o.w, o.h) < 200) throw new Error(`미리보기용 작은 사진만 받음(${o.w}×${o.h})`);
          results[i] = { ok: true, o };
        } catch (e) { results[i] = { ok: false, why: (e as Error).message }; }
        setPasting(`붙여넣는 중… 사진 ${++done}/${nImg}`);
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    let ii = 0;
    for (const p of parts) {
      if (p.type === "text") { if (p.text) paras.push(p.text); continue; }
      flush();
      const r = results[ii++];
      if (r.ok) {
        const key = crypto.randomUUID();
        photos[key] = { key, blob: r.o.blob, url: URL.createObjectURL(r.o.blob), w: r.o.w, h: r.o.h };
        blocks.push({ type: "photo", ph: key });
        if (Math.max(r.o.w, r.o.h) < 700) small++;
      } else { failed++; why ||= r.why; blocks.push({ type: "text", text: FAIL }); }
    }
    flush();
    setPasting("");
    patch(id, (x) => {
      const empty = x.blocks.length === 0 || (x.blocks.length === 1 && x.blocks[0].type === "text" && !x.blocks[0].text.trim());
      const firstPhoto = blocks.find((b) => b.type === "photo") as { ph: string } | undefined;
      const tags = [...tagSet];
      const t = x.meta.title || title || "";
      const g = guessTrip(t, tags, blocks.filter((b) => b.type === "text").map((b) => (b as { text: string }).text));
      const nb = empty ? blocks : at !== undefined ? [...x.blocks.slice(0, at + 1), ...blocks, ...x.blocks.slice(at + 1)] : [...x.blocks, ...blocks];
      return {
        photos: { ...x.photos, ...photos },
        blocks: nb,
        meta: {
          ...x.meta, title: t,
          ...(naver ? { naverUrl: naver.url, postId: naver.logNo } : {}),
          ...(postedAt ? { publishedAt: postedAt } : {}), cover: x.meta.cover ?? firstPhoto?.ph, hashtags: x.meta.hashtags || tags.join(" "),
          date: x.meta.date || g.date || (postedAt ? postedAt.slice(0, 7) : ""), country: x.meta.country || g.country, city: x.meta.city || g.city, series: x.meta.series || g.series,
        },
        warnings: [
          ...(failed ? [`사진 ${failed}장을 가져오지 못했습니다. 이유: ${why}. 네이버 글 '주소'를 복사해 붙여넣으면 사진을 모두 가져올 수 있습니다.`] : []),
          ...(small ? [`사진 ${small}장은 가로·세로 700px 미만으로 작습니다. 필요하면 '원본으로 교체'를 눌러 주세요.`] : []),
        ],
      };
    });
    setEditing(null);
    setMsg({ ok: true, text: `글 ${parts.length - nImg}문단, 사진 ${nImg - failed}장을 넣었습니다.` });
  }

  // 새 글 화면에서는 입력칸 밖 어디서든 붙여넣으면 글·사진이 들어오게
  const pasteRef = useRef(onPasteContent);
  pasteRef.current = onPasteContent;
  useEffect(() => {
    const h = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.closest("input, textarea:not(.paste-in), [contenteditable=true]"))) return;
      if (!e.clipboardData) return;
      e.preventDefault(); pasteRef.current(e.clipboardData);
    };
    document.addEventListener("paste", h);
    return () => document.removeEventListener("paste", h);
  }, []);

  /** 사진 여러 장을 고른 순서대로 at번째 블록 뒤에 넣음 (at = -1이면 맨 끝) */
  async function addPhotos(list: FileList, at: number) {
    if (!d) return;
    const files = [...list].filter((f) => f.type.startsWith("image/") || /\.(heic|jpe?g|png|webp)$/i.test(f.name));
    const added: Ph[] = [];
    for (const f of files) {
      try { const o = await loadOriginal(f); added.push({ key: crypto.randomUUID(), blob: o.blob, url: URL.createObjectURL(o.blob), w: o.w, h: o.h }); }
      catch { setMsg({ ok: false, text: `${f.name}: 사진을 읽지 못했습니다.` }); }
    }
    if (!added.length) return;
    patch(d.id, (x) => {
      const photos = { ...x.photos }; added.forEach((p) => (photos[p.key] = p));
      const blocks = [...x.blocks];
      const nb: DBlock[] = added.map((p) => ({ type: "photo", ph: p.key }));
      blocks.splice(at < 0 ? blocks.length : at + 1, 0, ...nb);
      return { photos, blocks, meta: x.meta.cover ? x.meta : { ...x.meta, cover: added[0].key } };
    });
  }

  /** 정리: 추출된 원고를 규칙으로 글 형식으로 (AI 없음, 비용 0원) */
  const arrange = useCallback((d: Draft, photoKeys: string[]) => {
    const r = pdfToPost(d.manuscript ?? "", d.hints ?? { hashtags: [] }, d.file?.name);
    const key = (n: number) => photoKeys[n - 1];
    const used = new Set<number>();
    const blocks: DBlock[] = r.blocks.flatMap((b): DBlock[] => {
      if (b.type === "text") return [b];
      if (!key(b.ref) || used.has(b.ref)) return [];
      used.add(b.ref); return [{ type: "photo", ph: key(b.ref) }];
    });
    patch(d.id, (x) => ({
      status: "ready", step: "", blocks, warnings: r.warnings,
      meta: { ...x.meta, title: r.title, date: r.date, country: r.country, city: r.city, series: r.series, category: r.category, hashtags: r.hashtags.join(" "), cover: photoKeys[0] },
    }));
  }, [patch]);

  // 대기 중인 PDF를 한 편씩 차례로 처리
  useEffect(() => {
    if (busy.current || !user) return;
    const d = drafts.find((x) => x.status === "queued");
    if (!d) return;
    busy.current = true;
    (async () => {
      try {
        patch(d.id, () => ({ status: "extract", step: "PDF를 여는 중…" }));
        const ex = await extractPdf(d.file!, (p, t) => patch(d.id, () => ({ step: `PDF 읽는 중 ${p}/${t}쪽` })));
        const photos: Record<string, Ph> = {};
        const keys = ex.photos.map((p) => { const key = crypto.randomUUID(); photos[key] = { key, blob: p.blob, url: p.url, w: p.w, h: p.h }; return key; });
        const postId = ex.hints.naverId ?? `p${Date.now().toString(36)}`;
        const withEx: Draft = { ...d, photos, manuscript: ex.manuscript, hints: ex.hints };
        patch(d.id, (x) => ({ photos, manuscript: ex.manuscript, hints: ex.hints, meta: { ...x.meta, postId, publishedAt: ex.hints.postedAt ?? today(), naverUrl: ex.hints.naverUrl } }));
        if (!ex.manuscript.trim() && !keys.length) throw new Error("PDF에서 글자와 사진을 찾지 못했습니다. 스캔한 이미지 PDF는 아직 지원하지 않습니다.");
        arrange(withEx, keys);
      } catch (e) {
        patch(d.id, () => ({ status: "error", step: "", error: (e as Error).message }));
      } finally { busy.current = false; setDrafts((ds) => [...ds]); }
    })();
  }, [drafts, user, patch, arrange]);

  async function publish(targets: Draft[]) {
    if (!targets.length) return;
    const bad = targets.find((t) => t.blocks.some((b) => b.type === "text" && b.text.includes("⚠ 사진을 가져오지 못한 자리")));
    if (bad) { setMsg({ ok: false, text: `"${bad.meta.title || "새 글"}"에 사진을 못 가져온 자리(⚠)가 남아 있습니다. 사진을 넣고 그 문단을 지워 주세요.` }); return; }
    setMsg(null);
    targets.forEach((d) => patch(d.id, () => ({ status: "publishing", step: "사진 올리는 중…", error: undefined })));
    try {
      const items = [];
      for (const d of targets) {
        const { post, files } = build(d, false);
        const photos: { file: string; sha: string }[] = [];
        let done = 0;
        const queue = [...files];
        const worker = async () => {
          for (let f = queue.shift(); f; f = queue.shift()) {
            const { sha } = await api("/api/admin/blob", { base64: await toBase64(f.blob) });
            photos.push({ file: f.file, sha });
            patch(d.id, () => ({ step: `사진 올리는 중 ${++done}/${files.length}` }));
          }
        };
        await Promise.all([worker(), worker(), worker()]);
        items.push({ post, photos, overwrite: d.overwrite });
      }
      targets.forEach((d) => patch(d.id, () => ({ step: "게시하는 중…" })));
      await api("/api/admin/publish", { items });
      targets.forEach((d) => patch(d.id, () => ({ status: "done", step: "", selected: false })));
      setMsg({ ok: true, text: `${items.length}편을 게시했습니다. 사이트에는 1~2분 뒤(다시 배포가 끝나면) 보입니다.`, links: items.map((i) => ({ id: i.post.id, title: i.post.title })) });
    } catch (e) {
      const conflicts: string[] = (e as { data?: { conflicts?: string[] } }).data?.conflicts ?? [];
      targets.forEach((d) => patch(d.id, () => ({
        status: "ready", step: "",
        error: conflicts.includes(d.meta.postId) ? "같은 번호의 글이 이미 있습니다. 덮어쓰려면 '기존 글 덮어쓰기'를 켜 주세요." : undefined,
      })));
      setMsg({ ok: false, text: (e as Error).message });
    }
  }

  /* ---------- 블록 편집 ---------- */
  const d = drafts.find((x) => x.id === cur) ?? null;
  const setBlocks = (f: (b: DBlock[]) => DBlock[]) => d && patch(d.id, (x) => ({ blocks: f([...x.blocks]) }));
  const setMeta = (m: Partial<Meta>) => d && patch(d.id, (x) => ({ meta: { ...x.meta, ...m } }));
  const move = (k: number, dir: -1 | 1) => setBlocks((b) => { const j = k + dir; if (j < 0 || j >= b.length) return b; [b[k], b[j]] = [b[j], b[k]]; return b; });
  const remove = (k: number) => setBlocks((b) => (b.splice(k, 1), b));
  const joinNext = (k: number) => setBlocks((b) => {
    const a = b[k], n = b[k + 1];
    const keys = (x: DBlock) => (x.type === "photo" ? [x.ph] : x.type === "gallery" ? x.phs : []);
    if (!n || a.type === "text" || n.type === "text") return b;
    b.splice(k, 2, { type: "gallery", phs: [...keys(a), ...keys(n)] }); return b;
  });
  const split = (k: number) => setBlocks((b) => { const g = b[k]; if (g.type !== "gallery") return b; b.splice(k, 1, ...g.phs.map((ph) => ({ type: "photo" as const, ph }))); return b; });
  const addText = (k: number) => { setBlocks((b) => (b.splice(k + 1, 0, { type: "text", text: "" }), b)); setEditing(k + 1); };

  async function onReplace(f: File | undefined) {
    const key = replaceKey.current;
    if (!f || !d || !key) return;
    try {
      const o = await loadOriginal(f);
      patch(d.id, (x) => ({ photos: { ...x.photos, [key]: { key, blob: o.blob, url: URL.createObjectURL(o.blob), w: o.w, h: o.h } } }));
    } catch { setMsg({ ok: false, text: "사진을 읽지 못했습니다. JPG·PNG·HEIC(사파리) 파일을 써 주세요." }); }
  }

  const tools = (k: number) => {
    if (!d) return null;
    const b = d.blocks[k];
    const nextIsPhoto = d.blocks[k + 1] && d.blocks[k + 1].type !== "text";
    return (
      <>
        <div className="p-tbar">
          <button type="button" onClick={() => move(k, -1)} aria-label="위로" disabled={k === 0}>↑</button>
          <button type="button" onClick={() => move(k, 1)} aria-label="아래로" disabled={k === d.blocks.length - 1}>↓</button>
          {b.type === "photo" && <>
            <button type="button" className={d.meta.cover === b.ph ? "on" : ""} onClick={() => setMeta({ cover: b.ph })}>{d.meta.cover === b.ph ? "대표 사진" : "대표로"}</button>
            <button type="button" onClick={async () => { const o = await rotate(d.photos[b.ph]); patch(d.id, (x) => ({ photos: { ...x.photos, [b.ph]: { ...x.photos[b.ph], blob: o.blob, url: URL.createObjectURL(o.blob), w: o.w, h: o.h } } })); }}>↻ 회전</button>
            <button type="button" onClick={() => { replaceKey.current = b.ph; replaceIn.current?.click(); }}>원본으로 교체</button>
          </>}
          {nextIsPhoto && b.type !== "text" && <button type="button" onClick={() => joinNext(k)}>다음 사진과 묶기</button>}
          {b.type === "gallery" && <button type="button" onClick={() => split(k)}>묶음 풀기</button>}
          <button type="button" onClick={() => addText(k)}>아래에 글 추가</button>
          <button type="button" onClick={() => pickPhotos(k)}>아래에 사진 추가</button>
          <button type="button" className="del" onClick={() => remove(k)}>삭제</button>
        </div>
      </>
    );
  };

  /** 문단은 미리보기 자리에서 바로 고쳐 씀. 사진이 섞인 내용을 붙여넣으면 그 아래에 글+사진으로 들어감 */
  const textView = (k: number) => {
    if (!d || d.status !== "ready") return null;
    const b = d.blocks[k];
    if (b.type !== "text") return null;
    return (
      <textarea className="p-ta" value={b.text} autoFocus={editing === k} placeholder="여기에 글을 쓰세요. 빈 줄로 문단을 나눕니다."
        rows={Math.max(3, b.text.split("\n").length + 1)}
        onFocus={() => setEditing(k)}
        onChange={(e) => setBlocks((bs) => (bs[k] = { type: "text", text: e.target.value }, bs))}
        onPaste={(e) => { if (hasImages(e.clipboardData)) { e.preventDefault(); e.stopPropagation(); onPasteContent(e.clipboardData, k); } }} />
    );
  };

  /* ---------- 렌더 ---------- */
  if (!ready) return <main className="admin"><p className="muted">확인 중…</p></main>;
  if (!app) return <main className="admin"><section className="admin-card"><h1>글쓰기</h1><p className="muted">Firebase 설정이 연결되지 않았습니다.</p></section></main>;
  if (!user) return (
    <main className="admin"><section className="admin-card">
      <h1>글쓰기</h1>
      <p className="muted">관리자 로그인 후 사용할 수 있습니다.</p>
      <button className="btn" type="button" onClick={() => signInWithPopup(getAuth(app), new GoogleAuthProvider()).catch(() => {})}>Google 계정으로 로그인</button>
    </section></main>
  );

  const ready_ = drafts.filter((x) => x.status === "ready" && x.selected);
  const preview = d && (d.status === "ready" || d.status === "publishing" || d.status === "done" || false) ? build(d, true).post : null;

  return (
    <div className="imp">
      <aside className="imp-side">
        <h1>글쓰기</h1>
        {cfg && (!cfg.adminUids || !cfg.githubToken) && (
          <div className="setup">
            <b>저장하려면 설정 2가지가 필요합니다</b>
            <ol>
              {!cfg.adminUids && <li>관리자 번호 <code>ADMIN_UIDS</code> = 아래 번호
                <span className="uidrow"><code>{user.uid}</code><button type="button" onClick={() => navigator.clipboard.writeText(user.uid).then(() => { setUidCopied(true); setTimeout(() => setUidCopied(false), 1500); })}>{uidCopied ? "복사됨" : "복사"}</button></span></li>}
              {!cfg.githubToken && <li>저장용 열쇠 <code>GITHUB_TOKEN</code> = <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">GitHub에서 만들기</a> (저장소 travel-drawer, Contents 읽기·쓰기)</li>}
              <li><a href="https://vercel.com/gravo0801s-projects/travel-drawer/settings/environment-variables" target="_blank" rel="noreferrer">Vercel 환경변수</a>에 넣고 → Deployments에서 Redeploy</li>
            </ol>
            <small>설정 전에도 글쓰기·미리보기는 됩니다. 게시만 안 됩니다.</small>
          </div>
        )}
        <div className="imp-new">
          <button type="button" onClick={newPost}>✎ 새 글 쓰기<span>직접 쓰고 사진 넣기</span></button>
          <button type="button" onClick={() => fileIn.current?.click()}>⇪ PDF 가져오기<span>자동 정리</span></button>
        </div>
        <div className={"drop" + (over ? " over" : "")} role="button" tabIndex={0}
          onClick={() => fileIn.current?.click()} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileIn.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); addFiles(e.dataTransfer.files); }}>
          <strong>PDF를 여기로 끌어다 놓기</strong>
          <span>또는 눌러서 고르기 · 여러 편 한 번에 가능</span>
        </div>
        <input ref={fileIn} type="file" accept="application/pdf,.pdf" multiple hidden onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
        <input ref={photoIn} type="file" accept="image/*" multiple hidden onChange={(e) => { if (e.target.files) addPhotos(e.target.files, photoAt.current); e.target.value = ""; }} />
        <input ref={replaceIn} type="file" accept="image/*" hidden onChange={(e) => { onReplace(e.target.files?.[0]); e.target.value = ""; }} />

        {!!drafts.length && <ul className="q">
          {drafts.map((x) => (
            <li key={x.id} className={x.id === cur ? "on" : ""}>
              {x.status === "ready" && <input type="checkbox" checked={x.selected} aria-label="게시할 글로 선택" onChange={(e) => patch(x.id, () => ({ selected: e.target.checked }))} />}
              <button type="button" onClick={() => { setCur(x.id); setEditing(null); }}>
                <span className="q-t">{x.orig ? "[수정] " : x.kind === "new" ? "✎ " : ""}{x.meta.title || "새 글"}</span>
                <span className={"q-s s-" + x.status}>{x.step || STATUS[x.status]}{x.status === "ready" && x.warnings.length ? " · 확인 필요" : ""}</span>
              </button>
            </li>
          ))}
        </ul>}

        <button className="btn pub" type="button" disabled={!ready_.length} onClick={() => publish(ready_)}>
          {ready_.length ? `선택한 ${ready_.length}편 게시` : "게시할 글 없음"}
        </button>
        {msg && <div className={"imp-msg" + (msg.ok ? " ok" : " bad")} role="status">
          <p>{msg.text}</p>
          {msg.links?.map((l) => <Link key={l.id} href={`/posts/${l.id}`}>{l.title} →</Link>)}
        </div>}
        <p className="imp-help">PDF의 글자와 사진을 순서대로 읽어 제목·여행 날짜·나라·도시·태그를 채우고 이 블로그 글 모양으로 정리합니다(AI 미사용, 무료). 빈 칸은 직접 채워 주세요.<br />네이버 PDF 사진은 가로 743px이라 화질이 낮으니, 중요한 사진은 &lsquo;원본으로 교체&rsquo;로 구글 포토 원본을 넣어 주세요.</p>
        <Link className="imp-back" href="/admin">← 관리자</Link>
      </aside>

      <section className="imp-main">
        {!d && <div className="imp-empty start">
          <p className="big">{pasting ? <span className="spin">{pasting}</span> : <>그냥 <kbd>Ctrl</kbd> + <kbd>V</kbd></>}</p>
          <ol>
            <li>네이버 블로그에서 옮길 글을 엽니다.</li>
            <li>본문을 드래그하거나 <kbd>Ctrl</kbd>+<kbd>A</kbd> → <kbd>Ctrl</kbd>+<kbd>C</kbd> (또는 <b>글 주소만 복사</b>)</li>
            <li>이 화면에서 <kbd>Ctrl</kbd>+<kbd>V</kbd> → 글과 사진이 순서대로 들어옵니다.</li>
            <li>나라·도시 확인 후 <b>[이 글만 게시]</b></li>
          </ol>
          <p className="muted">직접 쓰려면 왼쪽 <b>새 글 쓰기</b>, PDF는 왼쪽에 끌어다 놓기</p>
        </div>}
        {d && (d.status === "queued" || d.status === "extract" || false) && <div className="imp-empty"><p className="spin">{d.step || STATUS[d.status]}</p></div>}
        {d && d.status === "error" && <div className="imp-empty"><p className="bad">{d.error}</p>
</div>}
        {d && preview && <>
          {d.kind === "new" && d.status === "ready" && (
            <div className="paste-box">
              <form className="url-row" onSubmit={(e) => { e.preventDefault(); importUrl(); }}>
                <input value={naverUrl} onChange={(e) => setNaverUrl(e.target.value)} placeholder="네이버 글 주소 붙여넣기 (예: https://blog.naver.com/bbae30714/224187426392)" disabled={!!pasting} />
                <button className="btn" type="submit" disabled={!!pasting || !naverUrl.trim()}>글·사진 가져오기</button>
              </form>
              <textarea className="paste-in" aria-label="여기에 붙여넣기" value="" onChange={() => {}} disabled={!!pasting}
                placeholder={pasting || "또는 여기를 누르고 붙여넣기 (Ctrl+V)\n네이버 글 화면에서 본문을 전체 선택(Ctrl+A) → 복사(Ctrl+C)한 뒤 붙여넣으면 글과 사진이 순서대로 들어옵니다."}
                onPaste={(e) => { e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); onPasteContent(e.clipboardData); }} />
            </div>
          )}
          <form className="meta" onSubmit={(e) => e.preventDefault()}>
            {d.error && <p className="bad wide">{d.error}</p>}
            {d.warnings.map((w) => <p key={w} className="warn wide">{w}</p>)}
            <label className="wide">제목<input value={d.meta.title} placeholder="비어 있음" onChange={(e) => setMeta({ title: e.target.value })} /></label>
            <label className={!d.meta.date || dateOk(d.meta.date) ? "" : "need"}>여행 날짜 <small>예: 2026-01-23 또는 2026-01</small><input value={d.meta.date} placeholder="비어 있음" inputMode="numeric" onChange={(e) => setMeta({ date: normDate(e.target.value) })} /></label>
            <label>나라<input value={d.meta.country} placeholder="비어 있음" onChange={(e) => setMeta({ country: e.target.value })} /></label>
            <label>도시<input value={d.meta.city} placeholder="비어 있음" onChange={(e) => setMeta({ city: e.target.value })} /></label>
            <label>여행 묶음 <small>예: 2026.01 방콕</small><input value={d.meta.series} placeholder="비워도 됨" onChange={(e) => setMeta({ series: e.target.value })} /></label>
            <label>분류<input value={d.meta.category} onChange={(e) => setMeta({ category: e.target.value })} /></label>
            <label>작성일<input type="date" value={d.meta.publishedAt} onChange={(e) => setMeta({ publishedAt: e.target.value })} /></label>
            <label className="wide">태그 <small>띄어쓰기로 구분</small><input value={d.meta.hashtags} onChange={(e) => setMeta({ hashtags: e.target.value })} /></label>
            <label className="wide">요약 <small>글 목록에 보임</small><textarea rows={2} value={d.meta.summary} onChange={(e) => setMeta({ summary: e.target.value })} /></label>
            {!!d.meta.places.length && <p className="wide places"><b>글에 나온 장소</b> {d.meta.places.join(" → ")}</p>}
            <div className="wide row">
              <label className="chk"><input type="checkbox" checked={d.overwrite} onChange={(e) => patch(d.id, () => ({ overwrite: e.target.checked }))} />기존 글 덮어쓰기 <small>(글 번호 {d.meta.postId})</small></label>
              <button className="btn ghost" type="button" onClick={() => pickPhotos(-1)} disabled={d.status !== "ready"}>사진 추가</button>
              <button className="btn" type="button" onClick={() => publish([d])} disabled={d.status !== "ready"}>{d.orig ? "수정 내용 게시" : "이 글만 게시"}</button>
            </div>
          </form>
          <article className="post imp-preview" aria-label="게시 미리보기">
            <PostView post={preview} tools={d.status === "ready" ? tools : undefined} textView={textView} />
            {d.status === "ready" && <div className="imp-add">
              <button className="btn ghost" type="button" onClick={() => addText(d.blocks.length - 1)}>+ 글 문단</button>
              <button className="btn ghost" type="button" onClick={() => pickPhotos(-1)}>+ 사진</button>
            </div>}
          </article>
        </>}
      </section>
    </div>
  );
}

"use client";
/**
 * PDF → 글 재료 추출 (브라우저에서 실행).
 * 텍스트 줄과 사진을 쪽·세로 위치 순으로 모아, 사진 자리에 [[사진 N]] 표시를 넣은 원고를 만듭니다.
 * 원고는 AI 분석으로, 사진은 미리보기·게시로 넘어갑니다.
 */

export type ExtractedPhoto = { n: number; blob: Blob; url: string; w: number; h: number };
export type Extracted = {
  manuscript: string;
  photos: ExtractedPhoto[];
  pages: number;
  hints: { naverUrl?: string; naverId?: string; postedAt?: string; hashtags: string[] };
};

type Item = { page: number; y: number; kind: "t"; text: string } | { page: number; y: number; kind: "i"; photo: ExtractedPhoto };

const MIN_W = 200, MIN_H = 150; // 아이콘·구분선 같은 작은 그림은 건너뜀
const MAX_EDGE = 2400; // 원본이 아주 크면 이 크기로 줄임 (게시 용량 제한 대응)

type Mat = [number, number, number, number, number, number];
const mul = (m: Mat, n: Mat): Mat => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];

type PdfImage = { width: number; height: number; bitmap?: ImageBitmap; data?: Uint8ClampedArray | Uint8Array; kind?: number };

async function imageToBlob(img: PdfImage): Promise<{ blob: Blob; w: number; h: number } | null> {
  let { width: w, height: h } = img;
  if (!w || !h) return null;
  const src = document.createElement("canvas");
  src.width = w; src.height = h;
  const sx = src.getContext("2d");
  if (!sx) return null;
  if (img.bitmap) sx.drawImage(img.bitmap, 0, 0);
  else if (img.data) {
    const px = w * h;
    const rgba = new Uint8ClampedArray(px * 4);
    const d = img.data;
    if (d.length === px * 4) rgba.set(d);
    else if (d.length === px * 3) for (let i = 0, j = 0; i < px; i++) { rgba[j++] = d[i * 3]; rgba[j++] = d[i * 3 + 1]; rgba[j++] = d[i * 3 + 2]; rgba[j++] = 255; }
    else if (d.length === px) for (let i = 0, j = 0; i < px; i++) { rgba[j++] = d[i]; rgba[j++] = d[i]; rgba[j++] = d[i]; rgba[j++] = 255; }
    else return null; // 1비트 흑백 같은 드문 형식은 건너뜀
    sx.putImageData(new ImageData(rgba, w, h), 0, 0);
  } else return null;

  let out = src;
  const k = Math.min(1, MAX_EDGE / Math.max(w, h));
  if (k < 1) {
    out = document.createElement("canvas");
    out.width = Math.round(w * k); out.height = Math.round(h * k);
    const ox = out.getContext("2d");
    if (!ox) return null;
    ox.imageSmoothingQuality = "high";
    ox.drawImage(src, 0, 0, out.width, out.height);
    w = out.width; h = out.height;
  }
  const blob = await new Promise<Blob | null>((r) => out.toBlob(r, "image/jpeg", 0.9));
  return blob ? { blob, w, h } : null;
}

function getObj(page: { objs: { get: (n: string, cb: (o: unknown) => void) => void }; commonObjs: { get: (n: string, cb: (o: unknown) => void) => void } }, name: string): Promise<PdfImage | null> {
  return new Promise((resolve) => {
    const store = name.startsWith("g_") ? page.commonObjs : page.objs;
    const t = setTimeout(() => resolve(null), 8000);
    try { store.get(name, (o) => { clearTimeout(t); resolve(o as PdfImage); }); }
    catch { clearTimeout(t); resolve(null); }
  });
}

export async function extractPdf(file: File, onProgress?: (done: number, total: number) => void): Promise<Extracted> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    cMapUrl: "/pdfjs/cmaps/", cMapPacked: true,
    standardFontDataUrl: "/pdfjs/standard_fonts/", wasmUrl: "/pdfjs/wasm/",
  }).promise;
  const { OPS } = pdfjs;
  const pages = doc.numPages;
  const items: Item[] = [];
  const seen = new Set<string>();
  let n = 0;

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const H = page.getViewport({ scale: 1 }).height;

    // 텍스트: 같은 높이의 조각을 한 줄로. 네이버 저장본은 그림자용으로 같은 줄을 두 번 그리므로 가장 긴 것만 남김.
    const tc = await page.getTextContent();
    const rows = new Map<number, { x: number; s: string }[]>();
    for (const it of tc.items as { str: string; transform: number[] }[]) {
      if (!it.str || !it.str.trim()) continue;
      const key = Math.round((H - it.transform[5]) / 3);
      const arr = rows.get(key) ?? [];
      arr.push({ x: it.transform[4], s: it.str });
      rows.set(key, arr);
    }
    for (const [key, parts] of rows) {
      parts.sort((a, b) => a.x - b.x);
      const uniq: { x: number; s: string }[] = [];
      for (const pt of parts) {
        const dup = uniq.find((u) => Math.abs(u.x - pt.x) < 40 && (u.s.includes(pt.s) || pt.s.includes(u.s)));
        if (dup) { if (pt.s.length > dup.s.length) dup.s = pt.s; } else uniq.push({ ...pt });
      }
      const text = uniq.map((u) => u.s).join(" ").replace(/\s+/g, " ").trim();
      if (text) items.push({ page: p, y: key * 3, kind: "t", text });
    }

    // 사진: 그리기 명령을 따라가며 위치(변환 행렬)를 계산
    const ops = await page.getOperatorList();
    let ctm: Mat = [1, 0, 0, 1, 0, 0];
    const stack: Mat[] = [];
    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i], args = ops.argsArray[i];
      if (fn === OPS.save) stack.push(ctm);
      else if (fn === OPS.restore) ctm = stack.pop() ?? [1, 0, 0, 1, 0, 0];
      else if (fn === OPS.transform) ctm = mul(ctm, args as Mat);
      else if (fn === OPS.paintImageXObject) {
        const name = args[0] as string;
        const top = H - (ctm[5] + Math.max(ctm[3], 0));
        if (seen.has(name + "@" + p) || seen.has(name)) continue;
        const obj = await getObj(page as never, name);
        if (!obj || obj.width < MIN_W || obj.height < MIN_H) continue;
        seen.add(name.startsWith("g_") ? name : name + "@" + p);
        const conv = await imageToBlob(obj);
        if (!conv) continue;
        n += 1;
        items.push({ page: p, y: top, kind: "i", photo: { n, blob: conv.blob, url: URL.createObjectURL(conv.blob), w: conv.w, h: conv.h } });
      }
    }
    onProgress?.(p, doc.numPages);
    page.cleanup();
  }
  await doc.destroy();

  items.sort((a, b) => a.page - b.page || a.y - b.y);
  const lines: string[] = [];
  let prev: Item | null = null;
  for (const it of items) {
    if (it.kind === "i") lines.push(`[[사진 ${it.photo.n}]]`);
    else {
      // 줄 간격이 크면 문단이 바뀐 것으로 봄
      if (prev && prev.kind === "t" && prev.page === it.page && it.y - prev.y > 26) lines.push("");
      lines.push(it.text);
    }
    prev = it;
  }
  const manuscript = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  const all = items.filter((i) => i.kind === "t").map((i) => (i as { text: string }).text).join("\n");
  const url = all.match(/https?:\/\/(?:m\.)?blog\.naver\.com\/[\w-]+\/(\d+)/);
  const posted = all.match(/(\d{4})[./-](\d{2})[./-](\d{2}) \d{2}:\d{2}/);
  const hashtags = [...new Set([...all.matchAll(/#([^\s#]+)/g)].map((m) => m[1]))];

  return {
    manuscript,
    photos: items.filter((i) => i.kind === "i").map((i) => (i as { photo: ExtractedPhoto }).photo),
    pages,
    hints: { naverUrl: url?.[0], naverId: url?.[1], postedAt: posted ? `${posted[1]}-${posted[2]}-${posted[3]}` : undefined, hashtags },
  };
}

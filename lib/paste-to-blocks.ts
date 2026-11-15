"use client";
/**
 * 붙여넣은 내용(네이버 글 수정 화면에서 복사한 것 등) → 글 문단과 사진 목록.
 * 문서 순서대로 문단과 사진을 읽고, 스티커·아이콘처럼 작은 그림은 건너뜁니다.
 */
export type PastePart = { type: "text"; text: string } | { type: "img"; src: string } | { type: "file"; file: File };
export type Pasted = { title?: string; parts: PastePart[] };

const SKIP_IMG = /storep-phinf|ssl\.pstatic\.net\/static|editor-static|\/sticker|emoticon|blank\.gif|spc\.gif/i;
const TEXT_SEL = "p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, td";
const clean = (s: string) => s.replace(/[​ ﻿]/g, " ").replace(/[ \t]+/g, " ").trim();

function imgSrc(el: Element): string | null {
  const cands = [el.getAttribute("data-lazy-src"), el.getAttribute("data-src"), el.getAttribute("src")];
  for (const c of cands) if (c && !/type=w80_blur/.test(c) && !c.startsWith("blob:")) return c;
  return cands.find(Boolean) ?? null;
}

export function parsePaste(dt: DataTransfer): Pasted {
  const html = dt.getData("text/html");
  const files = [...dt.files].filter((f) => f.type.startsWith("image/"));
  if (!html) {
    const text = dt.getData("text/plain");
    const parts: PastePart[] = text.split(/\r?\n/).map(clean).filter(Boolean).map((t) => ({ type: "text" as const, text: t }));
    files.forEach((file) => parts.push({ type: "file", file }));
    return { parts };
  }
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script, style, noscript, .se-oglink, .se-map, .se-placesMap, .se-sticker, .se-video, .se-oembed").forEach((e) => e.remove());

  // 제목: 스마트에디터 제목 칸
  const tEl = doc.querySelector(".se-documentTitle .se-text-paragraph, .se-title-text, .se_title, .pcol1");
  const title = tEl ? clean(tEl.textContent ?? "") : undefined;
  tEl?.closest(".se-documentTitle, .se-component")?.remove();

  const parts: PastePart[] = [];
  const all = doc.body.querySelectorAll(`img, ${TEXT_SEL}`);
  all.forEach((el) => {
    if (el.tagName === "IMG") {
      const src = imgSrc(el);
      const w = Number(el.getAttribute("width") || el.getAttribute("data-width") || 0);
      if (!src || SKIP_IMG.test(src) || (w && w < 120)) return;
      if (parts.some((p) => p.type === "img" && p.src === src)) return;
      parts.push({ type: "img", src });
      return;
    }
    // 안쪽에 다른 문단이 있으면 바깥 것은 건너뜀 (중복 방지)
    if (el.querySelector(TEXT_SEL)) return;
    const t = clean(el.textContent ?? "");
    if (t) parts.push({ type: "text", text: t });
  });

  // 문단 태그 없이 글만 있는 경우
  if (!parts.some((p) => p.type === "text")) {
    const text = dt.getData("text/plain");
    const lines = text.split(/\r?\n/).map(clean).filter(Boolean);
    if (lines.length && !parts.length) lines.forEach((t) => parts.push({ type: "text", text: t }));
  }
  if (!parts.some((p) => p.type !== "text")) files.forEach((file) => parts.push({ type: "file", file }));
  return { title: title || undefined, parts };
}

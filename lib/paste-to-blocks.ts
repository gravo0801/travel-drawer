"use client";
/**
 * 붙여넣은 내용, 또는 네이버 글 화면(HTML) → 글 문단과 사진 목록.
 * 문서 순서대로 문단과 사진을 읽고, 스티커·아이콘·편집기 안내 글자는 건너뜁니다.
 */
export type PastePart = { type: "text"; text: string } | { type: "img"; src: string } | { type: "file"; file: File };
export type Pasted = { title?: string; postedAt?: string; parts: PastePart[] };

const SKIP_IMG = /storep-phinf|ssl\.pstatic\.net\/static|editor-static|\/sticker|emoticon|blank\.gif|spc\.gif|profile|favicon/i;
const TEXT_SEL = "p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, td";
/** 네이버 편집기 화면에만 보이는 안내·단추 글자 */
const UI_TEXT = /^(AI 활용 설정|사진 설명을 입력하세요\.?|내용을 입력하세요\.?|제목|본문 기타 기능|글자 크기|대표|편집|삭제|이미지 편집|동영상 설명을 입력하세요\.?|출처 입력|인용구를 입력하세요\.?|공감|댓글|공유하기|이웃추가|신고하기|URL 복사|번역하기|\d+\s*\/\s*\d+)$/;
const clean = (s: string) => s.replace(/[​ ﻿]/g, " ").replace(/[ \t]+/g, " ").trim();

function imgSrc(el: Element): string | null {
  const cands = [el.getAttribute("data-lazy-src"), el.getAttribute("data-src"), el.getAttribute("src")];
  for (const c of cands) if (c && !/type=w80_blur/.test(c) && !c.startsWith("blob:")) return c;
  return cands.find(Boolean) ?? null;
}

export function parseHtml(html: string, plain = "", files: File[] = []): Pasted {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script, style, noscript, button, .se-oglink, .se-map, .se-placesMap, .se-sticker, .se-video, .se-oembed, .se-toolbar, .se-help-panel, .se-image-caption-placeholder, [class*='placeholder']").forEach((e) => e.remove());

  const tEl = doc.querySelector(".se-documentTitle .se-text-paragraph, .se-title-text, .se_title .se_textarea, .pcol1, .htitle");
  const title = tEl ? clean(tEl.textContent ?? "") : undefined;
  const dEl = doc.querySelector(".se_publishDate, .date, .se_date");
  const dm = dEl?.textContent?.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/);
  const postedAt = dm ? `${dm[1]}-${dm[2].padStart(2, "0")}-${dm[3].padStart(2, "0")}` : undefined;
  tEl?.closest(".se-documentTitle, .se-component, .se_title")?.remove();

  const root = doc.querySelector(".se-main-container, #postViewArea, .se_component_wrap, .post-view, #viewTypeSelector") ?? doc.body;
  const parts: PastePart[] = [];
  root.querySelectorAll(`img, ${TEXT_SEL}`).forEach((el) => {
    if (el.tagName === "IMG") {
      const src = imgSrc(el);
      const w = Number(el.getAttribute("width") || el.getAttribute("data-width") || 0);
      if (!src || SKIP_IMG.test(src) || (w && w < 120)) return;
      if (parts.some((p) => p.type === "img" && p.src === src)) return;
      parts.push({ type: "img", src });
      return;
    }
    if (el.querySelector(TEXT_SEL)) return; // 안쪽 문단과 중복 방지
    const t = clean(el.textContent ?? "");
    if (t && !UI_TEXT.test(t)) parts.push({ type: "text", text: t });
  });

  if (!parts.length && plain) plain.split(/\r?\n/).map(clean).filter((t) => t && !UI_TEXT.test(t)).forEach((t) => parts.push({ type: "text", text: t }));
  if (!parts.some((p) => p.type !== "text")) files.forEach((file) => parts.push({ type: "file", file }));
  return { title: title || undefined, postedAt, parts };
}

export function parsePaste(dt: DataTransfer): Pasted {
  const html = dt.getData("text/html");
  const plain = dt.getData("text/plain");
  const files = [...dt.files].filter((f) => f.type.startsWith("image/"));
  if (html) return parseHtml(html, plain, files);
  const parts: PastePart[] = plain.split(/\r?\n/).map(clean).filter((t) => t && !UI_TEXT.test(t)).map((t) => ({ type: "text" as const, text: t }));
  files.forEach((file) => parts.push({ type: "file", file }));
  return { parts };
}

/** 붙여넣은 내용에 사진이 있는지 (문단 칸에 붙여넣을 때 글+사진으로 돌릴지 판단) */
export const hasImages = (dt: DataTransfer) => [...dt.files].some((f) => f.type.startsWith("image/")) || /<img\b/i.test(dt.getData("text/html"));

/** 네이버 블로그 글 주소 → {blogId, logNo} */
export function naverPostId(s: string): { blogId: string; logNo: string } | null {
  const t = s.trim();
  let m = t.match(/blog\.naver\.com\/(?:PostView\.n(?:aver|hn)\?)?.*?blogId=([\w-]+).*?logNo=(\d+)/i);
  if (m) return { blogId: m[1], logNo: m[2] };
  m = t.match(/blog\.naver\.com\/([\w-]+)\/(\d+)/i);
  return m ? { blogId: m[1], logNo: m[2] } : null;
}

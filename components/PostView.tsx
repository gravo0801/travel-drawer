import type { ReactNode } from "react";
import type { Post } from "@/lib/types";
import { countryEn } from "@/lib/countries";

const fmt = (d: string) => (d ?? "").replace(/-/g, ".");

/**
 * 글 머리와 본문. 실제 글 화면과 PDF 가져오기 미리보기가 같은 부품을 써서
 * 게시 전에 본 모습 그대로 게시됩니다.
 * tools: 미리보기에서 블록마다 붙일 편집 단추(실제 글 화면에서는 없음).
 */
export default function PostView({ post, tools }: { post: Post; tools?: (k: number) => ReactNode }) {
  const photos = (post.blocks ?? []).reduce((n, b) => n + (b.type === "photo" ? 1 : b.type === "gallery" ? b.photos.length : 0), 0);
  const wrap = (k: number, el: ReactNode) => (tools ? <div className="p-edit" key={k}>{el}<div className="p-tools">{tools(k)}</div></div> : el);
  return (
    <>
      <header className="p-head">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {post.cover && <img className="p-bg" src={post.cover} alt="" aria-hidden="true" />}
        <div className="p-head-in">
          <p className="p-trip"><span>{post.trip.date.slice(0, 4) || "연도"}</span><span>{post.trip.country || "나라"} <em>{countryEn(post.trip.country)}</em></span><span>{post.trip.city || "도시"}</span></p>
          <h1>{post.title}</h1>
          <p className="p-meta">여행 {fmt(post.trip.date)} · 작성 {fmt(post.publishedAt)} · 사진 {photos}장{post.series ? ` · ${post.series}` : ""}</p>
        </div>
      </header>
      <div className="p-body">
        {(post.blocks ?? []).map((b, k) => {
          if (b.type === "text") return wrap(k, <div className="p-text" key={k}>{b.text.split(/\n{2,}/).map((para, j) => <p key={j}>{para}</p>)}</div>);
          if (b.type === "photo") return wrap(k,
            <figure className={"p-photo" + (b.h > b.w ? " tall" : "")} key={k}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.src} alt={b.caption ?? `${post.title} — 사진 ${k + 1}`} width={b.w} height={b.h} loading={k < 4 ? "eager" : "lazy"} />
              {b.caption && <figcaption>{b.caption}</figcaption>}
            </figure>);
          return wrap(k,
            <div className="p-gallery" key={k}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {b.photos.map((ph, j) => <img key={j} src={ph.src} alt={ph.caption ?? `${post.title} — 사진 ${j + 1}`} width={ph.w} height={ph.h} loading="lazy" />)}
            </div>);
        })}
        {!!post.hashtags?.length && <ul className="p-tags" aria-label="해시태그">{post.hashtags.map((t) => <li key={t}>#{t}</li>)}</ul>}
        {post.naverUrl && <p className="p-src">이 글은 <a href={post.naverUrl} target="_blank" rel="noreferrer">네이버 블로그 원문</a>에서 옮겨 왔습니다.</p>}
      </div>
    </>
  );
}

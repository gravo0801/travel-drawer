import type { ReactNode } from "react";
import type { Post } from "@/lib/types";
import { countryEn } from "@/lib/countries";
import { splitPost, embedSrc, type MapInfo } from "@/lib/maps";

const fmt = (d: string) => (d ?? "").replace(/-/g, ".");

/**
 * 글 머리와 본문. 실제 글 화면과 PDF 가져오기 미리보기가 같은 부품을 써서
 * 게시 전에 본 모습 그대로 게시됩니다.
 * tools: 미리보기에서 블록마다 붙일 편집 단추(실제 글 화면에서는 없음).
 */
export default function PostView({ post, tools, textView }: { post: Post; tools?: (k: number) => ReactNode; textView?: (k: number) => ReactNode }) {
  const photos = (post.blocks ?? []).reduce((n, b) => n + (b.type === "photo" ? 1 : b.type === "gallery" ? b.photos.length : 0), 0);
  const pieces = splitPost((post.blocks ?? []).map((b) => (b.type === "text" ? b.text : null)));
  const wrap = (k: number, el: ReactNode) => (tools ? <div className="p-edit" key={k}>{el}<div className="p-tools">{tools(k)}</div></div> : el);
  return (
    <>
      <header className="p-head">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {post.cover && <img className="p-bg" src={post.cover} alt="" aria-hidden="true" />}
        <div className="p-head-in">
          {(post.trip.date || post.trip.country || post.trip.city) && (
            <p className="p-trip">
              {post.trip.date && <span>{post.trip.date.slice(0, 4)}</span>}
              {post.trip.country && <span>{post.trip.country} <em>{countryEn(post.trip.country)}</em></span>}
              {post.trip.city && <span>{post.trip.city}</span>}
            </p>
          )}
          {post.title && <h1>{post.title}</h1>}
          <p className="p-meta">{[post.trip.date && `여행 ${fmt(post.trip.date)}`, post.publishedAt && `작성 ${fmt(post.publishedAt)}`, `사진 ${photos}장`, post.series].filter(Boolean).join(" · ")}</p>
        </div>
      </header>
      <div className="p-body">
        {(post.blocks ?? []).map((b, k) => {
          if (b.type === "text" && textView?.(k)) return wrap(k, <div className="p-text" key={k}>{textView(k)}</div>);
          if (b.type === "text") return wrap(k, <div className="p-text" key={k}>{(pieces[k] ?? []).map((pc, j) => pc.kind === "p" ? <p key={j}>{pc.text}</p>
            : pc.kind === "place" ? <p className="p-place" key={j}>📍 {pc.text}</p>
            : <MiniMap key={j} map={pc.map} label={pc.label} />)}</div>);
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

/** 구글 지도 링크 바로 아래 미니 지도 */
function MiniMap({ map, label }: { map: MapInfo; label?: string }) {
  const title = map.name ?? label?.split(" · ")[0] ?? "지도";
  return (
    <figure className="p-map">
      {(map.lat !== undefined || map.name) && (
        <iframe src={embedSrc(map)} title={`${title} 위치 지도`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
      )}
      <figcaption>
        <a href={map.url} target="_blank" rel="noreferrer">📍 {title}<span>구글 지도에서 열기 ↗</span></a>
        {label && <small>{label}</small>}
      </figcaption>
    </figure>
  );
}

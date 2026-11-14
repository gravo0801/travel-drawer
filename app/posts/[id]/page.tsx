import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import { getPost, getPosts } from "@/lib/posts";
import { countryEn } from "@/lib/countries";

export function generateStaticParams() {
  return getPosts().map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const p = getPost((await params).id);
  return p ? { title: p.title, openGraph: { images: p.cover ? [p.cover] : [] } } : {};
}

const fmt = (d: string) => d.replace(/-/g, ".");

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = getPost(id);
  if (!post) notFound();
  const all = getPosts();
  const i = all.findIndex((p) => p.id === id);
  const newer = i > 0 ? all[i - 1] : null, older = i >= 0 && i < all.length - 1 ? all[i + 1] : null;
  const photos = (post.blocks ?? []).filter((b) => b.type === "photo").length;

  return (
    <>
      <SiteNav solid />
      <article className="post">
        <header className="p-head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {post.cover && <img className="p-bg" src={post.cover} alt="" aria-hidden="true" />}
          <div className="p-head-in">
            <p className="p-trip"><span>{post.trip.date.slice(0, 4)}</span><span>{post.trip.country} <em>{countryEn(post.trip.country)}</em></span><span>{post.trip.city}</span></p>
            <h1>{post.title}</h1>
            <p className="p-meta">여행 {fmt(post.trip.date)} · 작성 {fmt(post.publishedAt)} · 사진 {photos}장{post.series ? ` · ${post.series}` : ""}</p>
          </div>
        </header>
        <div className="p-body">
          {(post.blocks ?? []).map((b, k) => {
            if (b.type === "text") return <div className="p-text" key={k}>{b.text.split(/\n{2,}/).map((para, j) => <p key={j}>{para}</p>)}</div>;
            if (b.type === "photo") return (
              <figure className={"p-photo" + (b.h > b.w ? " tall" : "")} key={k}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.src} alt={b.caption ?? ""} width={b.w} height={b.h} loading={k < 4 ? "eager" : "lazy"} />
                {b.caption && <figcaption>{b.caption}</figcaption>}
              </figure>);
            return (
              <div className="p-gallery" key={k}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {b.photos.map((ph, j) => <img key={j} src={ph.src} alt={ph.caption ?? ""} width={ph.w} height={ph.h} loading="lazy" />)}
              </div>);
          })}
          {!!post.hashtags?.length && <ul className="p-tags" aria-label="해시태그">{post.hashtags.map((t) => <li key={t}>#{t}</li>)}</ul>}
          {post.naverUrl && <p className="p-src">이 글은 <a href={post.naverUrl} target="_blank" rel="noreferrer">네이버 블로그 원문</a>에서 옮겨 왔습니다.</p>}
        </div>
        <nav className="p-nav" aria-label="다른 글">
          {older ? <Link href={`/posts/${older.id}`}><small>이전 여행</small><span>{older.title}</span></Link> : <span />}
          <Link className="p-all" href="/#archive">전체 글 목록</Link>
          {newer ? <Link className="r" href={`/posts/${newer.id}`}><small>다음 여행</small><span>{newer.title}</span></Link> : <span />}
        </nav>
      </article>
    </>
  );
}

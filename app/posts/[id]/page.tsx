import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import { getPost, getPosts } from "@/lib/posts";
import PostView from "@/components/PostView";
import EditPostButton from "@/components/EditPostButton";

export function generateStaticParams() {
  return getPosts().map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const p = getPost((await params).id);
  return p ? { title: p.title, openGraph: { images: p.cover ? [p.cover] : [] } } : {};
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = getPost(id);
  if (!post) notFound();
  const all = getPosts();
  const i = all.findIndex((p) => p.id === id);
  const newer = i > 0 ? all[i - 1] : null, older = i >= 0 && i < all.length - 1 ? all[i + 1] : null;

  return (
    <>
      <SiteNav solid />
      <article className="post" data-stamp={post.updatedAt ?? post.addedAt ?? ""}>
        <EditPostButton id={post.id} />
        <PostView post={post} />
        <nav className="p-nav" aria-label="다른 글">
          {older ? <Link href={`/posts/${older.id}`}><small>이전 여행</small><span>{older.title}</span></Link> : <span />}
          <Link className="p-all" href="/#archive">전체 글 목록</Link>
          {newer ? <Link className="r" href={`/posts/${newer.id}`}><small>다음 여행</small><span>{newer.title}</span></Link> : <span />}
        </nav>
      </article>
    </>
  );
}

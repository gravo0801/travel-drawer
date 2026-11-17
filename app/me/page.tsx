import type { Metadata } from "next";
import Dashboard from "@/components/dash/Dashboard";
import { getRecentlyAdded } from "@/lib/posts";
import { loadDash, loadSite } from "@/lib/site-server";
import { adminList } from "@/lib/server/auth";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "DRAWER · 나의 공간", robots: { index: false, follow: false } };

/** 개인 대시보드. 화면 틀은 공개 코드지만, 로그인한 관리자에게만 내용을 보여 줌. */
export default function Page() {
  const posts = getRecentlyAdded(100000).map((p) => ({
    id: p.id, title: p.title, trip: p.trip, cover: p.cover ?? null, photoCount: p.photoCount, addedAt: p.addedAt ?? p.publishedAt ?? "",
  }));
  const site = loadSite();
  return <Dashboard posts={posts} dash={loadDash()} siteHero={site.slots.hero?.src ?? "/media/site/hero.jpg"} admins={adminList()} total={SITE.totalPosts} />;
}

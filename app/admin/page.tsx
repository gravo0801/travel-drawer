import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import AdminPanel from "@/components/AdminPanel";

export const metadata: Metadata = { title: "관리자", robots: { index: false, follow: false } };

export default function AdminPage() {
  return (
    <>
      <SiteNav solid />
      <main className="admin">
        <AdminPanel />
      </main>
    </>
  );
}

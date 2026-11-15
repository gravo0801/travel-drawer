"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SITE } from "@/lib/site";
import { firebaseApp } from "@/lib/firebase";
import { useSettings } from "./SettingsProvider";

export default function SiteNav({ solid = false }: { solid?: boolean }) {
  const { setOpen } = useSettings();
  const [pill, setPill] = useState(solid);
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    // 로그인한 경우에만 글쓰기 단추를 보임 (로그인 기능은 필요할 때만 불러옴)
    const app = firebaseApp();
    if (!app) return;
    let off = () => {};
    import("firebase/auth").then(({ getAuth, onAuthStateChanged }) => { off = onAuthStateChanged(getAuth(app), (u) => setAdmin(!!u)); });
    return () => off();
  }, []);
  useEffect(() => {
    if (solid) return;
    const f = () => setPill(window.scrollY > 60);
    f(); window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, [solid]);
  return (
    <header className={"nav" + (pill ? " pill" : "")}>
      <div className="nav-in">
        <Link className="brand" href="/"><i aria-hidden="true" />{SITE.name}</Link>
        <nav aria-label="주요 메뉴"><Link href="/#recent">최근 여행기</Link><Link href="/#archive">전체 글 찾기</Link></nav>
        {admin && <Link className="gear write" href="/write" aria-label="글쓰기">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
          <span>글쓰기</span>
        </Link>}
        <button className="gear" type="button" aria-haspopup="dialog" onClick={() => setOpen(true)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
          설정
        </button>
      </div>
    </header>
  );
}

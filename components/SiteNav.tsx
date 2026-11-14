"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SITE } from "@/lib/site";
import { useSettings } from "./SettingsProvider";

export default function SiteNav({ solid = false }: { solid?: boolean }) {
  const { setOpen } = useSettings();
  const [pill, setPill] = useState(solid);
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
        <button className="gear" type="button" aria-haspopup="dialog" onClick={() => setOpen(true)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
          설정
        </button>
      </div>
    </header>
  );
}

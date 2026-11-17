"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SITE } from "@/lib/site";
import { useSettings } from "./SettingsProvider";
import Icon from "./dash/Icon";

export default function SiteNav({ solid = false, editId }: { solid?: boolean; editId?: string }) {
  const { setOpen } = useSettings();
  const [pill, setPill] = useState(solid);
  // 글 화면에서 E 키를 누르면 바로 수정
  useEffect(() => {
    if (!editId) return;
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.ctrlKey || e.metaKey || e.altKey || (t && t.closest("input, textarea, [contenteditable=true]"))) return;
      if (e.key === "e" || e.key === "E" || e.key === "ㄷ") location.href = `/write?edit=${editId}`;
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [editId]);
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
        <nav aria-label="주요 메뉴"><Link href="/#recent">최근 여행기</Link><Link href="/#archive">전체 글 찾기</Link><Link href="/me">나의 공간</Link></nav>
        {/* 늘 보임: 로그인 전이면 글쓰기 화면에서 로그인부터 */}
        {editId
          ? <Link className="gear write" href={`/write?edit=${editId}`} aria-label="이 글 수정" title="이 글 수정 (단축키 E)">
              <Icon n="pen" size={16} />
              <span>수정</span>
            </Link>
          : null}
        <Link className={"gear" + (editId ? "" : " write")} href="/write" aria-label="글쓰기">
          {!editId && <Icon n="pen" size={16} />}
          <span>{editId ? "새 글" : "글쓰기"}</span>
        </Link>
        <button className="gear" type="button" aria-haspopup="dialog" onClick={() => setOpen(true)}>
          <Icon n="sliders" size={16} />
          <span>설정</span>
        </button>
      </div>
    </header>
  );
}

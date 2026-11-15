"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getAuth, onAuthStateChanged, signOut, type User } from "firebase/auth";
import { login as doLogin } from "@/lib/login";
import { firebaseApp } from "@/lib/firebase";

export default function AdminPanel() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const app = firebaseApp();

  useEffect(() => {
    if (!app) { setReady(true); return; }
    return onAuthStateChanged(getAuth(app), (u) => { setUser(u); setReady(true); });
  }, [app]);

  async function login() {
    if (!app) return;
    setErr("");
    const e = await doLogin(app);
    if (e) setErr(e);
  }
  async function copyUid() {
    if (!user) return;
    try { await navigator.clipboard.writeText(user.uid); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  }

  return (
    <section className="admin-card" aria-live="polite">
      <h1>관리자</h1>
      {!ready && <p className="muted">확인 중…</p>}
      {ready && !app && <p className="muted">Firebase 설정이 아직 연결되지 않았습니다. 배포 환경변수를 확인해 주세요.</p>}
      {ready && app && !user && (
        <>
          <p className="muted">글쓰기와 설정 저장은 관리자 로그인 후에 사용할 수 있습니다.</p>
          <button className="btn" type="button" onClick={login}>Google 계정으로 로그인</button>
          {err && <p className="err" role="alert">{err}</p>}
        </>
      )}
      {ready && app && user && (
        <>
          <p>로그인됨: <strong>{user.displayName ?? "이름 없음"}</strong></p>
          <Link className="btn" href="/write">글쓰기 · PDF 가져오기 →</Link>
          <p className="muted" style={{ marginTop: 18 }}>아래 고유번호(UID)를 Vercel 환경변수 ADMIN_UIDS에 넣으면 글 올리기 권한이 생깁니다.</p>
          <code className="uid">{user.uid}</code>
          <div className="row">
            <button className="btn" type="button" onClick={copyUid}>{copied ? "복사됨" : "UID 복사"}</button>
            <button className="btn ghost" type="button" onClick={() => signOut(getAuth(app))}>로그아웃</button>
          </div>
        </>
      )}
    </section>
  );
}

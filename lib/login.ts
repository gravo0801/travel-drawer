"use client";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, type Auth } from "firebase/auth";
import type { FirebaseApp } from "firebase/app";

/**
 * 구글 로그인. 휴대폰 브라우저(삼성 인터넷 등)에서 팝업이 막히면 페이지 이동 방식으로 다시 시도.
 * 실패 이유를 한국어로 돌려줌 (성공·사용자가 닫음은 null).
 */
export async function login(app: FirebaseApp): Promise<string | null> {
  const auth: Auth = getAuth(app);
  const provider = new GoogleAuthProvider();
  try { await signInWithPopup(auth, provider); return null; }
  catch (e) {
    const code = (e as { code?: string }).code ?? "";
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return null;
    if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment" || code === "auth/web-storage-unsupported") {
      try { await signInWithRedirect(auth, provider); return null; } catch (e2) { return `로그인 실패 (${(e2 as { code?: string }).code ?? "알 수 없음"})`; }
    }
    if (code === "auth/unauthorized-domain") return "이 주소가 Firebase 로그인 허용 목록에 없습니다. (Firebase 콘솔 → Authentication → 설정 → 승인된 도메인)";
    return `로그인 실패 (${code || (e as Error).message})`;
  }
}

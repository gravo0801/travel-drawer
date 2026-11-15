
/** 관리자 Firebase UID (비밀 아님). ADMIN_UIDS 환경변수가 있으면 그것을 우선 사용. */
const DEFAULT_ADMIN_UIDS = "8Lh6Z3b4J2aGm6LvqMPitBx9yZe2";
const adminList = () => (process.env.ADMIN_UIDS || DEFAULT_ADMIN_UIDS).split(",").map((s) => s.trim()).filter(Boolean);

/**
 * 관리자 확인: 브라우저가 보낸 Firebase 로그인 토큰을 Google에 확인하고,
 * 그 사용자 UID가 ADMIN_UIDS(쉼표로 구분)에 있는지 봅니다.
 * ADMIN_UIDS가 비어 있으면 누구도 통과하지 못합니다.
 */
export async function requireAdmin(req: Request): Promise<{ uid: string } | Response> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const allowed = adminList();
  if (!token) return json(401, "로그인이 필요합니다.");
  if (!key) return json(500, "Firebase 설정(NEXT_PUBLIC_FIREBASE_API_KEY)이 없습니다.");
  if (!allowed.length) return json(500, "관리자 UID(ADMIN_UIDS) 환경변수가 설정되지 않았습니다.");
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(key)}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken: token }), cache: "no-store",
  });
  if (!r.ok) return json(401, "로그인이 만료되었습니다. 다시 로그인해 주세요.");
  const uid = ((await r.json()) as { users?: { localId: string }[] }).users?.[0]?.localId;
  if (!uid || !allowed.includes(uid)) return json(403, "관리자 계정이 아닙니다.");
  return { uid };
}

export function json(status: number, error: string) {
  return Response.json({ error }, { status });
}

/**
 * 로그인만 확인 (네이버 글·사진 불러오기용). 게시는 requireAdmin으로 따로 막습니다.
 * ADMIN_UIDS가 아직 없어도 붙여넣기·미리보기는 되도록.
 */
export async function requireUser(req: Request): Promise<{ uid: string } | Response> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!token) return json(401, "로그인이 필요합니다.");
  if (!key) return json(500, "Firebase 설정(NEXT_PUBLIC_FIREBASE_API_KEY)이 없습니다.");
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(key)}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken: token }), cache: "no-store",
  });
  if (!r.ok) return json(401, "로그인이 만료되었습니다. 다시 로그인해 주세요.");
  const uid = ((await r.json()) as { users?: { localId: string }[] }).users?.[0]?.localId;
  if (!uid) return json(401, "로그인이 필요합니다.");
  const allowed = adminList();
  if (allowed.length && !allowed.includes(uid)) return json(403, "관리자 계정이 아닙니다.");
  return { uid };
}

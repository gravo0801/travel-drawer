
/**
 * 관리자 확인: 브라우저가 보낸 Firebase 로그인 토큰을 Google에 확인하고,
 * 그 사용자 UID가 ADMIN_UIDS(쉼표로 구분)에 있는지 봅니다.
 * ADMIN_UIDS가 비어 있으면 누구도 통과하지 못합니다.
 */
export async function requireAdmin(req: Request): Promise<{ uid: string } | Response> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const allowed = (process.env.ADMIN_UIDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
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

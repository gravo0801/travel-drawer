export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 글 저장에 필요한 설정이 들어 있는지 여부만 알려 줌 (값은 절대 돌려주지 않음) */
export function GET() {
  return Response.json({
    firebase: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    adminUids: !!(process.env.ADMIN_UIDS ?? "").trim(),
    githubToken: !!process.env.GITHUB_TOKEN,
  });
}

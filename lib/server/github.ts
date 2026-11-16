
/**
 * 게시 = GitHub 저장소에 커밋. Vercel이 커밋을 받아 자동으로 다시 배포하므로
 * 새 글은 기존 글과 똑같은 post.json 형식·같은 화면으로 보입니다.
 */
const API = "https://api.github.com";

function cfg() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO ?? "gravo0801/travel-drawer";
  const branch = process.env.GITHUB_BRANCH ?? "main";
  if (!token) throw new Error("GITHUB_TOKEN 환경변수가 설정되지 않았습니다.");
  return { token, repo, branch };
}

async function gh<T>(path: string, init?: RequestInit & { allow404?: boolean }): Promise<T | null> {
  const { token } = cfg();
  const r = await fetch(API + path, {
    ...init,
    headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", "content-type": "application/json" },
    cache: "no-store",
  });
  if (r.status === 404 && init?.allow404) return null;
  if (!r.ok) throw new Error(`GitHub ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return (await r.json()) as T;
}

export async function createBlob(base64: string): Promise<string> {
  const { repo } = cfg();
  const b = await gh<{ sha: string }>(`/repos/${repo}/git/blobs`, { method: "POST", body: JSON.stringify({ content: base64, encoding: "base64" }) });
  return b!.sha;
}

export async function postExists(id: string): Promise<boolean> {
  const { repo, branch } = cfg();
  const r = await gh(`/repos/${repo}/contents/content/posts/${id}/post.json?ref=${branch}`, { allow404: true });
  return r !== null;
}

/** 저장소의 최신 post.json (배포 전 수정분 포함) */
export async function readPost(id: string): Promise<unknown | null> {
  const { repo, branch } = cfg();
  const r = await gh<{ content: string }>(`/repos/${repo}/contents/content/posts/${id}/post.json?ref=${branch}`, { allow404: true });
  return r ? JSON.parse(Buffer.from(r.content, "base64").toString("utf8")) : null;
}

/** 글 사진 폴더의 파일 이름들 */
export async function listMedia(id: string): Promise<string[]> {
  const { repo, branch } = cfg();
  const r = await gh<{ name: string; type: string }[]>(`/repos/${repo}/contents/public/media/posts/${id}?ref=${branch}`, { allow404: true });
  return (r ?? []).filter((f) => f.type === "file").map((f) => f.name);
}

export async function commitFiles(files: { path: string; sha?: string | null; content?: string }[], message: string): Promise<string> {
  const { repo, branch } = cfg();
  const ref = await gh<{ object: { sha: string } }>(`/repos/${repo}/git/ref/heads/${branch}`);
  const head = ref!.object.sha;
  const commit = await gh<{ tree: { sha: string } }>(`/repos/${repo}/git/commits/${head}`);
  const tree = await gh<{ sha: string }>(`/repos/${repo}/git/trees`, {
    method: "POST",
    body: JSON.stringify({
      base_tree: commit!.tree.sha,
      tree: files.map((f) => ({ path: f.path, mode: "100644", type: "blob", ...(f.sha !== undefined ? { sha: f.sha } : { content: f.content }) })),
    }),
  });
  const next = await gh<{ sha: string }>(`/repos/${repo}/git/commits`, {
    method: "POST", body: JSON.stringify({ message, tree: tree!.sha, parents: [head] }),
  });
  await gh(`/repos/${repo}/git/refs/heads/${branch}`, { method: "PATCH", body: JSON.stringify({ sha: next!.sha }) });
  return next!.sha;
}

/** 저장소의 최신 텍스트 파일 (없으면 null) */
export async function readText(p: string): Promise<string | null> {
  const { repo, branch } = cfg();
  const r = await gh<{ content: string }>(`/repos/${repo}/contents/${p}?ref=${branch}`, { allow404: true });
  return r ? Buffer.from(r.content, "base64").toString("utf8") : null;
}

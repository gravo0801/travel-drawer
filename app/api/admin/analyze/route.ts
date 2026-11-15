import { requireAdmin, json } from "@/lib/server/auth";
import { COUNTRY_EN } from "@/lib/countries";

export const runtime = "nodejs";
export const maxDuration = 120;

/** AI가 돌려주는 분석 결과. 사진은 원고의 [[사진 N]] 번호(ref)로만 가리킵니다. */
export type Analysis = {
  title: string;
  trip: { date: string; country: string; city: string };
  series?: string;
  category?: string;
  hashtags: string[];
  summary: string;
  places: string[];
  cover: number;
  blocks: ({ type: "text"; text: string } | { type: "photo"; ref: number } | { type: "gallery"; refs: number[] })[];
};

const SCHEMA = {
  type: "object",
  required: ["title", "trip", "hashtags", "summary", "places", "cover", "blocks"],
  properties: {
    title: { type: "string", description: "글 제목. 원고에 제목이 있으면 그대로 사용" },
    trip: {
      type: "object", required: ["date", "country", "city"],
      properties: {
        date: { type: "string", description: "여행한 날짜 YYYY-MM-DD (모르면 YYYY-MM 또는 YYYY). 작성일이 아니라 여행일" },
        country: { type: "string", description: "나라 이름(한국어). 예: 일본, 태국" },
        city: { type: "string", description: "대표 도시 이름(한국어). 예: 후쿠오카, 방콕" },
      },
    },
    series: { type: "string", description: "같은 여행 묶음 이름. 형식 'YYYY.MM 도시' 예: 2026.01 방콕" },
    category: { type: "string", description: "글 분류. 원고에 분류가 있으면 그대로, 없으면 맛집/숙소/관광/교통/쇼핑/일정 등에서 하나" },
    hashtags: { type: "array", items: { type: "string" }, description: "# 없이 6~12개. 원고의 해시태그를 우선 사용하고 부족하면 나라·도시·장소·주제로 보충" },
    summary: { type: "string", description: "글 목록에 보일 1~2문장 요약(원고의 말투)" },
    places: { type: "array", items: { type: "string" }, description: "글에 나온 방문 장소 이름(가게·명소·숙소), 등장 순서" },
    cover: { type: "integer", description: "대표 사진 번호. 가장 이 글을 잘 보여주는 사진(보통 앞쪽의 장소·풍경 사진)" },
    blocks: {
      type: "array",
      description: "본문 순서. 모든 사진 번호를 원래 순서대로 빠짐없이 한 번씩 사용",
      items: {
        type: "object", required: ["type"],
        properties: {
          type: { type: "string", enum: ["text", "photo", "gallery"] },
          text: { type: "string" },
          ref: { type: "integer" },
          refs: { type: "array", items: { type: "integer" } },
        },
      },
    },
  },
} as const;

const SYSTEM = `당신은 여행 블로그 "낡은 서랍속의 추억을 따라"의 편집자입니다.
다른 곳(네이버 블로그 PDF 저장본, 워드 문서 PDF 등)에서 만든 여행기 PDF에서 뽑은 원고를 받아, 이 블로그의 글 형식으로 정리합니다.

원칙
- 글쓴이의 문장은 단어 하나 바꾸지 말고 그대로 둡니다. 요약하거나 다듬거나 새 문장을 지어내지 않습니다.
- 할 일은 정리뿐입니다: PDF 때문에 생긴 줄바꿈을 이어 문단으로 만들고, 문단 사이는 빈 줄(\\n\\n) 하나로 구분합니다. 원래 한 줄씩 띄어 쓴 시 같은 문단은 줄바꿈(\\n)을 유지해도 됩니다.
- 본문이 아닌 것은 지웁니다: 쪽 번호, 블로그 이름 머리글, 작성 일시 줄, 글 주소(URL), 해시태그 줄, 공감·댓글·이웃추가 같은 버튼 글자, 지도·장소 카드의 주소/전화 반복, 제목·분류 줄(이것은 따로 필드로).
- 사진 표시 [[사진 N]]은 원래 자리 그대로 둡니다. 텍스트 없이 바로 이어지는 사진 2~4장은 gallery 하나로 묶을 수 있고, 그 외에는 photo로 둡니다. 모든 번호를 빠짐없이 한 번씩, 원래 순서대로 씁니다.
- 나라 이름은 가능하면 다음 표기 중 하나를 씁니다: ${Object.keys(COUNTRY_EN).join(", ")}.
- 제목에 [2026.01.23] 같은 날짜가 있으면 그것이 여행일입니다. 없으면 본문 단서로 추정하고, 정말 모르면 작성일의 연·월을 씁니다.
결과는 반드시 save_post 도구로 돌려줍니다.`;

export async function POST(req: Request) {
  const who = await requireAdmin(req);
  if (who instanceof Response) return who;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return json(500, "ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.");

  const { manuscript, photoCount, hints, fileName } = (await req.json()) as {
    manuscript: string; photoCount: number; fileName?: string;
    hints?: { naverUrl?: string; postedAt?: string; hashtags?: string[] };
  };
  if (!manuscript?.trim() && !photoCount) return json(400, "PDF에서 글자를 찾지 못했습니다. 스캔한 이미지 PDF는 지원하지 않습니다.");
  if (manuscript.length > 120_000) return json(413, "원고가 너무 깁니다(12만 자 초과). PDF를 나눠서 올려 주세요.");

  const user = [
    `파일 이름: ${fileName ?? "(없음)"}`,
    hints?.postedAt ? `작성일(추정): ${hints.postedAt}` : "",
    hints?.hashtags?.length ? `원고의 해시태그: ${hints.hashtags.map((t) => "#" + t).join(" ")}` : "",
    `사진 수: ${photoCount}장 ([[사진 1]] ~ [[사진 ${photoCount}]])`,
    "", "<원고>", manuscript, "</원고>",
  ].filter((l) => l !== "").join("\n");

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5",
      max_tokens: 32000,
      system: SYSTEM,
      tools: [{ name: "save_post", description: "정리된 글을 저장", input_schema: SCHEMA }],
      tool_choice: { type: "tool", name: "save_post" },
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!r.ok) return json(502, `AI 분석 실패 (${r.status}): ${(await r.text()).slice(0, 300)}`);
  const data = (await r.json()) as { content: { type: string; input?: Analysis }[]; stop_reason?: string };
  const out = data.content.find((c) => c.type === "tool_use")?.input;
  if (!out) return json(502, "AI가 결과를 돌려주지 않았습니다. 다시 시도해 주세요.");
  if (data.stop_reason === "max_tokens") return json(502, "글이 너무 길어 AI 결과가 잘렸습니다. PDF를 나눠서 올려 주세요.");
  return Response.json(normalize(out, photoCount));
}

/** AI가 사진을 빠뜨리거나 중복해도 원래 사진이 모두 순서대로 남도록 보정합니다. */
function normalize(a: Analysis, count: number): Analysis & { warnings: string[] } {
  const warnings: string[] = [];
  const used = new Set<number>();
  const ok = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= count;
  const blocks: Analysis["blocks"] = [];
  for (const b of a.blocks ?? []) {
    if (b.type === "text") { if (b.text?.trim()) blocks.push({ type: "text", text: b.text.trim() }); continue; }
    const refs = (b.type === "photo" ? [b.ref] : b.refs ?? []).filter((n) => ok(n) && !used.has(n));
    refs.forEach((n) => used.add(n));
    if (refs.length === 1) blocks.push({ type: "photo", ref: refs[0] });
    else if (refs.length > 1) blocks.push({ type: "gallery", refs });
  }
  const missing = Array.from({ length: count }, (_, i) => i + 1).filter((n) => !used.has(n));
  if (missing.length) {
    warnings.push(`AI가 빠뜨린 사진 ${missing.length}장을 원래 순서 근처에 다시 넣었습니다. 위치를 확인해 주세요.`);
    for (const m of missing) {
      // 바로 앞 번호 사진 뒤에 끼워 넣음
      let at = blocks.length;
      for (let i = blocks.length - 1; i >= 0; i--) {
        const b = blocks[i];
        const nums = b.type === "photo" ? [b.ref] : b.type === "gallery" ? b.refs : [];
        if (nums.some((n) => n < m)) { at = i + 1; break; }
        if (i === 0) at = 0;
      }
      blocks.splice(at, 0, { type: "photo", ref: m });
    }
  }
  const tags = [...new Set((a.hashtags ?? []).map((t) => t.replace(/^#/, "").trim()).filter(Boolean))].slice(0, 15);
  return {
    ...a,
    title: (a.title ?? "").trim() || "제목 없음",
    trip: { date: a.trip?.date ?? "", country: a.trip?.country ?? "", city: a.trip?.city ?? "" },
    hashtags: tags,
    places: a.places ?? [],
    cover: ok(a.cover) ? a.cover : 1,
    blocks,
    warnings,
  };
}

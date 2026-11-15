/**
 * PDF 원고 → 글 (AI 없이 규칙으로 정리, 비용 0원).
 * 원고는 lib/pdf-extract.ts가 만든 텍스트로, 사진 자리에 [[사진 N]] 표시가 있습니다.
 * 네이버 "PDF로 저장" 형식(제목 → 분류 → 작성 일시 → 본문 → 해시태그 → 글 주소)에 맞춰져 있고,
 * 다른 PDF는 첫 줄을 제목으로 보고 나머지를 본문으로 넣습니다.
 */
import { COUNTRY_EN } from "./countries";

export type ParsedBlock = { type: "text"; text: string } | { type: "photo"; ref: number };
export type Parsed = {
  title: string; category: string; date: string; country: string; city: string; series: string;
  hashtags: string[]; blocks: ParsedBlock[]; warnings: string[];
};

/** 도시 → 나라. 해시태그·제목에서 도시를 찾을 때 씁니다. 필요하면 계속 추가하세요. */
const CITY: Record<string, string> = {
  도쿄: "일본", 오사카: "일본", 교토: "일본", 후쿠오카: "일본", 삿포로: "일본", 나고야: "일본", 오키나와: "일본", 고베: "일본", 나라: "일본", 요코하마: "일본", 하코네: "일본", 벳푸: "일본", 유후인: "일본", 가나자와: "일본", 히로시마: "일본", 나가사키: "일본", 구마모토: "일본", 가고시마: "일본", 센다이: "일본", 하카타: "일본", 기타큐슈: "일본",
  방콕: "태국", 치앙마이: "태국", 푸켓: "태국", 파타야: "태국", 끄라비: "태국", 코사무이: "태국",
  로마: "이탈리아", 베네치아: "이탈리아", 베니스: "이탈리아", 피렌체: "이탈리아", 밀라노: "이탈리아", 나폴리: "이탈리아", 시에나: "이탈리아", 볼로냐: "이탈리아", 아말피: "이탈리아", 포지타노: "이탈리아", 베로나: "이탈리아", 돌로미티: "이탈리아", 친퀘테레: "이탈리아", 소렌토: "이탈리아", 피사: "이탈리아", 메스트레: "이탈리아",
  파리: "프랑스", 니스: "프랑스", 리옹: "프랑스", 마르세유: "프랑스", 스트라스부르: "프랑스",
  런던: "영국", 에든버러: "영국",
  바르셀로나: "스페인", 마드리드: "스페인", 세비야: "스페인", 그라나다: "스페인",
  리스본: "포르투갈", 포르투: "포르투갈",
  뮌헨: "독일", 베를린: "독일", 프랑크푸르트: "독일", 하이델베르크: "독일", 함부르크: "독일",
  취리히: "스위스", 인터라켄: "스위스", 루체른: "스위스", 체르마트: "스위스", 제네바: "스위스", 그린델발트: "스위스",
  빈: "오스트리아", 비엔나: "오스트리아", 잘츠부르크: "오스트리아", 할슈타트: "오스트리아", 인스브루크: "오스트리아",
  프라하: "체코", 체스키크룸로프: "체코",
  시드니: "호주", 멜버른: "호주", 브리즈번: "호주", 골드코스트: "호주", 케언즈: "호주", 퍼스: "호주",
  오클랜드: "뉴질랜드", 퀸스타운: "뉴질랜드", 크라이스트처치: "뉴질랜드", 웰링턴: "뉴질랜드", 로토루아: "뉴질랜드",
  싱가포르: "싱가포르", 홍콩: "홍콩", 마카오: "중국", 상하이: "중국", 베이징: "중국",
  타이베이: "대만", 타이중: "대만", 가오슝: "대만", 타이난: "대만",
  다낭: "베트남", 하노이: "베트남", 호치민: "베트남", 나트랑: "베트남", 호이안: "베트남", 푸꾸옥: "베트남", 달랏: "베트남",
  세부: "필리핀", 보라카이: "필리핀", 마닐라: "필리핀", 보홀: "필리핀",
  쿠알라룸푸르: "말레이시아", 코타키나발루: "말레이시아", 페낭: "말레이시아", 랑카위: "말레이시아",
  뉴욕: "미국", 하와이: "미국", 호놀룰루: "미국", 로스앤젤레스: "미국", 샌프란시스코: "미국", 라스베이거스: "미국", 괌: "미국", 사이판: "미국",
  밴쿠버: "캐나다", 토론토: "캐나다", 밴프: "캐나다",
  서울: "한국", 부산: "한국", 제주: "한국", 강릉: "한국", 경주: "한국", 여수: "한국", 전주: "한국", 속초: "한국",
};
const CITY_EN: Record<string, string> = {
  tokyo: "도쿄", osaka: "오사카", kyoto: "교토", fukuoka: "후쿠오카", sapporo: "삿포로", bangkok: "방콕", "chiang mai": "치앙마이", phuket: "푸켓",
  rome: "로마", roma: "로마", venice: "베네치아", venezia: "베네치아", florence: "피렌체", firenze: "피렌체", milan: "밀라노", milano: "밀라노",
  paris: "파리", london: "런던", barcelona: "바르셀로나", madrid: "마드리드", lisbon: "리스본", munich: "뮌헨", berlin: "베를린", zurich: "취리히",
  vienna: "빈", prague: "프라하", sydney: "시드니", melbourne: "멜버른", auckland: "오클랜드", queenstown: "퀸스타운", singapore: "싱가포르",
  "hong kong": "홍콩", taipei: "타이베이", danang: "다낭", "da nang": "다낭", hanoi: "하노이", seoul: "서울", busan: "부산", jeju: "제주",
};

const JUNK = [
  /^\d+\s*·\s*.+$/,                         // "3 · 낡은 서랍속의 추억을 따라" (쪽 머리글)
  /^\d{4}[./-]\d{1,2}[./-]\d{1,2}\.?\s+\d{1,2}:\d{2}/, // 작성 일시
  /^https?:\/\/\S+$/,                        // 글 주소
  /^(#[^\s#]+\s*)+$/,                        // 해시태그만 있는 줄
  /^\d+\s*\/\s*\d+$/,                        // 쪽 번호 "3 / 12"
  /^(공감|댓글|이웃추가|공유하기|신고하기)(\s*\d+)?$/,
];
const isJunk = (l: string) => JUNK.some((r) => r.test(l));
const isPhoto = (l: string) => /^\[\[사진 \d+\]\]$/.test(l);
const isDateLine = (l: string) => JUNK[1].test(l);

function findPlace(texts: string[]): { city: string; country: string } {
  const words = texts.flatMap((t) => t.replace(/여행|맛집|투어|일정|자유여행/g, " ").split(/[^\p{L}\p{N}]+/u)).filter(Boolean);
  for (const w of words) if (CITY[w]) return { city: w, country: CITY[w] };
  const low = texts.join(" ").toLowerCase();
  for (const [en, ko] of Object.entries(CITY_EN)) if (new RegExp(`\\b${en}\\b`).test(low)) return { city: ko, country: CITY[ko] };
  for (const w of words) if (COUNTRY_EN[w]) return { city: "", country: w };
  return { city: "", country: "" };
}

export function pdfToPost(manuscript: string, hints: { postedAt?: string; hashtags: string[] }, fileName = ""): Parsed {
  const raw = manuscript.split("\n").map((l) => l.trim());
  const dateAt = raw.findIndex(isDateLine);

  // 머리 부분: 네이버 형식이면 작성 일시 줄 앞이 [제목 …, 분류]
  let title = "", category = "", start = 0;
  if (dateAt >= 0 && dateAt < 8) {
    const head = raw.slice(0, dateAt).filter((l) => l && !isJunk(l) && !isPhoto(l));
    if (head.length >= 2) { category = head[head.length - 1]; title = head.slice(0, -1).join(" "); }
    else title = head[0] ?? "";
    start = dateAt + 1;
  } else {
    const i = raw.findIndex((l) => l && !isJunk(l) && !isPhoto(l));
    if (i >= 0) { title = raw[i]; start = i + 1; }
  }
  if (!title) title = fileName.replace(/\.pdf$/i, "");

  // 본문: 사진 표시는 사진 블록, 글은 문단으로. PDF 폭 때문에 꺾인 긴 줄은 다음 줄과 이음.
  const body = raw.slice(start).filter((l) => !isJunk(l) && l !== title && l !== category);
  const textLens = body.filter((l) => l && !isPhoto(l)).map((l) => l.length).sort((a, b) => b - a);
  const wrapAt = textLens.length >= 4 ? textLens[Math.floor(textLens.length * 0.1)] * 0.92 : Infinity;
  const blocks: ParsedBlock[] = [];
  let paras: string[] = [], cur = "";
  const flushPara = () => { if (cur.trim()) paras.push(cur.trim()); cur = ""; };
  const flushText = () => { flushPara(); if (paras.length) blocks.push({ type: "text", text: paras.join("\n\n") }); paras = []; };
  for (const l of body) {
    if (isPhoto(l)) { flushText(); blocks.push({ type: "photo", ref: Number(l.match(/\d+/)![0]) }); continue; }
    if (!l) { flushPara(); continue; }
    cur = cur ? cur + " " + l : l;
    const wrapped = l.length >= wrapAt && !/[.!?。…~)"'」』]$/.test(l);
    if (!wrapped) flushPara();
  }
  flushText();

  // 여행 날짜: 제목의 [2026.01.23] / 2026.01 → 없으면 작성일의 연·월
  const td = title.match(/(\d{4})[./-](\d{1,2})(?:[./-](\d{1,2}))?/);
  const p2 = (s: string) => s.padStart(2, "0");
  const date = td ? [td[1], p2(td[2]), td[3] && p2(td[3])].filter(Boolean).join("-") : (hints.postedAt?.slice(0, 7) ?? "");
  // 나라·도시: 제목·해시태그에서 먼저, 없으면 본문에서 처음 나온 도시
  let { city, country } = findPlace([title, ...hints.hashtags]);
  let guessed = false;
  if (!city) {
    guessed = true;
    const b = findPlace(blocks.filter((x) => x.type === "text").map((x) => (x as { text: string }).text));
    if (b.city && (!country || b.country === country)) ({ city, country } = b);
    else if (!country) country = b.country;
  }
  const series = date && city ? `${date.slice(0, 4)}.${date.slice(5, 7)} ${city}`.trim() : "";

  const warnings: string[] = [];
  if (!country || !city) warnings.push("나라·도시를 찾지 못했습니다. 위 칸에 직접 입력해 주세요.");
  else if (guessed) warnings.push(`나라·도시를 '${country} · ${city}'(으)로 본문에서 추정했습니다. 맞는지 확인해 주세요.`);
  if (!td) warnings.push("제목에 여행 날짜가 없어 작성일 기준으로 넣었습니다. 맞는지 확인해 주세요.");
  return { title, category, date, country, city, series, hashtags: hints.hashtags, blocks, warnings };
}

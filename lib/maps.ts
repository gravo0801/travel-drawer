/**
 * 글 속 구글 지도 링크 → 미니 지도.
 * 완전한 링크뿐 아니라 네이버에서 옮기며 잘린 조각(…/@45.48,9.19,17z/ data=…)에서도 좌표를 찾습니다.
 * 지도는 구글 지도 퍼가기(키 없이, 무료)로 보여 줍니다.
 */
export type MapInfo = { lat?: number; lng?: number; name?: string; url: string; query?: string };

const MAP_URL = /(?:https?:\/\/)?(?:www\.)?(?:google\.[a-z.]+\/maps[^\s]*|maps\.google\.[a-z.]+\/[^\s]*|maps\.app\.goo\.gl\/[^\s]+|goo\.gl\/maps\/[^\s]+)/i;

/** 네이버 링크 카드에서 딸려 온 군더더기 줄 */
const JUNK = /^(data=!\S*|www\.google\.com|google\.com|Google Maps|Find local businesses, view maps and get driving directions in Google Maps\.?)$/i;

/** "Glam Hotel Milano · 주소 ★★★★☆ · Hotel" 같은 장소 카드 줄 */
const CARD = /^[^·\n]{1,80} · [^\n]{3,160}(★|· [A-Za-z가-힣 &'-]{2,30}$)/;

function decode(s: string) {
  try { return decodeURIComponent(s.replace(/\+/g, " ")); } catch { return s.replace(/\+/g, " "); }
}

export function parseMap(raw: string): MapInfo | null {
  const t = raw.replace(/\s+/g, "");
  // 경로가 섞인 링크는 마지막 핀이 목적지
  const pin = [...t.matchAll(/!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/g)].pop() ?? null;
  const at = t.match(/@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/);
  const q = t.match(/[?&](?:q|query|ll)=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/);
  const c = pin ?? at ?? q;
  const nm = t.match(/(?:^|\/)place\/([^/@?]+)/) ?? t.match(/(?:^|\/)search\/([^/@?]+)/) ?? t.match(/(?:^|\/)([^/@?:]{3,})\/@-?\d/);
  const name = nm ? decode(nm[1]) : undefined;
  const full = t.match(/https?:\/\/\S+/)?.[0];
  const looksMap = MAP_URL.test(t) || /(^|\/)(place|search)\/|\/data=!|^data=!/.test(t);
  if (!looksMap) return null;
  if (!c && !name && !full) return null;
  const lat = c ? +c[1] : undefined, lng = c ? +c[2] : undefined;
  if (lat !== undefined && (Math.abs(lat) > 90 || Math.abs(lng!) > 180)) return null;
  const url = full && MAP_URL.test(full)
    ? full
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name ?? `${lat},${lng}`)}${c && name ? `&center=${lat},${lng}` : ""}`;
  return { lat, lng, name, url };
}

export function embedSrc(m: MapInfo) {
  const q = m.lat !== undefined ? `${m.lat},${m.lng}` : m.query ?? m.name ?? "";
  return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=16&hl=ko&output=embed`;
}

export type Piece = { kind: "p"; text: string } | { kind: "map"; map: MapInfo; label?: string } | { kind: "place"; text: string };

/** 글 전체(문단 블록들)를 글·지도·장소로 나눔. 블록 사이에서도 중복 지도와 이름표를 맞춤 */
export function splitPost(texts: (string | null)[]): (Piece[] | null)[] {
  const seen = new Set<string>();
  let lastMap: Extract<Piece, { kind: "map" }> | null = null;
  return texts.map((text) => {
    if (text === null) return null; // 사진 블록: 지도-이름표 연결은 사진을 건너뛰어도 유지
    const out: Piece[] = [];
    for (const para of text.split(/\n{2,}/)) {
      const p = para.trim();
      if (!p || JUNK.test(p)) continue;
      if (CARD.test(p) && !MAP_URL.test(p)) {
        if (lastMap && !lastMap.label) { lastMap.label = p; continue; }
        // 링크 없이 장소 카드만 남은 경우: 이름·주소로 지도
        const [name, addr] = p.split(" ★")[0].split(" · ");
        const query = [name, addr].filter(Boolean).join(" ");
        const key = name.trim().toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        const m: Extract<Piece, { kind: "map" }> = { kind: "map", map: { name: name.trim(), query, url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` }, label: p };
        out.push(m); lastMap = m;
        continue;
      }
      const url = p.match(MAP_URL)?.[0];
      const fragment = !url && /(^|\/)(place|search)\/|@-?\d{1,3}\.\d+,-?\d{1,3}\.\d+|^data=!/.test(p) && !/[가-힣]{2,}\s+[가-힣]{2,}/.test(p);
      if (url || fragment) {
        const rest = url ? p.replace(url, "").trim() : "";
        if (rest) { out.push({ kind: "p", text: rest }); lastMap = null; }
        const m = parseMap(url ?? p);
        if (m) {
          const key = m.lat !== undefined ? `${m.lat.toFixed(4)},${m.lng!.toFixed(4)}` : (m.name ?? m.url).toLowerCase();
          if (!seen.has(key)) {
            seen.add(key); if (m.name) seen.add(m.name.toLowerCase());
            const pc: Extract<Piece, { kind: "map" }> = { kind: "map", map: m };
            out.push(pc); lastMap = pc;
          }
        }
        continue;
      }
      out.push({ kind: "p", text: p });
      lastMap = null;
    }
    return out;
  });
}

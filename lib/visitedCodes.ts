/** 나라·지역 코드와 한글 이름 (이름은 브라우저의 Intl 이용 — 따로 번역표를 두지 않음) */
export const ALL_CODES: readonly string[] = ["AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AR", "AS", "AT", "AU", "AW", "AX", "AZ", "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS", "BT", "BW", "BY", "BZ", "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN", "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE", "EG", "EH", "ER", "ES", "ET", "FI", "FJ", "FK", "FM", "FO", "FR", "GA", "GB", "GD", "GE", "GF", "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GT", "GU", "GW", "GY", "HK", "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR", "IS", "IT", "JE", "JM", "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC", "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK", "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA", "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ", "OM", "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM", "PN", "PR", "PS", "PT", "PW", "PY", "QA", "RE", "RO", "RS", "RU", "RW", "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS", "ST", "SV", "SX", "SY", "SZ", "TC", "TD", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO", "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "US", "UY", "UZ", "VA", "VC", "VE", "VG", "VI", "VN", "VU", "WF", "WS", "XK", "XK", "YE", "YT", "ZA", "ZM", "ZW"];

let dn: Intl.DisplayNames | null | undefined;
const getDn = () => { if (dn === undefined) { try { dn = new Intl.DisplayNames("ko", { type: "region" }); } catch { dn = null; } } return dn; };

/** "홍콩(중국 특별행정구)" → "홍콩" */
export function cname(code: string): string {
  try { return (getDn()?.of(code) ?? code).replace(/\s*\(.*\)\s*/, ""); } catch { return code; }
}

const ALIAS: Record<string, string> = { 한국: "KR", 남한: "KR", 터키: "TR", 체코공화국: "CZ", 미합중국: "US", 영국: "GB", 아랍에미리트연합: "AE", 두바이: "AE", 대만: "TW", 타이완: "TW" };
let rev: Map<string, string> | null = null;
function reverse() {
  if (rev) return rev;
  rev = new Map(); for (const c of ALL_CODES) rev.set(cname(c).replace(/\s/g, ""), c);
  for (const [k, v] of Object.entries(ALIAS)) rev.set(k, v);
  return rev;
}
/** 블로그 글에 적힌 나라 이름(예: "태국") → 코드. 알아보지 못한 이름은 건너뜀 */
export function codesFromNames(names: Iterable<string>): Set<string> {
  const m = reverse(), out = new Set<string>();
  for (const n of names) { const c = m.get(String(n).replace(/\s/g, "")); if (c) out.add(c); }
  return out;
}

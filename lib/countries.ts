export const COUNTRY_EN: Record<string, string> = {
  일본: "Japan", 이탈리아: "Italy", 태국: "Thailand", 독일: "Germany", 프랑스: "France", 스위스: "Switzerland",
  호주: "Australia", 뉴질랜드: "New Zealand", 한국: "Korea", 베트남: "Vietnam", 스페인: "Spain", 영국: "United Kingdom",
  미국: "USA", 대만: "Taiwan", 중국: "China", 싱가포르: "Singapore", 홍콩: "Hong Kong", 오스트리아: "Austria",
  체코: "Czechia", 포르투갈: "Portugal", 캐나다: "Canada", 필리핀: "Philippines", 말레이시아: "Malaysia",
};
export const countryEn = (c: string) => COUNTRY_EN[c] ?? (!c || c.endsWith("미정") ? "" : c);

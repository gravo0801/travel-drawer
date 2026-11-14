export type SlotKey = "hero" | "archive" | "footer";
export type Theme = "dark" | "light";
export type Align = "center" | "left" | "right";

export const SLOTS: Record<SlotKey, { name: string; ratio: number; ratioLabel: string; rec: string; min: [number, number]; tip: string }> = {
  hero: { name: "첫 화면 큰 사진", ratio: 16 / 9, ratioLabel: "16:9", rec: "2400 × 1350", min: [1920, 1080],
    tip: "가로 사진. 중요한 피사체는 위쪽·가운데에 두세요. 글씨가 놓이는 아래 1/3은 단순할수록 좋습니다." },
  archive: { name: "글 찾기 뒤 배경", ratio: 3 / 2, ratioLabel: "3:2", rec: "2400 × 1600", min: [1800, 1200],
    tip: "하늘·능선·바다처럼 단순한 사진. 어둡게 덮이므로 밝고 복잡한 사진은 글씨를 방해합니다." },
  footer: { name: "맨 아래 큰 사진", ratio: 16 / 9, ratioLabel: "16:9", rec: "2400 × 1350", min: [1920, 1080],
    tip: "하늘이 넉넉한 사진. 아래쪽에 큰 글자가 올라오므로 아래 1/4은 어두워도 괜찮습니다." },
};

export const defaultSlot = (k: SlotKey, theme: Theme) => `/media/site/${k}${theme === "light" ? "-light" : ""}.jpg`;

export const FONTS = [
  { id: "pre", name: "Pretendard (프리텐다드)", family: "'Pretendard','Noto Sans KR',sans-serif", note: "깔끔한 고딕 · 눈누에서 받은 글꼴", license: "SIL OFL · 직접 추가", mine: true },
  { id: "nserif", name: "Noto Serif KR (노토 명조)", family: "'Noto Serif KR',serif", note: "단정한 명조", license: "SIL OFL · 구글 폰트" },
  { id: "nsans", name: "Noto Sans KR (노토 고딕)", family: "'Noto Sans KR',sans-serif", note: "무난한 고딕", license: "SIL OFL · 구글 폰트" },
  { id: "nmj", name: "나눔명조", family: "'Nanum Myeongjo',serif", note: "전통적인 명조", license: "SIL OFL · 구글 폰트" },
  { id: "gb", name: "고운바탕", family: "'Gowun Batang',serif", note: "부드러운 바탕체", license: "SIL OFL · 구글 폰트" },
  { id: "gd", name: "고운돋움", family: "'Gowun Dodum',sans-serif", note: "둥글고 따뜻한 돋움", license: "SIL OFL · 구글 폰트" },
  { id: "ng", name: "나눔고딕", family: "'Nanum Gothic',sans-serif", note: "읽기 편한 기본 고딕", license: "SIL OFL · 구글 폰트" },
] as const;

export const SITE = {
  name: "낡은 서랍속의 추억을 따라",
  tagline: "거의 20년 동안 써 온 여행의 기록입니다. 연도와 나라, 도시를 따라 길을 찾아보세요.",
  totalPosts: 849,
};

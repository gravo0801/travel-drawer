export type Photo = { src: string; w: number; h: number; caption?: string };
export type Block =
  | { type: "text"; text: string }
  | ({ type: "photo" } & Photo)
  | { type: "gallery"; photos: Photo[] };

export type Trip = {
  /** When the trip happened: YYYY, YYYY-MM or YYYY-MM-DD. The archive groups by this, not by the posting date. */
  date: string;
  country: string;
  city: string;
};

export type Post = {
  id: string;
  title: string;
  trip: Trip;
  publishedAt: string;
  series?: string;
  category?: string | null;
  hashtags?: string[];
  cover?: string | null;
  blocks?: Block[];
  naverUrl?: string | null;
  source?: "naver" | "editor" | "pdf";
  /** 이 블로그에 처음 올린 시각 (ISO). "최근 올린 글" 순서에 씀 */
  addedAt?: string;
  /** 마지막으로 고친 시각 (ISO) */
  updatedAt?: string;
  /** 글 목록에 보일 요약 (PDF 가져오기 때 AI가 작성) */
  summary?: string;
  /** 글에 나온 방문 장소, 등장 순서 (동선 기능용) */
  places?: string[];
  photoCount?: number;
};

/** What the home page and archive need, without the full body. */
export type PostSummary = Omit<Post, "blocks"> & { photoCount: number; excerpt?: string };

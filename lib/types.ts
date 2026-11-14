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
  source?: "naver" | "editor";
  photoCount?: number;
};

/** What the home page and archive need, without the full body. */
export type PostSummary = Omit<Post, "blocks"> & { photoCount: number; excerpt?: string };

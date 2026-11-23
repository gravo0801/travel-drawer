/**
 * DRAWER 아이콘 세트 — 24px 격자, 선 1.6, 둥근 끝.
 * 각 아이콘에 옅은 면(.d) 하나를 넣어 같은 굵기 안에서도 입체감을 줍니다.
 */
const P: Record<string, React.ReactNode> = {
  // 위 서랍이 살짝 열린 서랍장
  logo: (<>
    <rect className="d" x="2.2" y="4.4" width="19.6" height="6.6" rx="1.8" />
    <rect x="2.2" y="4.4" width="19.6" height="6.6" rx="1.8" />
    <path d="M3.6 11v7.2a2.2 2.2 0 0 0 2.2 2.2h12.4a2.2 2.2 0 0 0 2.2-2.2V11" />
    <path d="M10 7.7h4M10 15.7h4" />
  </>),
  overview: (<>
    <rect className="d" x="3.5" y="3.5" width="7.5" height="9.5" rx="2" />
    <rect x="3.5" y="3.5" width="7.5" height="9.5" rx="2" />
    <rect x="13" y="3.5" width="7.5" height="5.5" rx="2" />
    <rect x="13" y="11" width="7.5" height="9.5" rx="2" />
    <rect x="3.5" y="15" width="7.5" height="5.5" rx="2" />
  </>),
  calendar: (<>
    <path className="d" d="M3.8 9.6h16.4V7.3a2.2 2.2 0 0 0-2.2-2.2H6a2.2 2.2 0 0 0-2.2 2.2z" />
    <rect x="3.8" y="5.1" width="16.4" height="15.4" rx="2.4" />
    <path d="M3.8 9.6h16.4M8.2 3.2v3.6M15.8 3.2v3.6" />
    <circle className="f" cx="15.6" cy="15.4" r="1.6" />
  </>),
  // 펼친 책 + 오른쪽 책갈피
  book: (<>
    <path className="d" d="M15 4.9v5.4l1.6-1.1 1.6 1.1V4.7" />
    <path d="M12 6.6C10.2 5.2 7.5 4.6 3.6 4.6v13.2c3.9 0 6.6.6 8.4 2 1.8-1.4 4.5-2 8.4-2V4.6c-1.5 0-2.8.1-3.9.3" />
    <path d="M12 6.6v13.2" />
    <path d="M15 4.9v5.4l1.6-1.1 1.6 1.1V4.7" />
  </>),
  // 만년필 펜촉
  pen: (<>
    <path className="d" d="M14.6 4.3l5.1 5.1-8.8 8.8-6.2 1.6 1.6-6.2z" />
    <path d="M14.6 4.3l5.1 5.1-8.8 8.8-6.2 1.6 1.6-6.2z" />
    <path d="M4.7 19.8l5-5" /><circle cx="11.1" cy="13.4" r="1.3" />
    <path d="M12.6 6.3l5.1 5.1" />
  </>),
  // 하트 + 심전도
  pulse: (<>
    <path className="d" d="M12 20.2S4.2 15.6 4.2 9.7A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.8 2.5c0 5.9-7.8 10.5-7.8 10.5z" />
    <path d="M12 20.2S4.2 15.6 4.2 9.7A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.8 2.5c0 5.9-7.8 10.5-7.8 10.5z" />
    <path d="M6.6 12.6h2.6l1.4-2.4 2.1 4.6 1.4-2.2h3.3" />
  </>),
  // 오르는 선 + 아래 면
  chart: (<>
    <path className="d" d="M7.4 15.6l3.6-4.2 3 2.6 5.2-6.6V20H7.4z" />
    <path d="M3.8 3.8V20.2h16.4" />
    <path d="M7.4 15.6l3.6-4.2 3 2.6 5.2-6.6" />
    <path d="M15.6 7.4h3.6V11" />
  </>),
  // 내시경: 조작부 + 휘어진 삽입관 + 렌즈 끝
  scope: (<>
    <rect className="d" x="3.4" y="3" width="5.4" height="7.4" rx="1.6" />
    <rect x="3.4" y="3" width="5.4" height="7.4" rx="1.6" />
    <circle cx="10.9" cy="5.6" r="1.3" />
    <path d="M6.1 10.4v3.4a4.1 4.1 0 0 0 4.1 4.1h6.4a3 3 0 0 0 0-6h-2.9" />
    <circle cx="12.4" cy="11.9" r="1.3" />
    <path d="M10.4 10.3l-.7-.7" />
  </>),
  plane: (<>
    <path className="d" d="M20.6 3.4L3.4 10.6l6.9 3.1 3.1 6.9z" />
    <path d="M20.6 3.4L3.4 10.6l6.9 3.1 3.1 6.9z" />
    <path d="M10.3 13.7l4.6-4.6" />
  </>),
  globe: (<>
    <circle className="d" cx="12" cy="12" r="8.6" />
    <circle cx="12" cy="12" r="8.6" />
    <path d="M3.6 9.4h16.8M3.6 14.6h16.8" />
    <path d="M12 3.4c2.4 2.4 3.5 5.3 3.5 8.6s-1.1 6.2-3.5 8.6c-2.4-2.4-3.5-5.3-3.5-8.6S9.6 5.8 12 3.4z" />
  </>),
  camera: (<>
    <path className="d" d="M8.3 7l1.4-2.4h4.6L15.7 7z" />
    <rect x="3.2" y="7" width="17.6" height="12.8" rx="3" />
    <path d="M8.3 7l1.4-2.4h4.6L15.7 7" />
    <circle cx="12" cy="13.3" r="3.5" />
    <circle className="f" cx="17.4" cy="10" r=".9" />
  </>),
  // 상자 안으로 들어가는 화살표 (옮겨 오기)
  move: (<>
    <rect className="d" x="3.2" y="4" width="17.6" height="4.2" rx="1.4" />
    <rect x="3.2" y="4" width="17.6" height="4.2" rx="1.4" />
    <path d="M4.6 8.2v9.6a2.2 2.2 0 0 0 2.2 2.2h10.4a2.2 2.2 0 0 0 2.2-2.2V8.2" />
    <path d="M12 10.8v5.8M9.5 14.2l2.5 2.5 2.5-2.5" />
  </>),
  note: (<>
    <path className="d" d="M14.2 20.2v-5.4h5.6" />
    <path d="M19.8 14.8V5.6a1.8 1.8 0 0 0-1.8-1.8H6a1.8 1.8 0 0 0-1.8 1.8V18.4A1.8 1.8 0 0 0 6 20.2h8.2z" />
    <path d="M14.2 20.2v-5.4h5.6M8 8.6h8M8 12h5" />
  </>),
  pin: (<>
    <path className="d" d="M12 21s-6.6-5.6-6.6-11.1a6.6 6.6 0 0 1 13.2 0C18.6 15.4 12 21 12 21z" />
    <path d="M12 21s-6.6-5.6-6.6-11.1a6.6 6.6 0 0 1 13.2 0C18.6 15.4 12 21 12 21z" />
    <circle cx="12" cy="9.9" r="2.4" />
  </>),
  sun: (<>
    <circle className="d" cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="4" />
    <path d="M12 2.8v1.8M12 19.4v1.8M2.8 12h1.8M19.4 12h1.8M5.5 5.5l1.3 1.3M17.2 17.2l1.3 1.3M5.5 18.5l1.3-1.3M17.2 6.8l1.3-1.3" />
  </>),
  moon: (<>
    <path className="d" d="M19.6 14.6A7.8 7.8 0 0 1 9.4 4.4a7.8 7.8 0 1 0 10.2 10.2z" />
    <path d="M19.6 14.6A7.8 7.8 0 0 1 9.4 4.4a7.8 7.8 0 1 0 10.2 10.2z" />
    <path d="M17 3.6v2.6M15.7 4.9h2.6" />
  </>),
  sliders: (<>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9M4 12h4.5M12.5 12H20" />
    <circle className="d" cx="15" cy="7" r="2" /><circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" /><circle cx="10.5" cy="12" r="2" />
  </>),
  widgets: (<>
    <rect className="d" x="3.6" y="3.6" width="7" height="7" rx="1.8" />
    <rect x="3.6" y="3.6" width="7" height="7" rx="1.8" />
    <rect x="13.4" y="3.6" width="7" height="7" rx="1.8" />
    <rect x="3.6" y="13.4" width="7" height="7" rx="1.8" />
    <path d="M16.9 13.6v6.6M13.6 16.9h6.6" />
  </>),
  open: <path d="M8 16L16 8M9.6 8H16v6.4" />,
  arrow: <path d="M5 12h14M13.5 6.5L19 12l-5.5 5.5" />,
  left: <path d="M14.5 6l-6 6 6 6" />,
  right: <path d="M9.5 6l6 6-6 6" />,
  plus: <path d="M12 5.5v13M5.5 12h13" />,
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  check: <path d="M5.5 12.5l4.2 4.2 8.8-9.4" />,
  up: <path d="M6.5 14.5L12 9l5.5 5.5" />,
  down: <path d="M6.5 9.5L12 15l5.5-5.5" />,
  trash: (<>
    <path d="M4.5 7h15M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7" />
    <path d="M6.3 7l.9 11.6a1.8 1.8 0 0 0 1.8 1.6h6a1.8 1.8 0 0 0 1.8-1.6L17.7 7" />
  </>),
  lock: (<>
    <rect className="d" x="4.6" y="10.4" width="14.8" height="10" rx="2.4" />
    <rect x="4.6" y="10.4" width="14.8" height="10" rx="2.4" />
    <path d="M8.2 10.4V7.6a3.8 3.8 0 0 1 7.6 0v2.8" />
    <path d="M12 14.4v2.2" />
  </>),
  logout: (<>
    <path d="M14 4.2H6.6a2 2 0 0 0-2 2v11.6a2 2 0 0 0 2 2H14" />
    <path d="M10 12h10M16.5 8.5L20 12l-3.5 3.5" />
  </>),
  cloud: (<>
    <path className="d" d="M7.2 18.5h10a4 4 0 0 0 .4-8 5.6 5.6 0 0 0-10.8 1.4A3.4 3.4 0 0 0 7.2 18.5z" />
    <path d="M7.2 18.5h10a4 4 0 0 0 .4-8 5.6 5.6 0 0 0-10.8 1.4A3.4 3.4 0 0 0 7.2 18.5z" />
  </>),
  pcloud: (<>
    <circle className="d" cx="8.6" cy="8.4" r="3.2" /><path d="M8.6 2.6v1.3M3 8.4h1.3M4.6 4.4l.9.9M12.6 4.4l-.9.9M5.4 11.6a3.2 3.2 0 1 1 5.9-2.4" />
    <path className="d" d="M9.4 20h8.4a3.4 3.4 0 0 0 .3-6.8 4.7 4.7 0 0 0-9 1.2A2.8 2.8 0 0 0 9.4 20z" />
    <path d="M9.4 20h8.4a3.4 3.4 0 0 0 .3-6.8 4.7 4.7 0 0 0-9 1.2A2.8 2.8 0 0 0 9.4 20z" />
  </>),
  ncloud: (<>
    <path className="d" d="M12.2 8.6A4.6 4.6 0 0 1 6.3 2.7a4.6 4.6 0 1 0 5.9 5.9z" /><path d="M12.2 8.6A4.6 4.6 0 0 1 6.3 2.7a4.6 4.6 0 1 0 5.9 5.9z" />
    <path className="d" d="M9.4 20h8.4a3.4 3.4 0 0 0 .3-6.8 4.7 4.7 0 0 0-9 1.2A2.8 2.8 0 0 0 9.4 20z" />
    <path d="M9.4 20h8.4a3.4 3.4 0 0 0 .3-6.8 4.7 4.7 0 0 0-9 1.2A2.8 2.8 0 0 0 9.4 20z" />
  </>),
  rain: (<>
    <path className="d" d="M7.2 14.5h10a3.8 3.8 0 0 0 .4-7.6 5.4 5.4 0 0 0-10.4 1.3 3.2 3.2 0 0 0 0 6.3z" />
    <path d="M7.2 14.5h10a3.8 3.8 0 0 0 .4-7.6 5.4 5.4 0 0 0-10.4 1.3 3.2 3.2 0 0 0 0 6.3z" />
    <path d="M8.5 17.2l-.9 2.3M12.5 17.2l-.9 2.3M16.5 17.2l-.9 2.3" />
  </>),
  snow: (<>
    <path className="d" d="M7.2 14h10a3.8 3.8 0 0 0 .4-7.6 5.4 5.4 0 0 0-10.4 1.3A3.2 3.2 0 0 0 7.2 14z" />
    <path d="M7.2 14h10a3.8 3.8 0 0 0 .4-7.6 5.4 5.4 0 0 0-10.4 1.3A3.2 3.2 0 0 0 7.2 14z" />
    <path d="M8.5 17.5v.01M12 19.5v.01M15.5 17.5v.01M10.3 21v.01M13.8 21v.01" strokeWidth="2.4" />
  </>),
  storm: (<>
    <path className="d" d="M7.2 14h10a3.8 3.8 0 0 0 .4-7.6 5.4 5.4 0 0 0-10.4 1.3A3.2 3.2 0 0 0 7.2 14z" />
    <path d="M7.2 14h10a3.8 3.8 0 0 0 .4-7.6 5.4 5.4 0 0 0-10.4 1.3A3.2 3.2 0 0 0 7.2 14z" />
    <path className="f" d="M12.6 14.2l-2.6 4h2.4l-1.2 3.6 3.6-4.9h-2.5l1.4-2.7z" />
  </>),
  fog: (<>
    <path className="d" d="M7.2 12.5h10a3.6 3.6 0 0 0 .4-7.2 5.2 5.2 0 0 0-10 1.3 3 3 0 0 0-.4 5.9z" />
    <path d="M7.2 12.5h10a3.6 3.6 0 0 0 .4-7.2 5.2 5.2 0 0 0-10 1.3 3 3 0 0 0-.4 5.9z" />
    <path d="M4 15.8h16M6 19h12" />
  </>),
  drop: (<>
    <path className="d" d="M12 3.5s-5.6 6.2-5.6 10.3a5.6 5.6 0 0 0 11.2 0C17.6 9.7 12 3.5 12 3.5z" />
    <path d="M12 3.5s-5.6 6.2-5.6 10.3a5.6 5.6 0 0 0 11.2 0C17.6 9.7 12 3.5 12 3.5z" />
  </>),
  wind: <path d="M3.5 9h10.2a2.7 2.7 0 1 0-2.6-3.4M3.5 13h14.8a2.9 2.9 0 1 1-2.8 3.7M3.5 17h7" />,
  locate: (<>
    <circle className="d" cx="12" cy="12" r="6.4" /><circle cx="12" cy="12" r="6.4" /><circle className="f" cx="12" cy="12" r="2.2" />
    <path d="M12 2.6v3M12 18.4v3M2.6 12h3M18.4 12h3" />
  </>),
  search: (<>
    <circle className="d" cx="10.8" cy="10.8" r="6.2" /><circle cx="10.8" cy="10.8" r="6.2" /><path d="M15.4 15.4l4.6 4.6" />
  </>),
  grip: (<><circle className="f" cx="9" cy="6.5" r="1.4" /><circle className="f" cx="15" cy="6.5" r="1.4" /><circle className="f" cx="9" cy="12" r="1.4" /><circle className="f" cx="15" cy="12" r="1.4" /><circle className="f" cx="9" cy="17.5" r="1.4" /><circle className="f" cx="15" cy="17.5" r="1.4" /></>),
  eyeoff: (<><path d="M3.5 12s3.2-6 8.5-6 8.5 6 8.5 6-3.2 6-8.5 6-8.5-6-8.5-6z" /><circle cx="12" cy="12" r="2.6" /><path d="M4.5 4.5l15 15" /></>),
  map: (<><path className="d" d="M3.5 6.5l5.5-2 6 2 5.5-2v13l-5.5 2-6-2-5.5 2z" /><path d="M3.5 6.5l5.5-2 6 2 5.5-2v13l-5.5 2-6-2-5.5 2z" /><path d="M9 4.5v13M15 6.5v13" /></>),
  spark: <path className="f" d="M12 3.5l1.7 5.2a2.6 2.6 0 0 0 1.6 1.6l5.2 1.7-5.2 1.7a2.6 2.6 0 0 0-1.6 1.6L12 20.5l-1.7-5.2a2.6 2.6 0 0 0-1.6-1.6L3.5 12l5.2-1.7a2.6 2.6 0 0 0 1.6-1.6z" />,
};

export type IconName = keyof typeof P;

export default function Icon({ n, size = 20, className = "" }: { n: string; size?: number; className?: string }) {
  return (
    <svg className={"ic " + className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {P[n] ?? null}
    </svg>
  );
}

import type { Metadata, Viewport } from "next";
import SettingsProvider from "@/components/SettingsProvider";
import Settings from "@/components/Settings";
import { SITE } from "@/lib/site";
import { loadSite } from "@/lib/site-server";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: SITE.name, template: `%s · ${SITE.name}` },
  description: SITE.tagline,
};
export const viewport: Viewport = { themeColor: "#0c0e13" };

// 첫 화면이 그려지기 전에 테마·정렬을 정함. 이 기기에서 직접 바꾼 값은 사이트 설정이 새로 저장되기 전까지만 우선.
const bootFor = (v: string, theme: string, align: string) => `try{var V=${JSON.stringify(v)},B=localStorage.getItem('td-base'),ok=B===null?V==='':B===JSON.stringify(V);var t=ok?localStorage.getItem('td-theme'):null;document.documentElement.dataset.theme=t?JSON.parse(t):${JSON.stringify(theme)};var a=ok?localStorage.getItem('td-align'):null;document.documentElement.dataset.align=a?JSON.parse(a):${JSON.stringify(align)};}catch(e){document.documentElement.dataset.theme=${JSON.stringify(theme)};document.documentElement.dataset.align=${JSON.stringify(align)}}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const site = loadSite();
  return (
    <html lang="ko" data-theme={site.theme} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootFor(site.v, site.theme, site.align) }} />
        <link rel="preload" href="/fonts/Pretendard-Regular.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Alternative fonts offered in settings */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Noto+Sans+KR:wght@400;500;700&family=Noto+Serif+KR:wght@400;600&family=Nanum+Myeongjo:wght@400;700&family=Gowun+Batang:wght@400;700&family=Gowun+Dodum&family=Nanum+Gothic:wght@400;700&display=swap" />
      </head>
      <body>
        <SettingsProvider site={site}>
          {children}
          <Settings />
        </SettingsProvider>
      </body>
    </html>
  );
}

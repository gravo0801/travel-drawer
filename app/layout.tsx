import type { Metadata, Viewport } from "next";
import SettingsProvider from "@/components/SettingsProvider";
import Settings from "@/components/Settings";
import { SITE } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: SITE.name, template: `%s · ${SITE.name}` },
  description: SITE.tagline,
};
export const viewport: Viewport = { themeColor: "#0c0e13" };

// Sets theme and fonts before first paint so there is no flash.
const boot = `try{var t=localStorage.getItem('td-theme');document.documentElement.dataset.theme=t?JSON.parse(t):'dark';}catch(e){document.documentElement.dataset.theme='dark'}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: boot }} />
        <link rel="preload" href="/fonts/Pretendard-Regular.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Alternative fonts offered in settings */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Noto+Sans+KR:wght@400;500;700&family=Noto+Serif+KR:wght@400;600&family=Nanum+Myeongjo:wght@400;700&family=Gowun+Batang:wght@400;700&family=Gowun+Dodum&family=Nanum+Gothic:wght@400;700&display=swap" />
      </head>
      <body>
        <SettingsProvider>
          {children}
          <Settings />
        </SettingsProvider>
      </body>
    </html>
  );
}

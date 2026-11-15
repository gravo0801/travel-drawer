import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import PdfImporter from "@/components/PdfImporter";

export const metadata: Metadata = { title: "글쓰기", robots: { index: false, follow: false } };

export default function WritePage() {
  return (
    <>
      <SiteNav solid />
      <PdfImporter />
    </>
  );
}

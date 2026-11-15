import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import PdfImporter from "@/components/PdfImporter";

export const metadata: Metadata = { title: "PDF로 글 올리기", robots: { index: false, follow: false } };

export default function ImportPage() {
  return (
    <>
      <SiteNav solid />
      <PdfImporter />
    </>
  );
}

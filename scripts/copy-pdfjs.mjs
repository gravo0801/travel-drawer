// PDF 읽기에 필요한 글꼴 데이터(cmaps, standard_fonts, wasm)를 public/pdfjs로 복사합니다.
// 한글 PDF는 cmaps가 없으면 글자를 읽지 못합니다. dev·build 전에 자동 실행됩니다.
import fs from "node:fs";
import path from "node:path";
const src = path.join("node_modules", "pdfjs-dist");
const dst = path.join("public", "pdfjs");
for (const d of ["cmaps", "standard_fonts", "wasm"]) {
  const from = path.join(src, d);
  if (fs.existsSync(from)) fs.cpSync(from, path.join(dst, d), { recursive: true });
}
console.log("pdfjs assets → public/pdfjs");

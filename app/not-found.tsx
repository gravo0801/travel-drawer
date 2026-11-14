import Link from "next/link";
export default function NotFound() {
  return <main className="nf"><h1>글을 찾을 수 없습니다</h1><p>주소가 바뀌었거나 아직 옮겨지지 않은 글입니다.</p><Link className="btn pri" href="/#archive">전체 글 찾기</Link></main>;
}

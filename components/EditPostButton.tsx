"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { firebaseApp } from "@/lib/firebase";

/** 로그인했을 때만 글 화면에 보이는 [수정] 단추 */
export default function EditPostButton({ id }: { id: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const app = firebaseApp();
    if (!app) return;
    let off = () => {};
    import("firebase/auth").then(({ getAuth, onAuthStateChanged }) => { off = onAuthStateChanged(getAuth(app), (u) => setOn(!!u)); });
    return () => off();
  }, []);
  if (!on) return null;
  return <Link className="p-editbtn" href={`/write?edit=${id}`}>✎ 이 글 수정</Link>;
}

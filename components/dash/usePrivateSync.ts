"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { doc, getDocFromServer, getFirestore, onSnapshot, runTransaction, serverTimestamp } from "firebase/firestore";
import { firebaseApp } from "@/lib/firebase";

export type Trip = { id: string; name: string; start: string; end: string };
export type PrivateData = { trips: Trip[]; memo: string };
type Choice = { revision: number; remote: PrivateData; exists: boolean };
const EMPTY: PrivateData = { trips: [], memo: "" };
const legacyKey = "drawer.private.v1";
const localKey = (uid: string) => `drawer.private.v2.${uid}`;
const enabledKey = (uid: string) => `drawer.private.cloud.v1.${uid}`;
const dirtyKey = (uid: string) => `drawer.private.dirty.v1.${uid}`;
const backupKey = (uid: string, source: string) => `drawer.private.backup.v1.${uid}.${source}.${Date.now()}`;
const revisionKey = (uid: string) => `drawer.private.revision.v1.${uid}`;

function parse(value: unknown): PrivateData | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const memo = raw.memo === undefined ? "" : raw.memo;
  if (!Array.isArray(raw.trips) || typeof memo !== "string") return null;
  if (raw.trips.length > 300 || memo.length > 100_000) return null;
  const trips: Trip[] = [];
  const ids = new Set<string>();
  for (const entry of raw.trips) {
    if (!entry || typeof entry !== "object") return null;
    const t = entry as Record<string, unknown>;
    const start = typeof t.start === "string" ? t.start : t.date;
    const end = t.end === undefined ? "" : t.end;
    if (typeof t.id !== "string" || !t.id || t.id.length > 100 || ids.has(t.id) ||
        typeof t.name !== "string" || t.name.length > 200 ||
        typeof start !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(start) ||
        typeof end !== "string" || (end && !/^\d{4}-\d{2}-\d{2}$/.test(end))) return null;
    ids.add(t.id);
    trips.push({ id: t.id, name: t.name, start, end });
  }
  return { trips, memo };
}

const hasData = (value: PrivateData) => value.trips.length > 0 || value.memo.length > 0;
const same = (a: PrivateData, b: PrivateData) => JSON.stringify(a) === JSON.stringify(b);
const cloudRef = (uid: string) => doc(getFirestore(firebaseApp()!), "drawer_private_data", uid);
function preserve(uid: string, source: string, value: PrivateData) {
  localStorage.setItem(backupKey(uid, source), JSON.stringify(value));
}

export function usePrivateSync(user: User | null) {
  const [data, setData] = useState<PrivateData>(EMPTY);
  const [status, setStatus] = useState("이 기기에 저장");
  const [message, setMessage] = useState("");
  const [choice, setChoice] = useState<Choice | null>(null);
  const [busy, setBusy] = useState(false);
  const [cloudOn, setCloudOn] = useState(false);
  const current = useRef<PrivateData>(EMPTY);
  const currentSerialized = useRef<string | null>(null);
  const revision = useRef(0);
  const version = useRef(0);
  const saving = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enabled = useRef(false);
  const uid = user?.uid;

  const saveCloud = useCallback(async () => {
    if (!uid || !enabled.current || saving.current || !firebaseApp()) return;
    saving.current = true;
    const payload = current.current;
    const atVersion = version.current;
    const expected = revision.current;
    try {
      const nextRevision = await runTransaction(getFirestore(firebaseApp()!), async (tx) => {
        const ref = cloudRef(uid);
        const snap = await tx.get(ref);
        const actual = snap.exists() ? Number(snap.data().revision) || 0 : 0;
        if (actual !== expected) throw new Error("다른 기기에서 기록이 변경되었습니다.");
        tx.set(ref, { schema: 1, revision: actual + 1, data: payload, updatedAt: serverTimestamp() });
        return actual + 1;
      });
      revision.current = nextRevision;
      localStorage.setItem(revisionKey(uid), String(nextRevision));
      if (enabled.current && version.current === atVersion) {
        localStorage.removeItem(dirtyKey(uid));
        setStatus("클라우드 동기화 완료"); setMessage("");
      }
    } catch (error) {
      setStatus("이 기기에 저장");
      setMessage(`클라우드 저장을 멈췄습니다. ${(error as Error).message} 로컬 기록은 보존됩니다.`);
      enabled.current = false; setCloudOn(false);
    } finally {
      saving.current = false;
      if (enabled.current && version.current !== atVersion) timer.current = setTimeout(saveCloud, 700);
    }
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    let raw = localStorage.getItem(localKey(uid));
    if (raw === null) {
      raw = localStorage.getItem(legacyKey);
      if (raw !== null) {
        try { localStorage.setItem(localKey(uid), raw); } catch { setMessage("저장 공간이 부족합니다. 먼저 JSON 백업을 내려받아 주세요."); }
      } // 원본은 건드리지 않습니다.
    }
    let initial = EMPTY;
    if (raw !== null) {
      try {
        const parsed = parse(JSON.parse(raw));
        if (parsed) initial = parsed;
        else setMessage("저장된 기록 형식을 읽을 수 없습니다. 원본은 보존했으며 자동 동기화를 중단했습니다.");
      } catch { setMessage("저장된 기록을 읽을 수 없습니다. 원본은 보존했으며 자동 동기화를 중단했습니다."); }
    }
    current.current = initial; currentSerialized.current = localStorage.getItem(localKey(uid)); setData(initial);
    revision.current = Number(localStorage.getItem(revisionKey(uid))) || 0;
    enabled.current = localStorage.getItem(enabledKey(uid)) === "1" && raw !== null && !!parseSafe(raw) && localStorage.getItem(dirtyKey(uid)) !== "1";
    if (localStorage.getItem(enabledKey(uid)) === "1" && localStorage.getItem(dirtyKey(uid)) === "1") setMessage("이 기기에 아직 동기화되지 않은 변경 사항이 있습니다. 백업 후 클라우드 기록을 확인해 주세요.");
    setCloudOn(enabled.current);
  }, [uid]);

  useEffect(() => {
    if (!uid || !cloudOn) return;
    if (!enabled.current) { setStatus("이 기기에 저장"); return; }
    setStatus("클라우드 확인 중");
    const unsubscribe = onSnapshot(cloudRef(uid), (snap) => {
      if (localStorage.getItem(dirtyKey(uid)) === "1") return;
      if (!snap.exists()) { setStatus("이 기기에 저장"); setMessage("클라우드 기록이 없습니다. 로컬 기록은 보존됩니다."); enabled.current = false; setCloudOn(false); return; }
      const remote = parse(snap.data().data);
      const remoteRevision = Number(snap.data().revision) || 0;
      if (!remote) { setStatus("이 기기에 저장"); setMessage("클라우드 기록 형식이 올바르지 않아 동기화를 멈췄습니다."); enabled.current = false; setCloudOn(false); return; }
      if (remoteRevision < revision.current) return;
      if (remoteRevision === revision.current && !same(current.current, remote)) {
        setStatus("충돌 확인 필요"); setMessage("두 기기의 기록이 다릅니다. 백업 후 사용할 기록을 선택해 주세요.");
        setChoice({ revision: remoteRevision, remote, exists: true }); enabled.current = false; setCloudOn(false); return;
      }
      revision.current = remoteRevision;
      localStorage.setItem(revisionKey(uid), String(remoteRevision));
      current.current = remote; setData(remote);
      const serialized = JSON.stringify(remote);
      localStorage.setItem(localKey(uid), serialized);
      currentSerialized.current = serialized;
      setStatus("클라우드 동기화 완료"); setMessage("");
    }, (error) => { setStatus("이 기기에 저장"); setMessage(`클라우드 접근 실패 (${error.code}). 로컬 기록은 보존됩니다.`); enabled.current = false; setCloudOn(false); });
    return () => { unsubscribe(); if (timer.current) clearTimeout(timer.current); };
  }, [uid, cloudOn]);

  const update = useCallback((patch: Partial<PrivateData>) => {
    if (!uid) return;
    if (localStorage.getItem(localKey(uid)) !== currentSerialized.current) {
      setStatus("충돌 확인 필요");
      setMessage("다른 탭에서 이 기기의 기록이 바뀌었습니다. 현재 탭을 새로고침한 뒤 다시 수정해 주세요.");
      enabled.current = false; setCloudOn(false);
      return;
    }
    const next = { ...current.current, ...patch };
    try {
      const serialized = JSON.stringify(next);
      localStorage.setItem(localKey(uid), serialized); localStorage.setItem(dirtyKey(uid), "1");
      currentSerialized.current = serialized;
    }
    catch { setMessage("브라우저 저장 공간이 부족합니다. JSON 백업을 내려받아 주세요."); return; }
    current.current = next; setData(next); version.current++;
    if (enabled.current) { setStatus("클라우드 저장 중"); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(saveCloud, 700); }
    else setStatus("이 기기에 저장");
  }, [uid, saveCloud]);

  const exportBackup = useCallback(() => {
    if (!uid) return;
    const prefix = `drawer.private.backup.v1.${uid}.`;
    const previous = Object.keys(localStorage).filter((key) => key.startsWith(prefix)).map((key) => {
      try { return { key, data: JSON.parse(localStorage.getItem(key) || "null") }; } catch { return { key, data: null }; }
    });
    const localRaw = localStorage.getItem(localKey(uid));
    const legacyRaw = localStorage.getItem(legacyKey);
    const blob = new Blob([JSON.stringify({ schema: 1, exportedAt: new Date().toISOString(), data: current.current, previous,
      unreadableLocalRaw: localRaw && !parseSafe(localRaw) ? localRaw : undefined,
      unreadableLegacyRaw: legacyRaw && !parseSafe(legacyRaw) ? legacyRaw : undefined,
    }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = `drawer-private-${new Date().toISOString().slice(0, 10)}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [uid]);

  const importBackup = useCallback(async (file: File) => {
    if (!uid) return;
    try {
      const raw = JSON.parse(await file.text()) as { schema?: number; data?: unknown };
      const incoming = raw.schema === 1 ? parse(raw.data) : null;
      if (!incoming) throw new Error("백업 파일 형식이 올바르지 않습니다.");
      if (hasData(current.current) && !window.confirm("현재 기록은 기기에 별도 보관합니다. 백업 파일의 기록으로 바꾸시겠습니까?")) return;
      preserve(uid, "import-before", current.current);
      enabled.current = false; setCloudOn(false); localStorage.setItem(enabledKey(uid), "0");
      setChoice(null); update(incoming);
      setMessage("백업을 가져왔습니다. 클라우드 연결은 다시 선택해 주세요.");
    } catch (error) { setMessage((error as Error).message); }
  }, [uid, update]);

  const connect = useCallback(async () => {
    if (!uid || !firebaseApp()) { setMessage("Firebase 연결 설정이 없습니다."); return; }
    setBusy(true);
    try {
      const snap = await getDocFromServer(cloudRef(uid));
      const remote = snap.exists() ? parse(snap.data().data) : EMPTY;
      if (!remote) throw new Error("클라우드 기록 형식이 올바르지 않습니다.");
      const remoteRevision = snap.exists() ? Number(snap.data().revision) || 0 : 0;
      setChoice({ revision: remoteRevision, remote, exists: snap.exists() });
      setMessage(hasData(remote) && hasData(current.current) && !same(remote, current.current)
        ? "두 기록이 다릅니다. JSON 백업 후 사용할 기록을 선택해 주세요."
        : "클라우드에 저장할지, 클라우드 기록을 가져올지 선택해 주세요.");
    } catch (error) { setMessage(`클라우드 확인 실패: ${(error as Error).message}. 로컬 기록은 보존됩니다.`); }
    finally { setBusy(false); }
  }, [uid]);

  const choose = useCallback(async (source: "local" | "cloud") => {
    if (!uid || !choice || !firebaseApp()) return;
    setBusy(true);
    const atVersion = version.current;
    try {
      if (localStorage.getItem(localKey(uid)) !== currentSerialized.current)
        throw new Error("다른 탭에서 이 기기의 기록이 바뀌었습니다. 새로고침 후 다시 확인해 주세요.");
      if (source === "local") {
        const payload = current.current;
        const serialized = JSON.stringify(payload);
        localStorage.setItem(localKey(uid), serialized);
        localStorage.setItem(dirtyKey(uid), "1");
        currentSerialized.current = serialized;
        if (choice.exists) preserve(uid, "cloud-before", choice.remote);
        const next = await runTransaction(getFirestore(firebaseApp()!), async (tx) => {
          const ref = cloudRef(uid); const snap = await tx.get(ref);
          const actual = snap.exists() ? Number(snap.data().revision) || 0 : 0;
          if (actual !== choice.revision) throw new Error("클라우드가 방금 변경되었습니다. 다시 확인해 주세요.");
          tx.set(ref, { schema: 1, revision: actual + 1, data: payload, updatedAt: serverTimestamp() });
          return actual + 1;
        });
        revision.current = next;
        if (version.current !== atVersion)
          throw new Error("연결 중 이 기기의 기록이 바뀌었습니다. 새 기록을 보존했으니 클라우드 기록을 다시 확인해 주세요.");
      } else {
        const snap = await getDocFromServer(cloudRef(uid));
        const actual = snap.exists() ? Number(snap.data().revision) || 0 : 0;
        if (actual !== choice.revision) throw new Error("클라우드가 방금 변경되었습니다. 다시 확인해 주세요.");
        if (version.current !== atVersion || localStorage.getItem(localKey(uid)) !== currentSerialized.current)
          throw new Error("연결 중 이 기기의 기록이 바뀌었습니다. 새로고침 후 다시 확인해 주세요.");
        preserve(uid, "local-before", current.current);
        const remote = snap.exists() ? parse(snap.data().data) : EMPTY;
        if (!remote) throw new Error("클라우드 기록 형식이 올바르지 않습니다.");
        const serialized = JSON.stringify(remote);
        localStorage.setItem(localKey(uid), serialized);
        current.current = remote; currentSerialized.current = serialized; setData(remote);
        revision.current = actual;
      }
      localStorage.setItem(revisionKey(uid), String(revision.current));
      localStorage.removeItem(dirtyKey(uid)); localStorage.setItem(enabledKey(uid), "1");
      enabled.current = true; setCloudOn(true); setChoice(null); setStatus("클라우드 동기화 완료"); setMessage("클라우드 연결이 완료되었습니다.");
    } catch (error) { setMessage(`${(error as Error).message} 로컬 기록은 보존됩니다.`); }
    finally { setBusy(false); }
  }, [uid, choice]);

  return { data, status, message, choice, busy, update, exportBackup, importBackup, connect, choose };
}

function parseSafe(raw: string): PrivateData | null { try { return parse(JSON.parse(raw)); } catch { return null; } }

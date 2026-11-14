"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { FONTS, defaultSlot, type Align, type SlotKey, type Theme } from "@/lib/site";

type SlotState = { url: string; w: number; h: number; fx: number; fy: number; custom: boolean };
type Ctx = {
  theme: Theme; setTheme: (t: Theme) => void;
  align: Align; setAlign: (a: Align) => void;
  fonts: { t: string; b: string }; setFonts: (f: { t: string; b: string }) => void;
  slot: (k: SlotKey) => SlotState;
  setSlotFile: (k: SlotKey, f: File) => Promise<void>;
  setFocus: (k: SlotKey, fx: number, fy: number) => void;
  resetSlot: (k: SlotKey) => void;
  open: boolean; setOpen: (o: boolean) => void;
};
const C = createContext<Ctx | null>(null);
export const useSettings = () => useContext(C)!;

/* Photos chosen in the settings panel stay in this browser (IndexedDB) until the admin upload to Firebase Storage is wired. */
const DB = "travel-drawer", STORE = "slots";
function idb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(STORE); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
}
async function idbPut(k: string, v: unknown) { const d = await idb(); return new Promise<void>((res, rej) => { const t = d.transaction(STORE, "readwrite"); t.objectStore(STORE).put(v, k); t.oncomplete = () => res(); t.onerror = () => rej(t.error); }); }
async function idbGet<T>(k: string): Promise<T | undefined> { const d = await idb(); return new Promise((res, rej) => { const r = d.transaction(STORE).objectStore(STORE).get(k); r.onsuccess = () => res(r.result as T); r.onerror = () => rej(r.error); }); }
async function idbDel(k: string) { const d = await idb(); return new Promise<void>((res) => { const t = d.transaction(STORE, "readwrite"); t.objectStore(STORE).delete(k); t.oncomplete = () => res(); }); }

const KEYS: SlotKey[] = ["hero", "archive", "footer"];
const famOf = (id: string) => (FONTS.find((f) => f.id === id) ?? FONTS[0]).family;
function load<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } }
function save(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

export default function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeS] = useState<Theme>("dark");
  const [align, setAlignS] = useState<Align>("center");
  const [fonts, setFontsS] = useState({ t: "pre", b: "pre" });
  const [custom, setCustom] = useState<Partial<Record<SlotKey, { url: string; w: number; h: number }>>>({});
  const [focus, setFocusS] = useState<Partial<Record<SlotKey, [number, number]>>>({});
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = document.documentElement.dataset.theme === "light" ? "light" : "dark";
    setThemeS(t); setAlignS(load<Align>("td-align", "center")); setFontsS(load("td-fonts", { t: "pre", b: "pre" })); setFocusS(load("td-focus", {}));
    KEYS.forEach(async (k) => {
      try {
        const rec = await idbGet<{ blob: Blob; w: number; h: number }>(k);
        if (rec) setCustom((c) => ({ ...c, [k]: { url: URL.createObjectURL(rec.blob), w: rec.w, h: rec.h } }));
      } catch {}
    });
  }, []);
  useEffect(() => {
    const r = document.documentElement.style; r.setProperty("--tf", famOf(fonts.t)); r.setProperty("--bf", famOf(fonts.b));
  }, [fonts]);

  const setTheme = useCallback((t: Theme) => { setThemeS(t); document.documentElement.dataset.theme = t; save("td-theme", t); }, []);
  const setAlign = useCallback((a: Align) => { setAlignS(a); document.documentElement.dataset.align = a; save("td-align", a); }, []);
  const setFonts = useCallback((f: { t: string; b: string }) => { setFontsS(f); save("td-fonts", f); }, []);
  const setFocus = useCallback((k: SlotKey, fx: number, fy: number) => { setFocusS((s) => { const n = { ...s, [k]: [fx, fy] as [number, number] }; save("td-focus", n); return n; }); }, []);
  const setSlotFile = useCallback(async (k: SlotKey, f: File) => {
    const url = URL.createObjectURL(f);
    const { w, h } = await new Promise<{ w: number; h: number }>((res, rej) => { const im = new Image(); im.onload = () => res({ w: im.naturalWidth, h: im.naturalHeight }); im.onerror = rej; im.src = url; });
    setCustom((c) => ({ ...c, [k]: { url, w, h } })); setFocus(k, 50, 50);
    try { await idbPut(k, { blob: f, w, h }); } catch {}
  }, [setFocus]);
  const resetSlot = useCallback((k: SlotKey) => { setCustom((c) => { const n = { ...c }; delete n[k]; return n; }); setFocus(k, 50, 50); idbDel(k).catch(() => {}); }, [setFocus]);
  const slot = useCallback((k: SlotKey): SlotState => {
    const c = custom[k], f = focus[k] ?? [50, 50];
    return c ? { ...c, fx: f[0], fy: f[1], custom: true } : { url: defaultSlot(k, theme), w: 2400, h: k === "archive" ? 1600 : 1350, fx: f[0], fy: f[1], custom: false };
  }, [custom, focus, theme]);

  const v = useMemo(() => ({ theme, setTheme, align, setAlign, fonts, setFonts, slot, setSlotFile, setFocus, resetSlot, open, setOpen }), [theme, setTheme, align, setAlign, fonts, setFonts, slot, setSlotFile, setFocus, resetSlot, open]);
  return <C.Provider value={v}>{children}</C.Provider>;
}

/** Background photo for a slot, faded in when loaded. */
export function SlotImage({ k, className }: { k: SlotKey; className?: string }) {
  const { slot } = useSettings();
  const s = slot(k);
  const [loaded, setLoaded] = useState("");
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={(className ?? "") + " slot" + (loaded === s.url ? " on" : "")} src={s.url} alt="" aria-hidden="true"
      style={{ objectPosition: `${s.fx}% ${s.fy}%` }}
      onLoad={() => setLoaded(s.url)} ref={(el) => { if (el && el.complete && el.naturalWidth && loaded !== s.url) setLoaded(s.url); }} />
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import { FONTS, SLOTS, type SlotKey } from "@/lib/site";
import { useSettings } from "./SettingsProvider";

function verdict(k: SlotKey, w: number, h: number, custom: boolean) {
  const d = SLOTS[k];
  if (!custom) return [{ ok: false, t: `지금은 코드로 그린 샘플 그림입니다. 실제 사진은 ${d.rec} 권장입니다.` }];
  const out: { ok: boolean; t: string }[] = [];
  out.push(w >= d.min[0] && h >= d.min[1]
    ? { ok: true, t: `크기 충분 (${w}×${h})` }
    : { ok: false, t: `해상도가 작습니다 (${w}×${h}). 큰 화면에서 흐려질 수 있어요. 최소 ${d.min[0]}×${d.min[1]} 이상을 권장합니다.` });
  const r = w / h, diff = Math.abs(r - d.ratio) / d.ratio;
  if (diff < 0.06) out.push({ ok: true, t: `화면비 적합 (거의 ${d.ratioLabel})` });
  else if (r > d.ratio) out.push({ ok: false, t: `사진이 더 가로로 깁니다. 좌우가 약 ${Math.round((1 - d.ratio / r) * 100)}% 잘려요. 미리보기를 눌러 보일 위치를 정하세요.` });
  else out.push({ ok: false, t: `사진이 더 세로로 깁니다. 위아래가 약 ${Math.round((1 - r / d.ratio) * 100)}% 잘려요. 미리보기를 눌러 보일 위치를 정하세요.` });
  if (r < 1) out.push({ ok: false, t: "세로 사진은 이 자리에 맞지 않습니다. 가로 사진을 권장합니다." });
  return out;
}

export default function Settings() {
  const s = useSettings();
  const [tab, setTab] = useState<"look" | "photo" | "font">("look");
  const closeRef = useRef<HTMLButtonElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    if (s.open) { opener.current = document.activeElement; setTimeout(() => closeRef.current?.focus(), 50); }
    else if (opener.current instanceof HTMLElement) opener.current.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") s.setOpen(false); };
    if (s.open) document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [s.open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className={"scrim" + (s.open ? " on" : "")} onClick={() => s.setOpen(false)} />
      <aside className={"drawer" + (s.open ? " on" : "")} role="dialog" aria-modal="true" aria-labelledby="dttl" aria-hidden={!s.open} inert={!s.open}>
        <div className="dh"><h2 id="dttl">설정</h2><button ref={closeRef} className="dx" type="button" aria-label="설정 닫기" onClick={() => s.setOpen(false)}>&times;</button></div>
        <div className="dtabs" role="group" aria-label="설정 종류">
          {([["look", "화면 테마"], ["photo", "사진 바꾸기"], ["font", "글꼴"]] as const).map(([k, l]) => (
            <button key={k} type="button" aria-pressed={tab === k} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
        <div className="db">
          {tab === "look" && (
            <div>
              <p className="h">블로그 전체 분위기를 고릅니다. 사진 3곳은 테마마다 다른 기본 그림이 들어갑니다.</p>
              <div className="themes">
                {([["dark", "어두운 산·구름", "큰 사진, 유리 패널, 밤의 분위기"], ["light", "밝은 종이", "베이지 종이, 차분한 낮의 분위기"]] as const).map(([k, n, d]) => (
                  <label key={k} className={"th th-" + k}>
                    <input type="radio" name="theme" checked={s.theme === k} onChange={() => s.setTheme(k)} />
                    <span className="sw" aria-hidden="true" />
                    <b>{n}</b><span>{d}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {tab === "photo" && (
            <div>
              <p className="h">페이지의 큰 사진 3곳을 바꿉니다. 사진을 올리면 크기와 화면비가 맞는지 바로 알려드립니다.</p>
              {(Object.keys(SLOTS) as SlotKey[]).map((k) => {
                const d = SLOTS[k], st = s.slot(k);
                return (
                  <div className="sl" key={k}>
                    <h4>{d.name}</h4>
                    <p className="rec">권장 <b>{d.ratioLabel}</b> · <b>{d.rec}</b> · {d.tip}</p>
                    <button type="button" className="pth" style={{ aspectRatio: String(d.ratio) }} aria-label={d.name + " 보일 위치 정하기"}
                      onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); s.setFocus(k, Math.round(((e.clientX - r.left) / r.width) * 100), Math.round(((e.clientY - r.top) / r.height) * 100)); }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={st.url} alt="" style={{ objectPosition: `${st.fx}% ${st.fy}%` }} />
                      <i style={{ left: st.fx + "%", top: st.fy + "%" }} />
                    </button>
                    <ul className="ver">{verdict(k, st.w, st.h, st.custom).map((v, i) => <li key={i} className={v.ok ? "ok" : "warn"}>{v.ok ? "✓ " : "⚠ "}{v.t}</li>)}</ul>
                    <div className="acts">
                      <label className="pri">사진 올리기<input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) s.setSlotFile(k, f); e.target.value = ""; }} /></label>
                      {st.custom && <button type="button" onClick={() => s.resetSlot(k)}>기본 그림으로</button>}
                    </div>
                  </div>
                );
              })}
              <table className="gt">
                <thead><tr><th>위치</th><th>화면비</th><th>권장 크기</th></tr></thead>
                <tbody>
                  <tr><td>첫 화면</td><td>16:9 가로</td><td>2400×1350</td></tr>
                  <tr><td>글 찾기 배경</td><td>3:2 가로</td><td>2400×1600</td></tr>
                  <tr><td>맨 아래</td><td>16:9 가로</td><td>2400×1350</td></tr>
                  <tr><td>여행기 대표 사진</td><td>4:5 세로 또는 4:3 가로</td><td>1200×1500</td></tr>
                </tbody>
              </table>
              <p className="h" style={{ marginTop: 10 }}>지금은 이 브라우저에만 저장됩니다. Firebase를 연결하면 모든 방문자에게 적용되도록 바꿉니다.</p>
            </div>
          )}
          {tab === "font" && (
            <div>
              <button className="preset" type="button" onClick={() => s.setFonts({ t: "pre", b: "pre" })}>프리텐다드로 모두 바꾸기</button>
              {([["t", "제목 글꼴", "큰 제목, 글 제목, 나라 이름에 쓰입니다."], ["b", "본문 글꼴", "본문, 날짜, 버튼, 안내 문구에 쓰입니다."]] as const).map(([key, h, p]) => (
                <div key={key}>
                  <h3>{h}</h3><p className="h">{p}</p>
                  <div className="fopts" role="radiogroup" aria-label={h}>
                    {FONTS.map((f) => (
                      <label className="fo" key={f.id}>
                        <input type="radio" name={"f" + key} checked={s.fonts[key] === f.id} onChange={() => s.setFonts({ ...s.fonts, [key]: f.id })} />
                        <span className="nm" style={{ fontFamily: f.family }}>{f.name}</span>
                        <span className="sm" style={{ fontFamily: f.family }}>{f.note} · 2025 이탈리아 베네치아</span>
                        <span className={"lc" + ("mine" in f && f.mine ? " mine" : "")}>{f.license}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <div className="live"><b>미리보기</b><p className="lt">이탈리아 5일차 - 베네치아 본섬 당일치기</p><p className="lb">2025.05 · 이탈리아 · 베네치아. 메스트레 숙소에 짐을 풀고, 오후에는 수상버스를 타고 본섬으로 건너갔다.</p></div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

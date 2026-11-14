"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { PostSummary } from "@/lib/types";
import { countryEn } from "@/lib/countries";
import { SITE } from "@/lib/site";
import { SlotImage } from "./SettingsProvider";
import Archive from "./Archive";

const words = SITE.name.split(" ");

export default function Home({ recent, archive, countries }: { recent: PostSummary[]; archive: PostSummary[]; countries: string[] }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.from(".hero h1 .wi", { yPercent: 115, duration: 1.1, stagger: 0.09, ease: "power3.out", delay: 0.2 });
      gsap.from(".hero .eyebrow, .hero-copy p, .hero .btns", { y: 24, opacity: 0, duration: 1, stagger: 0.12, ease: "power2.out", delay: 0.6 });
      gsap.from(".hero-frame .slot", { scale: 1.2, duration: 2.2, ease: "power2.out" });
      gsap.timeline({ scrollTrigger: { trigger: ".hero", start: "top top", end: "+=75%", scrub: 0.6, pin: true } })
        .to(".hero-frame", { clipPath: "inset(9% 6% 9% 6% round 26px)", ease: "none" }, 0)
        .to(".hero-copy", { y: -70, opacity: 0, ease: "none" }, 0)
        .to(".hero .stat, .hero .cue", { opacity: 0, ease: "none" }, 0);
      gsap.from("#recent .sec-h > *", { y: 36, opacity: 0, duration: 0.9, stagger: 0.1, scrollTrigger: { trigger: "#recent", start: "top 78%", once: true } });
      gsap.from(".card", { y: 70, opacity: 0, duration: 1, stagger: 0.12, ease: "power3.out", scrollTrigger: { trigger: ".cards", start: "top 82%", once: true } });
      gsap.fromTo(".f-frame", { clipPath: "inset(12% 8% 0% 8% round 30px)" }, { clipPath: "inset(0% 0% 0% 0% round 30px)", ease: "none", scrollTrigger: { trigger: ".foot", start: "top 95%", end: "top 25%", scrub: 0.6 } });
      gsap.fromTo(".wm", { yPercent: 38, opacity: 0 }, { yPercent: 0, opacity: 1, ease: "none", scrollTrigger: { trigger: ".foot", start: "top 55%", end: "bottom bottom", scrub: 0.6 } });
    }, root);
    let qx: ((v: number) => void) | null = null, qy: ((v: number) => void) | null = null;
    const move = (e: MouseEvent) => { if (window.scrollY > innerHeight * 0.6 || !qx || !qy) return; qx((e.clientX / innerWidth - 0.5) * -26); qy((e.clientY / innerHeight - 0.5) * -16); };
    if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
      qx = gsap.quickTo(".hero-frame .slot", "x", { duration: 1.2, ease: "power3.out" });
      qy = gsap.quickTo(".hero-frame .slot", "y", { duration: 1.2, ease: "power3.out" });
      window.addEventListener("mousemove", move);
    }
    return () => { window.removeEventListener("mousemove", move); ctx.revert(); };
  }, []);

  const marquee = countries.map((c) => <span key={c}>{c}<em>{countryEn(c)}</em></span>);
  return (
    <div ref={root}>
      <section className="hero" id="top">
        <div className="hero-frame"><SlotImage k="hero" /></div>
        <div className="hero-copy">
          <span className="eyebrow">Travel Journal · Since 2006</span>
          <h1 aria-label={SITE.name}>{words.map((w, i) => <span key={i} aria-hidden="true"><span className="w"><span className="wi">{w}</span></span>{i < words.length - 1 ? " " : ""}</span>)}</h1>
          <p>{SITE.tagline}</p>
          <div className="btns"><a className="btn pri" href="#archive">전체 글 찾기 &darr;</a><a className="btn" href="#recent">최근 여행기</a></div>
        </div>
        <div className="stat"><b>{SITE.totalPosts}</b><span>편의 여행 기록</span></div>
        <div className="cue" aria-hidden="true" />
      </section>

      <div className="marq" aria-hidden="true"><div className="mq">{marquee}{marquee}</div></div>

      <section className="sec" id="recent">
        <div className="sec-h"><span className="eyebrow">Recent</span><h2>최근에 다녀온 곳</h2><p>가장 최근에 옮겨 온 여행기입니다. 사진을 누르면 글로 이동합니다.</p></div>
        <div className="cards">
          {recent.map((p) => (
            <Link className="card" href={`/posts/${p.id}`} key={p.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.cover ? <img src={p.cover} alt={p.title} loading="lazy" /> : <span className="ph" />}
              <span className="arrow" aria-hidden="true">&#8599;</span>
              <span className="tx"><small>{p.trip.date.slice(0, 4)} · {countryEn(p.trip.country)} · {p.trip.city}</small><strong>{p.title}</strong><span className="n">사진 {p.photoCount}장</span></span>
            </Link>
          ))}
        </div>
      </section>

      <Archive posts={archive} />

      <footer className="foot">
        <div className="f-frame">
          <SlotImage k="footer" />
          <div className="f-top">
            <div><span className="eyebrow">Next Journey</span><h3>다음 여행도 이 서랍에 차곡차곡 담겠습니다.</h3></div>
            <div className="f-cols"><div><b>둘러보기</b><a href="#recent">최근 여행기</a><a href="#archive">전체 글 찾기</a></div><div><b>예전 블로그</b><a href="https://blog.naver.com/bbae30714" target="_blank" rel="noreferrer">네이버 블로그</a></div></div>
          </div>
          <div className="wm" aria-hidden="true">낡은 서랍속의 추억</div>
        </div>
        <div className="legal"><span>© {SITE.name}</span><span>사진과 글의 저작권은 작성자에게 있습니다.</span></div>
      </footer>
    </div>
  );
}

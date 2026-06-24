"use client";
import { useState } from "react";

// 무릎 꿇은 빨강은 엔드바 제일 왼쪽 아래 고정. 나머지는 왼쪽 끝~오른쪽 끝을 줄지어 오간다.
// 클릭: 걷는 캐릭터=관련 가상학과 말풍선 + 점프 / 빨강=그 자리에서 적당히 커지다 비눗방울+글리터 팡.
const DUR = 34;
const LINE = [
  { src: "/characters/char-purple.png", h: 50, delay: 0 },
  { src: "/characters/char-green.png", h: 48, delay: -2.4 },
  { src: "/characters/char-pink.png", h: 48, delay: -4.8 },
  { src: "/characters/char-yellow.png", h: 44, delay: -7.2 },
  { src: "/characters/char-blue.png", h: 44, delay: -9.6 },
];
// 클릭 시 말풍선에 랜덤으로 표시되는 가상학과
const DEPTS = ["블록체인융합학과", "클라우드융합학과", "사이버보안융합학과"];

const GLIT_COLORS = ["#ff5ca8", "#ffd24c", "#7ee7ff", "#a78bfa", "#7ef2c7", "#ffffff"];
interface Glit { tx: number; ty: number; color: string; size: number; delay: number; }
interface Bubble { bx: number; by: number; size: number; delay: number; dur: number; }

export default function FooterWalkers() {
  const [jumpSet, setJumpSet] = useState<Set<number>>(new Set());
  const [bubbles, setBubbles] = useState<Record<number, string>>({});
  const [blast, setBlast] = useState<{ glits: Glit[]; bubbles: Bubble[] } | null>(null);

  const clickWalker = (i: number) => {
    const dept = DEPTS[Math.floor(Math.random() * DEPTS.length)];
    setJumpSet((s) => new Set(s).add(i));
    setBubbles((b) => ({ ...b, [i]: dept }));
    window.setTimeout(() => setJumpSet((s) => { const n = new Set(s); n.delete(i); return n; }), 680);
    window.setTimeout(() => setBubbles((b) => { const n = { ...b }; delete n[i]; return n; }), 2600);
  };

  const popRed = () => {
    if (blast) return;
    const ng = 34;
    const glits: Glit[] = Array.from({ length: ng }, (_, k) => {
      const ang = Math.PI * (0.03 + 0.94 * (k / ng));
      const dist = 150 + Math.random() * 340;
      return { tx: Math.cos(ang) * dist, ty: -Math.sin(ang) * dist, color: GLIT_COLORS[k % GLIT_COLORS.length], size: 8 + Math.random() * 13, delay: Math.random() * 0.14 };
    });
    const nb = 16;
    const bubbles: Bubble[] = Array.from({ length: nb }, () => ({
      bx: 40 + Math.random() * 560, by: -(110 + Math.random() * 420), size: 24 + Math.random() * 84, delay: Math.random() * 0.25, dur: 1.0 + Math.random() * 0.7,
    }));
    setBlast({ glits, bubbles });
    window.setTimeout(() => setBlast(null), 1700);
  };

  return (
    <div className="footer-walkers" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={`walker-still ${blast ? "red-hidden" : ""}`} src="/characters/char-red.png" alt="" onClick={popRed} />

      {LINE.map((c, i) => (
        <div key={i} className="walker" style={{ height: c.h, animationDuration: `${DUR}s`, animationDelay: `${c.delay}s` }}>
          <div className="walker-face" style={{ animationDuration: `${DUR}s`, animationDelay: `${c.delay}s` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={c.src}
              alt=""
              className={jumpSet.has(i) ? "jump" : ""}
              style={{ animationDelay: jumpSet.has(i) ? "0s" : `${-(i % 3) * 0.18}s` }}
              onClick={() => clickWalker(i)}
            />
          </div>
          {bubbles[i] && <span className="walker-bubble">{bubbles[i]}</span>}
        </div>
      ))}

      {/* 빨강 클릭: 그 자리에서 적당히 커지다 비눗방울+글리터 팡 */}
      {blast && (
        <div className="red-blast">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="red-blast-img" src="/characters/char-red.png" alt="" />
          {blast.bubbles.map((b, k) => (
            <span key={`b${k}`} className="soap-bubble" style={{ ["--bx" as string]: `${b.bx}px`, ["--by" as string]: `${b.by}px`, width: b.size, height: b.size, animationDelay: `${0.6 + b.delay}s`, animationDuration: `${b.dur}s` }} />
          ))}
          {blast.glits.map((g, k) => (
            <span key={`g${k}`} className="glit" style={{ ["--tx" as string]: `${g.tx}px`, ["--ty" as string]: `${g.ty}px`, width: g.size, height: g.size, background: g.color, animationDelay: `${0.62 + g.delay}s` }} />
          ))}
        </div>
      )}
    </div>
  );
}

"use client";
import { useState } from "react";

// 무릎 꿇은 빨강은 왼쪽 고정. 나머지는 줄지어 걷되, 빨강 바로 앞/오른쪽 끝에서 하나씩 유턴.
// 클릭 상호작용: 걷는 캐릭터=점프(1회), 빨강=화면 절반까지 커지다 글리터와 함께 비눗방울처럼 팡.
const DUR = 34;
const LINE = [
  { src: "/characters/char-purple.png", h: 50, delay: 0 },
  { src: "/characters/char-green.png", h: 48, delay: -2.4 },
  { src: "/characters/char-pink.png", h: 48, delay: -4.8 },
  { src: "/characters/char-yellow.png", h: 44, delay: -7.2 },
  { src: "/characters/char-blue.png", h: 44, delay: -9.6 },
];

const GLIT_COLORS = ["#ff5ca8", "#ffd24c", "#7ee7ff", "#a78bfa", "#7ef2c7", "#ffffff"];

interface Glit { tx: number; ty: number; color: string; size: number; delay: number; }
interface Bubble { bx: number; by: number; size: number; delay: number; dur: number; }

export default function FooterWalkers() {
  const [jumping, setJumping] = useState<number | null>(null);
  const [blast, setBlast] = useState<{ glits: Glit[]; bubbles: Bubble[] } | null>(null);

  const jump = (i: number) => {
    setJumping(i);
    window.setTimeout(() => setJumping((j) => (j === i ? null : j)), 650);
  };
  const popRed = () => {
    if (blast) return;
    const ng = 34;
    // 코너에서 위쪽 반구로 퍼지는 별 글리터
    const glits: Glit[] = Array.from({ length: ng }, (_, k) => {
      const ang = Math.PI * (0.03 + 0.94 * (k / ng)); // 0..π (위쪽 부채꼴)
      const dist = 160 + Math.random() * 360;
      return {
        tx: Math.cos(ang) * dist,
        ty: -Math.sin(ang) * dist,
        color: GLIT_COLORS[k % GLIT_COLORS.length],
        size: 8 + Math.random() * 13,
        delay: Math.random() * 0.14,
      };
    });
    // 무지갯빛 비눗방울이 위/바깥으로 떠오르며 팡
    const nb = 16;
    const bubbles: Bubble[] = Array.from({ length: nb }, () => ({
      bx: 60 + Math.random() * 620,
      by: -(120 + Math.random() * 460),
      size: 26 + Math.random() * 90,
      delay: Math.random() * 0.25,
      dur: 1.0 + Math.random() * 0.7,
    }));
    setBlast({ glits, bubbles });
    window.setTimeout(() => setBlast(null), 2000);
  };

  return (
    <div className="footer-walkers" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={`walker-still ${blast ? "red-hidden" : ""}`}
        src="/characters/char-red.png"
        alt=""
        onClick={popRed}
      />
      {LINE.map((c, i) => (
        <div key={i} className="walker" style={{ height: c.h, animationDuration: `${DUR}s`, animationDelay: `${c.delay}s` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={c.src}
            alt=""
            className={jumping === i ? "jump" : ""}
            style={{ animationDelay: jumping === i ? "0s" : `${-(i % 3) * 0.18}s` }}
            onClick={() => jump(i)}
          />
        </div>
      ))}

      {/* 빨강 클릭: 그 자리에서 60배로 커지다 비눗방울+글리터와 함께 팡 */}
      {blast && (
        <div className="red-blast">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="red-blast-img" src="/characters/char-red.png" alt="" />
          {blast.bubbles.map((b, k) => (
            <span
              key={`b${k}`}
              className="soap-bubble"
              style={{
                ["--bx" as string]: `${b.bx}px`,
                ["--by" as string]: `${b.by}px`,
                width: b.size,
                height: b.size,
                animationDelay: `${0.58 + b.delay}s`,
                animationDuration: `${b.dur}s`,
              }}
            />
          ))}
          {blast.glits.map((g, k) => (
            <span
              key={`g${k}`}
              className="glit"
              style={{
                ["--tx" as string]: `${g.tx}px`,
                ["--ty" as string]: `${g.ty}px`,
                width: g.size,
                height: g.size,
                background: g.color,
                animationDelay: `${0.6 + g.delay}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

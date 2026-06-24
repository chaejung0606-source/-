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

export default function FooterWalkers() {
  const [jumping, setJumping] = useState<number | null>(null);
  const [blast, setBlast] = useState<Glit[] | null>(null);

  const jump = (i: number) => {
    setJumping(i);
    window.setTimeout(() => setJumping((j) => (j === i ? null : j)), 650);
  };
  const popRed = () => {
    if (blast) return;
    const n = 30;
    const glits: Glit[] = Array.from({ length: n }, (_, k) => {
      const ang = (k / n) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 140 + Math.random() * 260;
      return {
        tx: Math.cos(ang) * dist,
        ty: Math.sin(ang) * dist,
        color: GLIT_COLORS[k % GLIT_COLORS.length],
        size: 8 + Math.random() * 12,
        delay: Math.random() * 0.12,
      };
    });
    setBlast(glits);
    window.setTimeout(() => setBlast(null), 1700);
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

      {/* 빨강 클릭: 화면 절반까지 커지다 글리터와 함께 팡 */}
      {blast && (
        <div className="red-blast">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="red-blast-img" src="/characters/char-red.png" alt="" />
          {blast.map((g, k) => (
            <span
              key={k}
              className="glit"
              style={{
                ["--tx" as string]: `${g.tx}px`,
                ["--ty" as string]: `${g.ty}px`,
                width: g.size,
                height: g.size,
                background: g.color,
                animationDelay: `${0.62 + g.delay}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

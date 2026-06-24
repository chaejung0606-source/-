"use client";
import { useState } from "react";

// 무릎 꿇은 빨강은 왼쪽 고정. 나머지는 줄지어 걷되, 빨강 바로 앞/오른쪽 끝에서 하나씩 유턴.
// 클릭 상호작용: 걷는 캐릭터=점프(1회), 빨강=점점 커지다 팡 터짐(잠시 후 재등장).
const DUR = 34;
const LINE = [
  { src: "/characters/char-purple.png", h: 50, delay: 0 },
  { src: "/characters/char-green.png", h: 48, delay: -2.4 },
  { src: "/characters/char-pink.png", h: 48, delay: -4.8 },
  { src: "/characters/char-yellow.png", h: 44, delay: -7.2 },
  { src: "/characters/char-blue.png", h: 44, delay: -9.6 },
];

export default function FooterWalkers() {
  const [jumping, setJumping] = useState<number | null>(null);
  const [redPop, setRedPop] = useState(false);

  const jump = (i: number) => {
    setJumping(i);
    window.setTimeout(() => setJumping((j) => (j === i ? null : j)), 650);
  };
  const popRed = () => {
    if (redPop) return;
    setRedPop(true);
    window.setTimeout(() => setRedPop(false), 1500); // 팡 터진 뒤 재등장
  };

  return (
    <div className="footer-walkers" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={`walker-still ${redPop ? "red-pop" : ""}`}
        src="/characters/char-red.png"
        alt=""
        onClick={popRed}
      />
      {redPop && <span className="pop-burst" />}
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
    </div>
  );
}

"use client";

// 사업단 캐릭터들이 엔드바(푸터) 경계선을 능선처럼 좌우로 걸어다니는 효과
const WALKERS = [
  { src: "/characters/char-green.png", dur: 19, delay: -1, h: 50 },
  { src: "/characters/char-purple.png", dur: 24, delay: -6, h: 52 },
  { src: "/characters/char-red.png", dur: 17, delay: -11, h: 48 },
  { src: "/characters/char-yellow.png", dur: 27, delay: -3, h: 46 },
  { src: "/characters/char-pink.png", dur: 21, delay: -15, h: 50 },
  { src: "/characters/char-blue.png", dur: 25, delay: -20, h: 46 },
];

export default function FooterWalkers() {
  return (
    <div className="footer-walkers" aria-hidden="true">
      {WALKERS.map((w, i) => (
        <div key={i} className="walker" style={{ animationDuration: `${w.dur}s`, animationDelay: `${w.delay}s`, height: w.h }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={w.src} alt="" style={{ animationDelay: `${(i % 3) * -0.18}s` }} />
        </div>
      ))}
    </div>
  );
}

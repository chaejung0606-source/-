"use client";

// 무릎 꿇은 빨강은 왼쪽 고정. 나머지는 줄지어 걷되, 끝(오른쪽 끝/빨강 앞)에서 하나씩 유턴.
// 같은 주기·서로 다른 지연으로 한 줄을 이루며 순차적으로 방향을 바꾼다(겹쳐도 됨).
const DUR = 34;
const LINE = [
  { src: "/characters/char-purple.png", h: 50, delay: 0 },
  { src: "/characters/char-green.png", h: 48, delay: -2.4 },
  { src: "/characters/char-pink.png", h: 48, delay: -4.8 },
  { src: "/characters/char-yellow.png", h: 44, delay: -7.2 },
  { src: "/characters/char-blue.png", h: 44, delay: -9.6 },
];

export default function FooterWalkers() {
  return (
    <div className="footer-walkers" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="walker-still" src="/characters/char-red.png" alt="" />
      {LINE.map((c, i) => (
        <div key={i} className="walker" style={{ height: c.h, animationDuration: `${DUR}s`, animationDelay: `${c.delay}s` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.src} alt="" style={{ animationDelay: `${-(i % 3) * 0.18}s` }} />
        </div>
      ))}
    </div>
  );
}

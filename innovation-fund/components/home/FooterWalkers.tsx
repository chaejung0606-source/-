"use client";

// 무릎 꿇은 빨강 캐릭터는 왼쪽에 가만히, 나머지는 줄지어(간격 두고) 천천히 좌우 이동.
// 빨강 앞에서 유턴하며, 진행 방향을 바라보도록 좌우 반전.
const LINE = [
  { src: "/characters/char-purple.png", h: 50 },
  { src: "/characters/char-green.png", h: 48 },
  { src: "/characters/char-pink.png", h: 48 },
  { src: "/characters/char-yellow.png", h: 44 },
  { src: "/characters/char-blue.png", h: 44 },
];

export default function FooterWalkers() {
  return (
    <div className="footer-walkers" aria-hidden="true">
      {/* 무릎 꿇은 캐릭터: 왼쪽 고정 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="walker-still" src="/characters/char-red.png" alt="" />
      {/* 나머지: 한 줄로 함께 이동 */}
      <div className="walk-line">
        {LINE.map((c, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} className="walk-member" src={c.src} alt="" style={{ height: c.h }} />
        ))}
      </div>
    </div>
  );
}

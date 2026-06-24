"use client";

// 글자 뒤~바로 밑 영역에 크고 작은 뭉게구름 여러 개 + 옅은 하늘 배경.
// 원래 배경과의 경계는 그라데이션/마스크로 자연스럽게 섞인다.
const CLOUDS = [
  { top: "6%", left: "3%", s: 1.05, drift: 24, dur: 27, delay: 0 },
  { top: "54%", left: "11%", s: 0.7, drift: -18, dur: 33, delay: -6 },
  { top: "16%", left: "25%", s: 0.55, drift: 16, dur: 30, delay: -12 },
  { top: "62%", left: "42%", s: 0.85, drift: 20, dur: 35, delay: -3 },
  { top: "8%", left: "55%", s: 1.3, drift: 22, dur: 29, delay: -9 },
  { top: "58%", left: "70%", s: 0.65, drift: -24, dur: 31, delay: -14 },
  { top: "18%", left: "80%", s: 0.95, drift: -16, dur: 34, delay: -5 },
  { top: "44%", left: "90%", s: 0.5, drift: 14, dur: 28, delay: -10 },
];

export default function HeroClouds() {
  return (
    <div className="hero-sky" aria-hidden="true">
      <div className="sky-bg" />
      {CLOUDS.map((c, i) => (
        <div
          key={i}
          className="cloud"
          style={{
            top: c.top,
            left: c.left,
            ["--s" as string]: String(c.s),
            ["--drift" as string]: `${c.drift}px`,
            animationDuration: `${c.dur}s`,
            animationDelay: `${c.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

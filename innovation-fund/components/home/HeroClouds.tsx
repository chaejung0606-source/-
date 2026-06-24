"use client";

// 히어로 문구 뒤에서 뭉실뭉실 떠다니는 뭉게구름 (CSS 동적 애니메이션)
const CLOUDS = [
  { top: "6%", left: "4%", s: 1.15, drift: 28, dur: 27, delay: 0 },
  { top: "50%", left: "16%", s: 0.8, drift: -22, dur: 33, delay: -6 },
  { top: "12%", left: "60%", s: 1.3, drift: 24, dur: 30, delay: -3 },
  { top: "58%", left: "70%", s: 0.95, drift: -30, dur: 37, delay: -11 },
  { top: "34%", left: "40%", s: 1.05, drift: 18, dur: 29, delay: -15 },
  { top: "2%", left: "84%", s: 0.7, drift: -16, dur: 34, delay: -8 },
];

export default function HeroClouds() {
  return (
    <div className="hero-clouds" aria-hidden="true">
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

"use client";

// 첨부 이미지처럼 커다란 뭉게구름 하나를 중심으로, 부드러운 하늘 배경.
// 하늘/구름과 원래 배경의 경계는 완전 그라데이션으로 자연스럽게 섞인다.

// 큰 구름을 이루는 뭉치(원)들 — 460 x 240 박스 기준 (중심 x, 중심 y, 반지름)
const PUFFS = [
  { x: 230, y: 152, r: 96 },
  { x: 112, y: 168, r: 72 },
  { x: 350, y: 168, r: 74 },
  { x: 166, y: 112, r: 74 },
  { x: 270, y: 92, r: 84 },
  { x: 360, y: 126, r: 62 },
  { x: 80, y: 144, r: 54 },
  { x: 416, y: 152, r: 50 },
];

// 옆쪽 자연스러운 작은 구름
const MINI = [
  { top: "16%", left: "5%", s: 0.55, dur: 30, delay: 0 },
  { top: "24%", left: "84%", s: 0.46, dur: 34, delay: -9 },
];

export default function HeroClouds() {
  return (
    <div className="hero-sky" aria-hidden="true">
      <div className="sky-bg" />
      <div className="big-cloud">
        <span className="cloud-base" />
        {PUFFS.map((p, i) => (
          <span key={i} className="puff" style={{ left: p.x - p.r, top: p.y - p.r, width: p.r * 2, height: p.r * 2 }} />
        ))}
      </div>
      {MINI.map((c, i) => (
        <div
          key={i}
          className="mini-cloud"
          style={{ top: c.top, left: c.left, ["--s" as string]: String(c.s), animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s` }}
        />
      ))}
    </div>
  );
}

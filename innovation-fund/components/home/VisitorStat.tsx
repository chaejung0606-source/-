"use client";
import { useEffect, useState } from "react";

type Stat = { ready: boolean; today?: number; total?: number; spark?: number[] };

// 엔드바(푸터) 일일 방문자 카드 — 오늘/누적 + 최근 7일 추세 스파크라인.
// visit_stats 미설치(ready:false) 시 아무것도 표시하지 않음.
export default function VisitorStat() {
  const [s, setS] = useState<Stat | null>(null);
  useEffect(() => {
    fetch("/api/visits", { cache: "no-store" }).then((r) => r.json()).then(setS).catch(() => {});
  }, []);
  if (!s || !s.ready) return null;

  const spark = s.spark && s.spark.length ? s.spark : [0];
  const max = Math.max(1, ...spark);
  const W = 62, H = 22, n = spark.length;
  const pts = spark.map((v, i) => `${(i / Math.max(1, n - 1)) * W},${H - (v / max) * (H - 3) - 1}`);
  const line = pts.join(" ");
  const lastX = W, lastY = H - (spark[n - 1] / max) * (H - 3) - 1;

  return (
    <div className="inline-flex items-stretch gap-3 rounded-2xl border border-indigo-100/70 bg-white/70 px-4 py-2 shadow-sm backdrop-blur">
      <div className="flex flex-col justify-center">
        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">오늘 방문</span>
        <span className="text-lg font-extrabold leading-none holo-text tabular-nums">{(s.today || 0).toLocaleString()}</span>
      </div>
      <div className="w-px bg-gray-200/70" />
      <div className="flex flex-col justify-center">
        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">누적</span>
        <span className="text-lg font-extrabold leading-none text-gray-700 tabular-nums">{(s.total || 0).toLocaleString()}</span>
      </div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="self-end mb-0.5" aria-hidden="true">
        <defs>
          <linearGradient id="vspark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8b5cf6" stopOpacity="0.5" />
            <stop offset="1" stopColor="#8b5cf6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,${H} ${line} ${W},${H}`} fill="url(#vspark)" />
        <polyline points={line} fill="none" stroke="#8b5cf6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={lastX} cy={lastY} r="2.1" fill="#ec4899" />
      </svg>
    </div>
  );
}

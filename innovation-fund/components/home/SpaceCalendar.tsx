"use client";
import { useEffect, useState } from "react";

// 공간대여 구글 캘린더(보기 전용) 임베드 — 여기서 추가·수정 불가
export default function SpaceCalendar() {
  const [url, setUrl] = useState("");
  useEffect(() => {
    fetch("/api/space-rental").then((r) => r.json()).then((d) => setUrl(d.calendarEmbedUrl || "")).catch(() => {});
  }, []);
  if (!url) return null;
  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-2 text-sm font-semibold text-gray-700 border-b border-gray-100">📅 공간대여 예약 현황 (보기 전용)</div>
      <iframe src={url} title="공간대여 캘린더" className="w-full" style={{ height: 460, border: 0 }} />
    </div>
  );
}

"use client";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { textMatchesSpace } from "@/lib/space-rental";

// 구글 캘린더(공개 iCal) + 접수된 신청을 반영해 만든 플랫폼 자체 월간 캘린더.
// 어느 장소가 어느 시간에 이미 대여 신청되었는지 보여준다. (보기 전용)
// 공간별 색상 + 공간 필터: 필터 칩은 예약 유무와 무관하게 '대여 가능 공간' 전체를 항상 표시한다.
interface Booked { start: number; end: number; label: string; source: "calendar" | "request"; spaceName?: string; location?: string }
interface SpaceInfo { id: string; name: string }

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const pad = (n: number) => String(n).padStart(2, "0");
// YYYYMMDDHHmm 정수 → 시:분
const hhmm = (n: number) => `${pad(Math.floor((n % 10000) / 100))}:${pad(n % 100)}`;
const dayNumOf = (n: number) => Math.floor(n / 10000); // → YYYYMMDD

// 공간별 칩 색상 (Tailwind 정적 클래스 · 공간 순서대로 순환)
const PALETTE = [
  { chip: "bg-indigo-100 text-indigo-700", dot: "#6366f1" },
  { chip: "bg-teal-100 text-teal-700", dot: "#0d9488" },
  { chip: "bg-violet-100 text-violet-700", dot: "#8b5cf6" },
  { chip: "bg-amber-100 text-amber-800", dot: "#d97706" },
  { chip: "bg-rose-100 text-rose-700", dot: "#e11d48" },
  { chip: "bg-sky-100 text-sky-700", dot: "#0284c7" },
  { chip: "bg-emerald-100 text-emerald-700", dot: "#059669" },
  { chip: "bg-fuchsia-100 text-fuchsia-700", dot: "#c026d3" },
  { chip: "bg-orange-100 text-orange-700", dot: "#ea580c" },
  { chip: "bg-cyan-100 text-cyan-700", dot: "#0891b2" },
];
const ETC = { chip: "bg-gray-100 text-gray-600", dot: "#9ca3af" }; // 공간 미매칭(외부 일정 등)
const ETC_KEY = "__etc__";

export default function SpaceCalendar() {
  const [booked, setBooked] = useState<Booked[]>([]);
  const [spaces, setSpaces] = useState<SpaceInfo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<{ y: number; m: number }>(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [sel, setSel] = useState<number | null>(null); // 선택한 날짜(YYYYMMDD)
  // 꺼진 공간 필터(id 집합) — 기본은 전부 켬
  const [off, setOff] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/space-rental").then((r) => r.json()).then((d) => {
      setBooked(Array.isArray(d.booked) ? d.booked : []);
      setSpaces(Array.isArray(d.spaces) ? d.spaces.map((s: SpaceInfo) => ({ id: s.id, name: s.name })) : []);
    }).catch(() => {}).finally(() => setLoaded(true));
  }, []);

  // 예약 1건 → 공간 인덱스 (접수건은 spaceName 일치, 캘린더 일정은 장소/제목 텍스트 매칭)
  const spaceIdxOf = (b: Booked): number => {
    if (b.spaceName) {
      const i = spaces.findIndex((s) => s.name === b.spaceName || textMatchesSpace(b.spaceName!, s.name));
      if (i >= 0) return i;
    }
    return spaces.findIndex((s) => textMatchesSpace(`${b.label} ${b.location || ""}`, s.name));
  };
  const colorOf = (idx: number) => (idx >= 0 ? PALETTE[idx % PALETTE.length] : ETC);
  const keyOf = (idx: number) => (idx >= 0 ? spaces[idx].id : ETC_KEY);

  const { y, m } = view;
  const first = new Date(y, m, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  // 보고 있는 달에 예약이 1건이라도 있는 공간(키) — 없는 공간의 필터 칩은 비활성 처리
  const activeKeys = useMemo(() => {
    const monthStart = y * 10000 + (m + 1) * 100 + 1;
    const monthEnd = y * 10000 + (m + 1) * 100 + daysInMonth;
    const set = new Set<string>();
    for (const b of booked) {
      const s = dayNumOf(b.start);
      const last = (b.end % 10000 === 0 && dayNumOf(b.end) > s) ? dayNumOf(b.end) - 1 : dayNumOf(b.end);
      if (s <= monthEnd && last >= monthStart) set.add(keyOf(spaceIdxOf(b)));
    }
    return set;
  }, [booked, spaces, y, m, daysInMonth]);

  // 필터 적용된 예약 + 각 날짜(YYYYMMDD)에 걸치는 예약 목록
  const byDay = useMemo(() => {
    const map: Record<number, { b: Booked; idx: number }[]> = {};
    const visible = booked
      .map((b) => ({ b, idx: spaceIdxOf(b) }))
      .filter(({ idx }) => !off.has(keyOf(idx)));
    for (let d = 1; d <= daysInMonth; d++) {
      const key = y * 10000 + (m + 1) * 100 + d;
      const hits = visible.filter(({ b }) => {
        const s = dayNumOf(b.start);
        // 종일 이벤트의 끝(자정)은 배타적 → 마지막 점유일 보정
        const last = (b.end % 10000 === 0 && dayNumOf(b.end) > s) ? dayNumOf(b.end) - 1 : dayNumOf(b.end);
        return s <= key && key <= last;
      }).sort((a, b) => a.b.start - b.b.start);
      if (hits.length) map[key] = hits;
    }
    return map;
  }, [booked, spaces, off, y, m, daysInMonth]);

  const prevMonth = () => setView((v) => v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 });
  const nextMonth = () => setView((v) => v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 });
  const goToday = () => { const d = new Date(); setView({ y: d.getFullYear(), m: d.getMonth() }); };

  const today = new Date();
  const todayKey = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();

  // 예약 1건 표기: 단일일 시간대면 "HH:MM~HH:MM", 여러 날이면 기간 표시
  const slotText = (b: Booked, dayKey: number) => {
    const sDay = dayNumOf(b.start);
    const last = (b.end % 10000 === 0 && dayNumOf(b.end) > sDay) ? dayNumOf(b.end) - 1 : dayNumOf(b.end);
    if (sDay === last) return `${hhmm(b.start)}~${hhmm(b.end)}`;
    if (dayKey === sDay) return `${hhmm(b.start)}~`;
    if (dayKey === last) return `~${hhmm(b.end)}`;
    return "종일";
  };

  const selList = sel != null ? (byDay[sel] || []) : [];

  // 필터 토글 — '전체'는 모두 켬/모두 끔 전환
  const allOn = off.size === 0;
  const toggle = (id: string) => setOff((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleAll = () => setOff(allOn ? new Set([...spaces.map((s) => s.id), ETC_KEY]) : new Set());

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 gap-2 flex-wrap">
        <div className="text-sm font-semibold text-gray-700">📅 공간대여 예약 현황</div>
        <div className="flex items-center gap-1">
          <button onClick={goToday} className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:border-indigo-300">오늘</button>
          <button onClick={prevMonth} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500" title="이전 달"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-bold text-gray-800 w-24 text-center">{y}년 {m + 1}월</span>
          <button onClick={nextMonth} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500" title="다음 달"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      {/* 공간 필터 — 전체 공간 표시하되, 이번 달 예약이 있는 공간만 활성화(없으면 비활성) */}
      {spaces.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap px-4 py-2 border-b border-gray-100 bg-gray-50/50">
          <button onClick={toggleAll}
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition ${allOn ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-gray-200 bg-white text-gray-500"}`}>
            전체
          </button>
          {spaces.map((s, i) => {
            const has = activeKeys.has(s.id);
            const on = has && !off.has(s.id);
            const c = colorOf(i);
            return (
              <button key={s.id} onClick={() => has && toggle(s.id)} disabled={!has}
                title={has ? s.name : `${s.name} — 이번 달 예약 없음`}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-full border inline-flex items-center gap-1.5 transition ${
                  !has ? "border-gray-100 bg-gray-50 text-gray-300 cursor-default"
                  : on ? "border-gray-300 bg-white text-gray-700"
                  : "border-gray-200 bg-gray-100 text-gray-400"}`}>
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: on ? c.dot : "#d1d5db" }} />
                {s.name.split(" (")[0]}
              </button>
            );
          })}
          {activeKeys.has(ETC_KEY) && (
            <button onClick={() => toggle(ETC_KEY)}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-full border inline-flex items-center gap-1.5 transition ${!off.has(ETC_KEY) ? "border-gray-300 bg-white text-gray-700" : "border-gray-200 bg-gray-100 text-gray-400"}`}>
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: !off.has(ETC_KEY) ? ETC.dot : "#d1d5db" }} />
              기타 일정
            </button>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          {/* 요일 */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {WEEKDAYS.map((w, i) => (
              <div key={w} className={`text-center text-xs font-semibold py-1.5 ${i === 0 ? "text-rose-500" : i === 6 ? "text-blue-500" : "text-gray-500"}`}>{w}</div>
            ))}
          </div>
          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7">
            {Array.from({ length: startWeekday }).map((_, i) => <div key={`b${i}`} className="min-h-[92px] border-b border-r border-gray-50" />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d = i + 1;
              const key = y * 10000 + (m + 1) * 100 + d;
              const list = byDay[key] || [];
              const wd = (startWeekday + i) % 7;
              const isToday = key === todayKey;
              return (
                <button
                  key={d}
                  onClick={() => setSel(sel === key ? null : key)}
                  className={`min-h-[92px] border-b border-r border-gray-50 p-1 text-left align-top hover:bg-indigo-50/40 transition ${sel === key ? "bg-indigo-50" : ""}`}
                >
                  <div className={`text-xs font-semibold mb-0.5 flex items-center gap-1 ${wd === 0 ? "text-rose-500" : wd === 6 ? "text-blue-500" : "text-gray-600"}`}>
                    <span className={`${isToday ? "bg-indigo-500 text-white rounded-full w-5 h-5 flex items-center justify-center" : ""}`}>{d}</span>
                  </div>
                  <div className="space-y-0.5">
                    {list.slice(0, 3).map(({ b, idx }, j) => (
                      <div key={j} className={`text-[10px] leading-tight rounded px-1 py-0.5 truncate ${colorOf(idx).chip}`} title={`${slotText(b, key)} · ${b.label}`}>
                        <span className="font-semibold">{slotText(b, key)}</span> {b.label}
                      </div>
                    ))}
                    {list.length > 3 && <div className="text-[10px] text-gray-400 px-1">+{list.length - 3}건</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 선택한 날짜 상세 */}
      {sel != null && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/60">
          <p className="text-xs font-bold text-gray-600 mb-1.5">{Math.floor((sel % 10000) / 100)}월 {sel % 100}일 예약 {selList.length}건</p>
          {selList.length === 0 ? (
            <p className="text-xs text-gray-400">이 날짜에 예약된 건이 없습니다.</p>
          ) : (
            <ul className="space-y-1">
              {selList.map(({ b, idx }, i) => (
                <li key={i} className="text-xs text-gray-700 flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ background: colorOf(idx).dot }} />
                  <span className="font-semibold text-indigo-600 whitespace-nowrap">{slotText(b, sel)}</span>
                  <span className="break-words">{b.label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {loaded && Object.keys(byDay).length === 0 && sel == null && (
        <div className="px-4 py-3 text-xs text-gray-400 border-t border-gray-100">이 달에는 예약된 건이 없습니다. 날짜를 눌러 확인하거나 이전/다음 달을 살펴보세요.</div>
      )}
    </div>
  );
}

"use client";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Program } from "@/lib/programs";
import { isPhaseEnabled, type ApplyPhase } from "@/lib/programs";
import type { TypePeriods } from "@/lib/type-periods";
import { PERIOD_TYPES } from "@/lib/type-periods";
import { APPLICATION_TYPE_LABELS } from "@/types";

// 지원금 신청용 월간 캘린더 — 유형별 지원신청(pre)·지원금신청(fund) 기간을 한눈에 보여준다.
// 데이터: 프로그램(근로·참여지원비·진행요원비 등)의 신청 기간 + 성과형(성적·경진대회·자격증) 학기별 신청기한.

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// 프로그램 관리의 상시/마감 센티넬 기간 (신청폼 편집과 동일 값)
const ALWAYS_START = "2000-01-01";
const ALWAYS_END = "2099-12-31";
const isAlways = (s?: string, e?: string) => s === ALWAYS_START && e === ALWAYS_END;
const isClosed = (s?: string, e?: string) => s === "1900-01-01" && e === "1900-01-01";

const PHASE_META: Record<ApplyPhase, { label: string; chip: string; dot: string }> = {
  pre: { label: "지원신청", chip: "bg-indigo-100 text-indigo-700", dot: "#6366f1" },
  fund: { label: "지원금신청", chip: "bg-emerald-100 text-emerald-700", dot: "#059669" },
};

interface FundEvent {
  phase: ApplyPhase;
  name: string;       // 프로그램명 또는 유형명
  typeLabel: string;  // 지원금 유형 라벨
  start: string;      // YYYY-MM-DD ('' = 제한 없음)
  end: string;
}

// 프로그램 → 지원금 유형 라벨
function typeLabelOf(p: Program): string {
  if (p.category === "labor") return APPLICATION_TYPE_LABELS.labor;
  if (p.category === "activity") return APPLICATION_TYPE_LABELS.activity;
  return p.programType === "staff" ? APPLICATION_TYPE_LABELS.staff : APPLICATION_TYPE_LABELS.program;
}

export default function FundCalendar({ programs, typePeriods }: { programs: Program[]; typePeriods: TypePeriods }) {
  const [view, setView] = useState<{ y: number; m: number }>(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [sel, setSel] = useState<number | null>(null); // 선택한 날짜(YYYYMMDD)
  // 단계 필터 — 기본 둘 다 표시
  const [phaseOff, setPhaseOff] = useState<Set<ApplyPhase>>(new Set());

  // 기간 이벤트 + 상시 신청 가능 목록
  const { events, always } = useMemo(() => {
    const evs: FundEvent[] = [];
    const alw: { name: string; typeLabel: string }[] = [];
    for (const p of programs) {
      if (p.programType === "club" || !p.name) continue; // 소학회 제외
      const tl = typeLabelOf(p);
      // 지원금신청(fund) 기간
      if (isPhaseEnabled(p, "fund") && !isClosed(p.applyStart, p.applyEnd)) {
        if (isAlways(p.applyStart, p.applyEnd)) alw.push({ name: p.name, typeLabel: tl });
        else if (p.applyStart && p.applyEnd) evs.push({ phase: "fund", name: p.name, typeLabel: tl, start: p.applyStart, end: p.applyEnd });
      }
      // 지원신청(pre) 기간 — 별도 기간을 설정한 프로그램만 (미설정은 지원금신청 기간과 동일해 중복 표시 방지)
      if (isPhaseEnabled(p, "pre") && (p.preApplyStart || p.preApplyEnd)) {
        const s = p.preApplyStart || p.applyStart;
        const e = p.preApplyEnd || p.applyEnd;
        if (!isClosed(s, e) && !isAlways(s, e) && s && e) evs.push({ phase: "pre", name: p.name, typeLabel: tl, start: s, end: e });
      }
    }
    // 성과형(성적·경진대회·자격증) 학기별 신청기한
    for (const t of PERIOD_TYPES) {
      const p = typePeriods[t];
      const label = APPLICATION_TYPE_LABELS[t];
      if (!p || (!p.start && !p.end)) { alw.push({ name: label, typeLabel: "우수성과 지원금" }); continue; }
      evs.push({ phase: "fund", name: label, typeLabel: "우수성과 지원금", start: p.start || "", end: p.end || "" });
    }
    return { events: evs, always: alw };
  }, [programs, typePeriods]);

  const { y, m } = view;
  const first = new Date(y, m, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const dateStr = (d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  // 날짜별 이벤트 (단계 필터 적용)
  const byDay = useMemo(() => {
    const map: Record<number, FundEvent[]> = {};
    const visible = events.filter((e) => !phaseOff.has(e.phase));
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = dateStr(d);
      const key = y * 10000 + (m + 1) * 100 + d;
      const hits = visible.filter((e) => (!e.start || e.start <= ds) && (!e.end || ds <= e.end));
      if (hits.length) map[key] = hits;
    }
    return map;
  }, [events, phaseOff, y, m, daysInMonth]);

  const prevMonth = () => setView((v) => v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 });
  const nextMonth = () => setView((v) => v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 });
  const goToday = () => { const d = new Date(); setView({ y: d.getFullYear(), m: d.getMonth() }); };

  const today = new Date();
  const todayKey = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();

  const togglePhase = (ph: ApplyPhase) => setPhaseOff((prev) => {
    const next = new Set(prev);
    if (next.has(ph)) next.delete(ph); else next.add(ph);
    return next;
  });

  // 셀 안 표기: 시작일 '시작' · 마감일 '마감' 강조
  const cellText = (e: FundEvent, ds: string) => {
    if (e.end && ds === e.end) return `${e.name} 마감`;
    if (e.start && ds === e.start) return `${e.name} 시작`;
    return e.name;
  };

  const selList = sel != null ? (byDay[sel] || []) : [];
  const selDs = sel != null ? `${Math.floor(sel / 10000)}-${String(Math.floor((sel % 10000) / 100)).padStart(2, "0")}-${String(sel % 100).padStart(2, "0")}` : "";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 gap-2 flex-wrap">
        <div className="text-sm font-semibold text-gray-700">🗓️ 지원금 신청 일정</div>
        <div className="flex items-center gap-1">
          <button onClick={goToday} className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:border-indigo-300">오늘</button>
          <button onClick={prevMonth} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500" title="이전 달"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-bold text-gray-800 w-24 text-center">{y}년 {m + 1}월</span>
          <button onClick={nextMonth} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500" title="다음 달"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      {/* 단계 필터 */}
      <div className="flex items-center gap-1.5 flex-wrap px-4 py-2 border-b border-gray-100 bg-gray-50/50">
        {(Object.keys(PHASE_META) as ApplyPhase[]).map((ph) => {
          const on = !phaseOff.has(ph);
          return (
            <button key={ph} onClick={() => togglePhase(ph)}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-full border inline-flex items-center gap-1.5 transition ${on ? "border-gray-300 bg-white text-gray-700" : "border-gray-200 bg-gray-100 text-gray-400"}`}>
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: on ? PHASE_META[ph].dot : "#d1d5db" }} />
              {PHASE_META[ph].label}
            </button>
          );
        })}
        <span className="text-[11px] text-gray-400 ml-1">기간이 설정된 유형·프로그램만 캘린더에 표시됩니다.</span>
      </div>

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
              const ds = dateStr(d);
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
                    {list.slice(0, 3).map((e, j) => (
                      <div key={j} className={`text-[10px] leading-tight rounded px-1 py-0.5 truncate ${PHASE_META[e.phase].chip} ${e.end === ds ? "font-bold" : ""}`}
                        title={`[${PHASE_META[e.phase].label}] ${e.typeLabel} · ${e.name} (${e.start || "상시"} ~ ${e.end || "상시"})`}>
                        {cellText(e, ds)}
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
          <p className="text-xs font-bold text-gray-600 mb-1.5">{Math.floor((sel % 10000) / 100)}월 {sel % 100}일 신청 가능 {selList.length}건</p>
          {selList.length === 0 ? (
            <p className="text-xs text-gray-400">이 날짜에 신청 기간인 항목이 없습니다.</p>
          ) : (
            <ul className="space-y-1">
              {selList.map((e, i) => (
                <li key={i} className="text-xs text-gray-700 flex items-start gap-2 flex-wrap">
                  <span className={`px-1.5 py-0.5 rounded font-semibold ${PHASE_META[e.phase].chip}`}>{PHASE_META[e.phase].label}</span>
                  <span className="text-gray-400">{e.typeLabel}</span>
                  <span className="font-semibold break-words">{e.name}</span>
                  <span className="text-gray-500 whitespace-nowrap">{e.start || "상시"} ~ {e.end || "상시"}{e.end === selDs ? " · 오늘 마감" : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 상시 신청 가능 */}
      {always.length > 0 && (
        <div className="border-t border-gray-100 px-4 py-2.5 flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-gray-500">상시 신청 가능:</span>
          {always.map((a, i) => (
            <span key={i} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600" title={a.typeLabel}>{a.name}</span>
          ))}
        </div>
      )}

      {Object.keys(byDay).length === 0 && sel == null && (
        <div className="px-4 py-3 text-xs text-gray-400 border-t border-gray-100">이 달에는 기간이 설정된 신청 일정이 없습니다. 이전/다음 달을 살펴보거나 상시 신청 가능 항목을 확인하세요.</div>
      )}
    </div>
  );
}

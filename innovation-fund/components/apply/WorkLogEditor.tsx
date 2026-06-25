"use client";
import { useState } from "react";
import { Plus, Trash2, CalendarPlus, CalendarClock, X } from "lucide-react";
import type { WorkLogEntry, ClassTime } from "@/types";

interface Props {
  entries: WorkLogEntry[];
  onChange: (entries: WorkLogEntry[]) => void;
  withDetail?: boolean;   // 근로 상세내역 입력 여부 (근로장학금)
  hint?: string;          // 안내 문구
  classTimes?: ClassTime[]; // 수강 시간표 (겹치는 시간엔 근로 불가)
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const toMin = (t: string) => { const [h, m] = (t || "").split(":").map(Number); return (h || 0) * 60 + (m || 0); };

// 해당 일자·시간이 수업시간과 겹치면 겹친 수업을 반환
function classConflict(date: string, start: string, end: string, classTimes: ClassTime[]): ClassTime | null {
  const d = new Date(date + "T00:00:00");
  if (isNaN(d.getTime())) return null;
  const day = d.getDay();
  const s = toMin(start), e = toMin(end);
  for (const c of classTimes) {
    if (c.day !== day) continue;
    if (s < toMin(c.end) && toMin(c.start) < e) return c;
  }
  return null;
}

export function diffHours(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) return 0;
  return Math.round((mins / 60) * 10) / 10;
}

function weekday(date: string): string {
  const d = new Date(date + "T00:00:00");
  return isNaN(d.getTime()) ? "" : WEEKDAYS[d.getDay()];
}

function datesInRange(from: string, to: string): string[] {
  if (!from || !to || from > to) return [];
  const out: string[] = [];
  const d = new Date(from + "T00:00:00");
  const last = new Date(to + "T00:00:00");
  while (d <= last) { out.push(d.toISOString().split("T")[0]); d.setDate(d.getDate() + 1); }
  return out;
}

function sortEntries(list: WorkLogEntry[]): WorkLogEntry[] {
  return [...list].sort((a, b) => (a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)));
}

export default function WorkLogEditor({ entries, onChange, withDetail, hint, classTimes = [] }: Props) {
  // 개별 등록
  const [iDate, setIDate] = useState("");
  const [iStart, setIStart] = useState("09:00");
  const [iEnd, setIEnd] = useState("18:00");
  const [iDetail, setIDetail] = useState("");
  // 일괄 등록
  const [bStart, setBStart] = useState("09:00");
  const [bEnd, setBEnd] = useState("18:00");
  const [bDetail, setBDetail] = useState("");
  const [oneDate, setOneDate] = useState("");
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [pendingDates, setPendingDates] = useState<string[]>([]);

  const iHours = diffHours(iStart, iEnd);
  const bHours = diffHours(bStart, bEnd);
  const totalHours = Math.round(entries.reduce((s, e) => s + e.hours, 0) * 10) / 10;

  const exists = (date: string, s: string, e: string) =>
    entries.some((x) => x.date === date && x.startTime === s && x.endTime === e);

  // 개별 등록: 날짜 1개 + 시간
  const addIndividual = () => {
    if (!iDate) { alert("날짜를 선택해주세요."); return; }
    if (iHours <= 0) { alert("종료 시간이 시작 시간보다 늦어야 합니다."); return; }
    if (exists(iDate, iStart, iEnd)) { alert("이미 동일한 일시의 기록이 있습니다."); return; }
    const conflict = classConflict(iDate, iStart, iEnd, classTimes);
    if (conflict) { alert(`수강 시간(${WEEKDAYS[conflict.day]} ${conflict.start}~${conflict.end}${conflict.label ? ` ${conflict.label}` : ""})과 겹쳐 근로할 수 없습니다.`); return; }
    onChange(sortEntries([...entries, { date: iDate, startTime: iStart, endTime: iEnd, hours: iHours, detail: withDetail ? iDetail : undefined }]));
    setIDate(""); setIDetail("");
  };

  // 일괄 등록: 같은 시간으로 여러 날짜
  const addPendingDate = (d: string) => { if (d && !pendingDates.includes(d)) setPendingDates((p) => [...p, d].sort()); };
  const addRange = () => {
    const r = datesInRange(rangeFrom, rangeTo);
    if (!r.length) return;
    setPendingDates((p) => Array.from(new Set([...p, ...r])).sort());
    setRangeFrom(""); setRangeTo("");
  };
  const applyBatch = () => {
    if (pendingDates.length === 0) { alert("등록할 날짜를 한 개 이상 추가해주세요."); return; }
    if (bHours <= 0) { alert("종료 시간이 시작 시간보다 늦어야 합니다."); return; }
    const conflicts = pendingDates.filter((d) => classConflict(d, bStart, bEnd, classTimes));
    if (conflicts.length) {
      alert(`수강 시간과 겹쳐 등록할 수 없는 날짜가 있습니다:\n${conflicts.map((d) => `${d}(${weekday(d)})`).join(", ")}\n\n해당 날짜를 제외하고 등록합니다.`);
    }
    const adds: WorkLogEntry[] = pendingDates
      .filter((d) => !exists(d, bStart, bEnd) && !classConflict(d, bStart, bEnd, classTimes))
      .map((d) => ({ date: d, startTime: bStart, endTime: bEnd, hours: bHours, detail: withDetail ? bDetail : undefined }));
    onChange(sortEntries([...entries, ...adds]));
    setPendingDates(conflicts);
  };

  const removeEntry = (i: number) => onChange(entries.filter((_, idx) => idx !== i));
  const editDetail = (i: number, v: string) => onChange(entries.map((e, idx) => idx === i ? { ...e, detail: v } : e));

  return (
    <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.7)" }}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-gray-800">근무상황부</h3>
        <span className="text-xs text-gray-500">총 {totalHours}시간 · {new Set(entries.map((e) => e.date)).size}일</span>
      </div>
      <p className="text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5 mb-3">※ 입력 규칙: 1일 최대 8시간 · 같은 날 합계 8시간 이내 · <strong>수업시간과 겹치는 시간은 등록 불가</strong>(마이페이지에서 수강 시간표를 먼저 입력)</p>
      {hint && <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3">{hint}</div>}

      <div className="grid md:grid-cols-2 gap-3 mb-3">
        {/* 개별 등록 */}
        <div className="rounded-xl p-3 bg-emerald-50/70 border border-emerald-100 space-y-2">
          <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1"><CalendarClock className="w-4 h-4" /> 개별 등록 — 하루씩 일시 입력</p>
          <div>
            <label className="text-xs text-gray-500">날짜</label>
            <input type="date" className="input-field" value={iDate} onChange={(e) => setIDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><label className="text-xs text-gray-500">시작</label><input type="time" className="input-field" value={iStart} onChange={(e) => setIStart(e.target.value)} /></div>
            <div><label className="text-xs text-gray-500">종료</label><input type="time" className="input-field" value={iEnd} onChange={(e) => setIEnd(e.target.value)} /></div>
            <div><label className="text-xs text-gray-500">시간</label><div className="input-field flex items-center font-semibold text-primary-700">{iHours}h</div></div>
          </div>
          {withDetail && (
            <div><label className="text-xs text-gray-500">상세내역</label><input className="input-field" value={iDetail} onChange={(e) => setIDetail(e.target.value)} placeholder="예: 강의실 환경 개선" /></div>
          )}
          <button type="button" onClick={addIndividual} className="btn-secondary w-full text-sm flex items-center justify-center gap-1"><Plus className="w-4 h-4" /> 이 날짜 추가</button>
        </div>

        {/* 일괄 등록 */}
        <div className="rounded-xl p-3 bg-blue-50/70 border border-blue-100 space-y-2">
          <p className="text-xs font-semibold text-blue-700 flex items-center gap-1"><CalendarPlus className="w-4 h-4" /> 일괄 등록 — 같은 시간으로 여러 날짜</p>
          <div className="grid grid-cols-3 gap-2">
            <div><label className="text-xs text-gray-500">시작</label><input type="time" className="input-field" value={bStart} onChange={(e) => setBStart(e.target.value)} /></div>
            <div><label className="text-xs text-gray-500">종료</label><input type="time" className="input-field" value={bEnd} onChange={(e) => setBEnd(e.target.value)} /></div>
            <div><label className="text-xs text-gray-500">1일</label><div className="input-field flex items-center font-semibold text-primary-700">{bHours}h</div></div>
          </div>
          {withDetail && (
            <div><label className="text-xs text-gray-500">상세내역(공통)</label><input className="input-field" value={bDetail} onChange={(e) => setBDetail(e.target.value)} placeholder="예: 강의실 환경 개선" /></div>
          )}
          <div className="flex items-end gap-2">
            <div className="flex-1"><label className="text-xs text-gray-500">날짜 추가</label><input type="date" className="input-field" value={oneDate} onChange={(e) => setOneDate(e.target.value)} /></div>
            <button type="button" onClick={() => { addPendingDate(oneDate); setOneDate(""); }} className="btn-secondary h-[52px] px-3"><Plus className="w-4 h-4" /></button>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1 grid grid-cols-2 gap-1">
              <div><label className="text-xs text-gray-500">기간 시작</label><input type="date" className="input-field" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} /></div>
              <div><label className="text-xs text-gray-500">기간 끝</label><input type="date" className="input-field" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} /></div>
            </div>
            <button type="button" onClick={addRange} className="btn-secondary h-[52px] px-2 whitespace-nowrap text-xs">기간추가</button>
          </div>
          {pendingDates.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {pendingDates.map((d) => (
                <span key={d} className="inline-flex items-center gap-1 text-xs bg-white rounded-full px-2.5 py-1 border border-blue-200">
                  {d}({weekday(d)})
                  <button type="button" onClick={() => setPendingDates((p) => p.filter((x) => x !== d))}><X className="w-3 h-3 text-gray-400 hover:text-red-500" /></button>
                </span>
              ))}
            </div>
          )}
          <button type="button" onClick={applyBatch} className="btn-primary w-full text-sm">선택한 {pendingDates.length}일 일괄 등록</button>
        </div>
      </div>

      {/* 등록된 기록 */}
      {entries.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-3">등록된 근무 기록이 없습니다.</p>
      ) : (
        <div className="space-y-1.5">
          {entries.map((e, i) => (
            <div key={`${e.date}-${e.startTime}-${i}`} className="flex flex-wrap items-center gap-2 text-sm bg-white rounded-xl px-3 py-2 border border-gray-100">
              <span className="font-medium w-32">{e.date} ({weekday(e.date)})</span>
              <span className="text-gray-600">{e.startTime} ~ {e.endTime}</span>
              <span className="text-primary-700 font-semibold">{e.hours}시간</span>
              {withDetail && (
                <input className="flex-1 min-w-[120px] text-xs border-b border-gray-200 focus:outline-none focus:border-indigo-400 px-1 py-0.5" value={e.detail || ""} onChange={(ev) => editDetail(i, ev.target.value)} placeholder="상세내역" />
              )}
              <button type="button" onClick={() => removeEntry(i)} className="text-gray-300 hover:text-red-500 ml-auto"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

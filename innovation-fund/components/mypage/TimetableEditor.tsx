"use client";
import { Plus, Trash2 } from "lucide-react";
import type { ClassTime } from "@/types";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

interface Props { value: ClassTime[]; onChange: (v: ClassTime[]) => void; }

export default function TimetableEditor({ value, onChange }: Props) {
  const add = () => onChange([...value, { day: 1, start: "09:00", end: "10:00", label: "" }]);
  const upd = (i: number, patch: Partial<ClassTime>) => onChange(value.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const rm = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      {value.length === 0 ? (
        <p className="text-sm text-gray-400">등록된 수업이 없습니다. 아래 &lsquo;수업 추가&rsquo;로 시간표를 입력하세요.</p>
      ) : (
        <div className="space-y-2">
          {value.map((c, i) => (
            <div key={i} className="grid grid-cols-2 sm:grid-cols-[auto_1fr_1fr_2fr_auto] gap-2 items-center">
              <select className="input-field !w-auto" value={c.day} onChange={(e) => upd(i, { day: Number(e.target.value) })}>
                {DAYS.map((d, idx) => <option key={idx} value={idx}>{d}</option>)}
              </select>
              <input type="time" className="input-field" value={c.start} onChange={(e) => upd(i, { start: e.target.value })} />
              <input type="time" className="input-field" value={c.end} onChange={(e) => upd(i, { end: e.target.value })} />
              <input className="input-field" value={c.label || ""} onChange={(e) => upd(i, { label: e.target.value })} placeholder="과목명 (선택)" />
              <button type="button" onClick={() => rm(i)} className="text-gray-300 hover:text-red-500 justify-self-end"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}
      <button type="button" onClick={add} className="text-xs text-primary-600 hover:underline flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> 수업 추가</button>
    </div>
  );
}

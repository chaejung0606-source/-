"use client";
import { useEffect, useState } from "react";
import type { WorkLogEntry } from "@/types";
import { getActivePrograms, type Program } from "@/lib/programs";
import WorkLogEditor from "./WorkLogEditor";

interface StaffDetail {
  programName: string; workPeriod: string; workDates: string;
  totalHours: number; studentType: "undergraduate" | "graduate"; taskDescription: string;
  workLog: WorkLogEntry[];
}

interface Props { values: StaffDetail; onChange: (v: StaffDetail) => void; calculatedAmount: number; }

export default function StaffDetailSection({ values, onChange, calculatedAmount }: Props) {
  const [programs, setPrograms] = useState<Program[]>([]);
  useEffect(() => { setPrograms(getActivePrograms("innovation")); }, []);

  const set = (k: keyof StaffDetail, v: string | number) => onChange({ ...values, [k]: v });

  // 근무상황부 변경 → 파생 필드 동기화
  const onLogChange = (log: WorkLogEntry[]) => {
    const dates = Array.from(new Set(log.map((e) => e.date)));
    const totalHours = Math.round(log.reduce((s, e) => s + e.hours, 0) * 10) / 10;
    onChange({
      ...values, workLog: log, totalHours,
      workDates: dates.join(", "),
      workPeriod: dates.length ? `${dates[0]} ~ ${dates[dates.length - 1]}` : "",
    });
  };

  return (
    <div className="card space-y-4">
      <h2 className="section-title">진행요원비 신청 정보</h2>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
        ※ 근로시간은 수업시간과 중복될 수 없으며, 프로그램 참여지원비와 중복 계상할 수 없습니다.
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">프로그램명 <span className="text-red-500">*</span></label>
          {programs.length > 0 ? (
            <select className="input-field" value={values.programName} onChange={(e) => set("programName", e.target.value)}>
              <option value="">신청 가능한 프로그램 선택</option>
              {programs.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          ) : (
            <div className="input-field flex items-center text-sm text-gray-400">현재 신청 가능한 프로그램이 없습니다.</div>
          )}
        </div>
        <div>
          <label className="label">학생 구분</label>
          <select className="input-field" value={values.studentType} onChange={(e) => set("studentType", e.target.value as "undergraduate" | "graduate")}>
            <option value="undergraduate">대학생 (시간당 15,000원)</option>
            <option value="graduate">대학원생 (시간당 20,000원)</option>
          </select>
        </div>
      </div>

      <WorkLogEditor entries={values.workLog} onChange={onLogChange} hint="근로시간은 수업시간과 겹치지 않아야 하며, 평일 09:00~18:00 사이를 권장합니다." />

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">총 근무 시간 (자동 합산)</label>
          <div className="input-field bg-gray-50 font-bold flex items-center">{values.totalHours || 0}시간</div>
        </div>
        <div>
          <label className="label">지급 예정액 (자동 계산)</label>
          <div className="input-field bg-gray-50 text-primary-700 font-bold flex items-center">{calculatedAmount.toLocaleString()}원</div>
        </div>
        <div className="sm:col-span-2">
          <label className="label">담당 업무</label>
          <textarea className="input-field h-20 resize-none" value={values.taskDescription} onChange={(e) => set("taskDescription", e.target.value)} placeholder="담당 업무를 상세히 기술해주세요." />
        </div>
      </div>
    </div>
  );
}

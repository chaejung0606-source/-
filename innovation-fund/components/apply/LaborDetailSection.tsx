"use client";
import { useEffect, useState } from "react";
import type { WorkLogEntry, ClassTime } from "@/types";
import { fetchPrograms, filterActive, getProgramRoles, type Program } from "@/lib/programs";
import WorkLogEditor from "./WorkLogEditor";

interface LaborDetail {
  programId: string; programName: string; role: string; workPeriod: string;
  totalHours: number; studentType: "undergraduate" | "graduate";
  workLog: WorkLogEntry[]; workDetail: string; supervisorName: string;
}

interface Props { values: LaborDetail; onChange: (v: LaborDetail) => void; calculatedAmount: number; preOnly?: boolean; classTimes?: ClassTime[]; }

export default function LaborDetailSection({ values, onChange, calculatedAmount, preOnly = false, classTimes = [] }: Props) {
  const [programs, setPrograms] = useState<Program[]>([]);
  useEffect(() => { fetchPrograms().then((all) => setPrograms(filterActive(all, "labor", undefined, preOnly ? "pre" : "fund"))); }, [preOnly]);

  const set = (patch: Partial<LaborDetail>) => onChange({ ...values, ...patch });

  const selectProgram = (id: string) => {
    const p = programs.find((x) => x.id === id);
    const roles = p ? getProgramRoles(p) : [];
    set({ programId: id, programName: p?.name || "", role: roles.length === 1 ? roles[0] : (roles.includes(values.role) ? values.role : "") });
  };

  const selectedProgram = programs.find((x) => x.id === values.programId);
  const roleOptions = selectedProgram ? getProgramRoles(selectedProgram) : [];
  // TA(수업 운영 지원) 프로그램은 신청정보 박스에서 담당교수(이름)를 입력
  const isTA = !!selectedProgram && (selectedProgram.name.toUpperCase().includes("TA") || selectedProgram.name.includes("수업 운영"));

  const onLogChange = (log: WorkLogEntry[]) => {
    const dates = Array.from(new Set(log.map((e) => e.date)));
    const totalHours = Math.round(log.reduce((s, e) => s + e.hours, 0) * 10) / 10;
    onChange({ ...values, workLog: log, totalHours, workPeriod: dates.length ? `${dates[0]} ~ ${dates[dates.length - 1]}` : "" });
  };

  const over40 = values.totalHours > 40;

  return (
    <div className="card space-y-4">
      <h2 className="section-title">근로장학금 신청 정보</h2>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
        ※ 근로시간은 수업시간과 겹치지 않아야 하며, 평일 09:00~18:00 사이여야 합니다. 월 40시간 이내로 인정됩니다.
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">프로그램 <span className="text-red-500">*</span></label>
          {programs.length > 0 ? (
            <select className="input-field" value={values.programId || ""} onChange={(e) => selectProgram(e.target.value)}>
              <option value="">신청 가능한 프로그램 선택</option>
              {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          ) : (
            <div className="input-field flex items-center text-sm text-gray-400">현재 신청 가능한 근로 프로그램이 없습니다.</div>
          )}
        </div>
        <div>
          <label className="label">역할</label>
          {roleOptions.length > 0 ? (
            <select className="input-field" value={values.role} onChange={(e) => set({ role: e.target.value })}>
              <option value="">역할 선택</option>
              {roleOptions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          ) : (
            <input className="input-field" value={values.role} onChange={(e) => set({ role: e.target.value })} placeholder="예: 공간관리" />
          )}
        </div>
        <div>
          <label className="label">학생 구분</label>
          <select className="input-field" value={values.studentType} onChange={(e) => set({ studentType: e.target.value as "undergraduate" | "graduate" })}>
            <option value="undergraduate">학부생 (시간당 15,000원)</option>
            <option value="graduate">대학원생 (시간당 20,000원)</option>
          </select>
        </div>
        {isTA ? (
          <div>
            <label className="label">담당교수 (이름) <span className="text-red-500">*</span></label>
            <input className="input-field" value={values.supervisorName} onChange={(e) => set({ supervisorName: e.target.value })} placeholder="홍길동" />
          </div>
        ) : !preOnly && (
          <div>
            <label className="label">확인자 (지도교수·담당자)</label>
            <input className="input-field" value={values.supervisorName} onChange={(e) => set({ supervisorName: e.target.value })} placeholder="홍길동 교수" />
          </div>
        )}
      </div>

      {preOnly ? (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-sm text-indigo-700">
          ※ 근무상황부·총 근로시간·지급 예정액은 활동 종료 후 <strong>지원금 신청</strong> 단계에서 작성합니다. 근로장학생은 <strong>마이페이지에서 수강 시간표</strong>를 먼저 입력해주세요. (수업시간에는 근로할 수 없습니다.)
        </div>
      ) : (
        <>
          <WorkLogEditor entries={values.workLog} onChange={onLogChange} withDetail classTimes={classTimes} hint="근무상황부: 일자·시간·근로 상세내역을 작성하세요. 수업시간과 겹치는 시간은 등록할 수 없습니다. (마이페이지 시간표 기준)" />

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">총 근로시간 (자동 합산)</label>
              <div className={`input-field font-bold flex items-center ${over40 ? "text-red-600 bg-red-50" : "bg-gray-50"}`}>
                {values.totalHours || 0}시간 {over40 && "(월 40시간 초과)"}
              </div>
            </div>
            <div>
              <label className="label">지급 예정액 (자동 계산)</label>
              <div className="input-field bg-gray-50 text-primary-700 font-bold flex items-center">{calculatedAmount.toLocaleString()}원</div>
            </div>
          </div>
        </>
      )}

      {!preOnly && (
        <div>
          <label className="label">근로 내용 요약</label>
          <textarea className="input-field h-20 resize-none" value={values.workDetail} onChange={(e) => set({ workDetail: e.target.value })} placeholder="근로 활동 내용을 요약해주세요." />
        </div>
      )}
    </div>
  );
}

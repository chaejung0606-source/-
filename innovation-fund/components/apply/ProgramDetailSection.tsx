"use client";
import { useEffect, useState } from "react";
import type { EventLocation } from "@/types";
import { fetchPrograms, filterActiveByType, type Program } from "@/lib/programs";
import EventLocationSection from "./EventLocationSection";
import AiDraftButton from "./AiDraftButton";

interface ProgramDetail {
  programName: string; programType: string;
  startDate: string; endDate: string; participationPeriod: string;
  participationContent: string; supervisorName: string; requestAmount: number;
  programId: string; eventLocation?: EventLocation;
}

interface Props { values: ProgramDetail; onChange: (v: ProgramDetail) => void; preOnly?: boolean; ai?: { programName?: string; applicantName?: string; department?: string; grade?: string } | null; }

const PROGRAM_TYPES = ["교과", "비교과", "실험실습", "현장실습", "인턴십", "기업체 연계 방문·프로젝트", "학회 참석", "기타"];

// 숫자 8자리(20260616) 입력 시 yyyy-mm-dd 로 자동 변환
function fmtDate(raw: string): string {
  const d = raw.replace(/[^0-9]/g, "");
  if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  return raw;
}

function SmartDate({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="flex gap-2">
      <input className="input-field flex-1" inputMode="numeric" value={value}
        placeholder={placeholder || "YYYY-MM-DD 또는 20260616"} onChange={(e) => onChange(fmtDate(e.target.value))} />
      <input type="date" className="input-field !w-[46px] !px-1 shrink-0" title="달력에서 선택"
        value={/^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export default function ProgramDetailSection({ values, onChange, preOnly = false, ai = null }: Props) {
  const [programs, setPrograms] = useState<Program[]>([]);
  useEffect(() => { fetchPrograms().then((all) => setPrograms(filterActiveByType(all, "program", "innovation", undefined, preOnly ? "pre" : "fund"))); }, [preOnly]);

  const set = (patch: Partial<ProgramDetail>) => onChange({ ...values, ...patch });
  const isConference = values.programType === "학회 참석";

  const setPeriod = (patch: { startDate?: string; endDate?: string }) => {
    const start = patch.startDate ?? values.startDate ?? "";
    const end = patch.endDate ?? values.endDate ?? "";
    const period = start && end ? `${start} ~ ${end}` : (start || end || "");
    set({ ...patch, participationPeriod: period });
  };

  return (
    <div className="card space-y-4">
      <h2 className="section-title">프로그램 참여지원비 신청 정보</h2>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
        프로그램 참여지원비는 사업단이 승인한 교과·비교과, 실험실습, 현장실습, 인턴십, 기업체 연계 방문·프로젝트, 학회 참석 등에 참여하는 학생에게 지급됩니다.
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">프로그램명 <span className="text-red-500">*</span></label>
          {programs.length > 0 ? (
            <select className="input-field" value={values.programId || ""} onChange={(e) => set({ programId: e.target.value, programName: programs.find((p) => p.id === e.target.value)?.name || "" })}>
              <option value="">신청 가능한 프로그램 선택</option>
              {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          ) : (
            <div className="input-field flex items-center text-sm text-gray-400">현재 신청 가능한 프로그램이 없습니다.</div>
          )}
        </div>
        <div>
          <label className="label">프로그램 유형</label>
          <select className="input-field" value={values.programType} onChange={(e) => set({ programType: e.target.value })}>
            <option value="">선택</option>
            {PROGRAM_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label">참여 시작일</label>
          <SmartDate value={values.startDate || ""} onChange={(v) => setPeriod({ startDate: v })} />
        </div>
        <div>
          <label className="label">참여 종료일</label>
          <SmartDate value={values.endDate || ""} onChange={(v) => setPeriod({ endDate: v })} />
        </div>
        <div>
          <label className="label">지도교수 또는 담당자명</label>
          <input className="input-field" value={values.supervisorName} onChange={(e) => set({ supervisorName: e.target.value })} placeholder="홍길동 교수" />
        </div>
        <div className="sm:col-span-2">
          <div className="flex items-center justify-between">
            <label className="label">참여 내용</label>
            {ai && <AiDraftButton label="참여 내용 (활동계획·기대성과 등)" context={{ ...ai, programName: ai.programName || values.programName }} onText={(t) => set({ participationContent: t })} />}
          </div>
          <textarea className="input-field h-24 resize-none" value={values.participationContent} onChange={(e) => set({ participationContent: e.target.value })} placeholder="참여 내용을 상세히 기술해주세요." />
        </div>
      </div>
      <p className="text-xs text-gray-500">※ 신청 금액은 아래 비용 입력(교통비·숙박비)에서 자동 계산됩니다.</p>

      <EventLocationSection
        title={isConference ? "행사(학회) 장소" : "활동(참여) 장소"}
        values={values.eventLocation || { scope: "domestic" }}
        onChange={(loc) => set({ eventLocation: loc })}
      />
    </div>
  );
}

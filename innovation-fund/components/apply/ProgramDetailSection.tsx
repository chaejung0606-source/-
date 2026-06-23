"use client";
import { useEffect, useState } from "react";
import type { EventLocation } from "@/types";
import { fetchPrograms, filterActive, type Program } from "@/lib/programs";
import EventLocationSection from "./EventLocationSection";

interface ProgramDetail {
  programName: string; programType: string; participationPeriod: string;
  participationContent: string; supervisorName: string; requestAmount: number;
  programId?: string; eventLocation?: EventLocation;
}

interface Props { values: ProgramDetail; onChange: (v: ProgramDetail) => void; }

const PROGRAM_TYPES = ["교과", "비교과", "실험실습", "현장실습", "인턴십", "기업체 연계 방문·프로젝트", "학회 참석", "기타"];

export default function ProgramDetailSection({ values, onChange }: Props) {
  const [programs, setPrograms] = useState<Program[]>([]);
  useEffect(() => { fetchPrograms().then((all) => setPrograms(filterActive(all, "innovation"))); }, []);

  const set = (patch: Partial<ProgramDetail>) => onChange({ ...values, ...patch });
  const isConference = values.programType === "학회 참석";

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
          <label className="label">참여 기간</label>
          <input className="input-field" value={values.participationPeriod} onChange={(e) => set({ participationPeriod: e.target.value })} placeholder="예: 2026-07-01 ~ 2026-08-31" />
        </div>
        <div>
          <label className="label">지도교수 또는 담당자명</label>
          <input className="input-field" value={values.supervisorName} onChange={(e) => set({ supervisorName: e.target.value })} placeholder="홍길동 교수" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">참여 내용</label>
          <textarea className="input-field h-24 resize-none" value={values.participationContent} onChange={(e) => set({ participationContent: e.target.value })} placeholder="참여 내용을 상세히 기술해주세요." />
        </div>
      </div>
      <p className="text-xs text-gray-500">※ 신청 금액은 아래 비용 입력(교통비·숙박비)에서 자동 계산됩니다.</p>

      {isConference && (
        <EventLocationSection values={values.eventLocation || { scope: "domestic" }} onChange={(loc) => set({ eventLocation: loc })} />
      )}
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import type { EventLocation } from "@/types";
import { fetchPrograms, filterActive, type Program } from "@/lib/programs";
import EventLocationSection from "./EventLocationSection";

interface ActivityDetail {
  programId: string; activityName: string; activityType: string;
  activityPeriod: string; activityContent: string; requestAmount: number;
  eventLocation: EventLocation | undefined;
}

interface Props { values: ActivityDetail; onChange: (v: ActivityDetail) => void; }

const ACTIVITY_TYPES = ["동아리 활동", "학생 자치활동", "학술 행사", "학회 참가", "봉사활동", "기타"];

export default function ActivityDetailSection({ values, onChange }: Props) {
  const [programs, setPrograms] = useState<Program[]>([]);
  useEffect(() => { fetchPrograms().then((all) => setPrograms(filterActive(all, "activity"))); }, []);

  const set = (patch: Partial<ActivityDetail>) => onChange({ ...values, ...patch });
  const isEvent = values.activityType === "학술 행사" || values.activityType === "학회 참가";

  return (
    <div className="card space-y-4">
      <h2 className="section-title">학생활동지원비 신청 정보</h2>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
        학생 자치·동아리 활동, 학술 행사·학회 참가 등 사업 분야 관련 학생 활동을 지원합니다.
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">지원 프로그램</label>
          {programs.length > 0 ? (
            <select className="input-field" value={values.programId || ""} onChange={(e) => set({ programId: e.target.value, activityName: programs.find((p) => p.id === e.target.value)?.name || values.activityName })}>
              <option value="">신청 가능한 프로그램 선택</option>
              {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          ) : (
            <div className="input-field flex items-center text-sm text-gray-400">현재 신청 가능한 프로그램이 없습니다.</div>
          )}
        </div>
        <div>
          <label className="label">활동 유형</label>
          <select className="input-field" value={values.activityType} onChange={(e) => set({ activityType: e.target.value })}>
            <option value="">선택</option>
            {ACTIVITY_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label">활동명 <span className="text-red-500">*</span></label>
          <input className="input-field" value={values.activityName} onChange={(e) => set({ activityName: e.target.value })} placeholder="활동명" />
        </div>
        <div>
          <label className="label">활동 기간</label>
          <input className="input-field" value={values.activityPeriod} onChange={(e) => set({ activityPeriod: e.target.value })} placeholder="예: 2026-04-01 ~ 2026-04-30" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">활동 내용</label>
          <textarea className="input-field h-24 resize-none" value={values.activityContent} onChange={(e) => set({ activityContent: e.target.value })} placeholder="활동 내용을 상세히 기술해주세요." />
        </div>
        <div>
          <label className="label">신청 금액 (원) <span className="text-red-500">*</span></label>
          <input className="input-field" type="number" value={values.requestAmount || ""} onChange={(e) => set({ requestAmount: Number(e.target.value) })} placeholder="0" />
        </div>
      </div>

      {isEvent && (
        <EventLocationSection
          values={values.eventLocation || { scope: "domestic" }}
          onChange={(loc) => set({ eventLocation: loc })}
        />
      )}
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import type { EventLocation, ActivityKind, PaperDetail } from "@/types";
import { fetchPrograms, filterActive, type Program } from "@/lib/programs";
import EventLocationSection from "./EventLocationSection";

interface ActivityDetail {
  programId: string; activityName: string; activityType: string;
  activityPeriod: string; activityContent: string; requestAmount: number;
  eventLocation: EventLocation | undefined;
  activityKind: ActivityKind;
  paper: PaperDetail;
}

interface Props { values: ActivityDetail; onChange: (v: ActivityDetail) => void; }

const EMPTY_PAPER: PaperDetail = {
  paperTitle: "", journalName: "", issn: "", volumeIssue: "", publishDate: "", publisher: "", requestFee: 0,
};

const ACTIVITY_TYPES = ["동아리 활동", "학생 자치활동", "학술 행사", "학회 참가", "봉사활동", "기타"];

export default function ActivityDetailSection({ values, onChange }: Props) {
  const [programs, setPrograms] = useState<Program[]>([]);
  useEffect(() => { fetchPrograms().then((all) => setPrograms(filterActive(all, "activity"))); }, []);

  const set = (patch: Partial<ActivityDetail>) => onChange({ ...values, ...patch });
  const isEvent = values.activityType === "학술 행사" || values.activityType === "학회 참가";
  const kind: ActivityKind = values.activityKind ?? "conference";
  const isPaper = kind === "paper";

  const paper: PaperDetail = values.paper ?? EMPTY_PAPER;
  const setPaper = (patch: Partial<PaperDetail>) => {
    const next = { ...paper, ...patch };
    set({ paper: next, requestAmount: next.requestFee || 0 });
  };

  const selectKind = (k: ActivityKind) => {
    if (k === kind) return;
    set({
      activityKind: k,
      requestAmount: k === "paper" ? (values.paper?.requestFee || 0) : 0,
    });
  };

  return (
    <div className="card space-y-4">
      <h2 className="section-title">학생활동지원비 신청 정보</h2>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
        학생 자치·동아리 활동, 학술 행사·학회 참가 등 사업 분야 관련 학생 활동을 지원합니다.
      </div>

      {/* 신청 구분 선택 */}
      <div>
        <label className="label">신청 구분 <span className="text-red-500">*</span></label>
        <div className="grid sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => selectKind("conference")}
            className={`rounded-2xl p-4 text-left transition-all ${kind === "conference" ? "ring-2 ring-indigo-400 bg-indigo-50/60" : "bg-white/60 hover:bg-white"}`}
            style={{ border: "1px solid rgba(99,102,241,0.2)" }}
          >
            <div className="font-bold text-gray-800">학생활동지원비 (학회참석 등)</div>
            <div className="text-xs text-gray-500 mt-1">동아리·자치활동, 학술 행사·학회 참가 등</div>
          </button>
          <button
            type="button"
            onClick={() => selectKind("paper")}
            className={`rounded-2xl p-4 text-left transition-all ${kind === "paper" ? "ring-2 ring-indigo-400 bg-indigo-50/60" : "bg-white/60 hover:bg-white"}`}
            style={{ border: "1px solid rgba(99,102,241,0.2)" }}
          >
            <div className="font-bold text-gray-800">논문게재료</div>
            <div className="text-xs text-gray-500 mt-1">학술지 논문 게재료 지원 — 논문 정보 입력</div>
          </button>
        </div>
      </div>

      {isPaper ? (
        <div className="space-y-4">
          <div>
            <label className="label">논문명 <span className="text-red-500">*</span></label>
            <input className="input-field" value={paper.paperTitle} onChange={(e) => setPaper({ paperTitle: e.target.value })} placeholder="논문 제목" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">학술지명 <span className="text-red-500">*</span></label>
              <input className="input-field" value={paper.journalName} onChange={(e) => setPaper({ journalName: e.target.value })} placeholder="예: 정보보호학회논문지" />
            </div>
            <div>
              <label className="label">ISSN 번호</label>
              <input className="input-field" value={paper.issn} onChange={(e) => setPaper({ issn: e.target.value })} placeholder="0000-0000" />
            </div>
            <div>
              <label className="label">발행권(호)</label>
              <input className="input-field" value={paper.volumeIssue} onChange={(e) => setPaper({ volumeIssue: e.target.value })} placeholder="예: 34권 2호 (미정 시 공란)" />
            </div>
            <div>
              <label className="label">발행일</label>
              <input className="input-field" type="date" value={paper.publishDate} onChange={(e) => setPaper({ publishDate: e.target.value })} />
            </div>
            <div>
              <label className="label">발행기관</label>
              <input className="input-field" value={paper.publisher} onChange={(e) => setPaper({ publisher: e.target.value })} placeholder="발행기관" />
            </div>
            <div>
              <label className="label">신청금액(게재료) (원) <span className="text-red-500">*</span></label>
              <input className="input-field" type="number" min={0} value={paper.requestFee || ""} onChange={(e) => setPaper({ requestFee: Number(e.target.value) })} placeholder="0" />
            </div>
          </div>
          <div>
            <label className="label">관련 분야</label>
            <input className="input-field" value={values.activityType} onChange={(e) => set({ activityType: e.target.value })} placeholder="예: 사이버보안 / 클라우드 / 블록체인 / 개인정보보호" />
          </div>
          <div>
            <label className="label">사업단 연관성</label>
            <textarea className="input-field h-24 resize-none" value={values.activityContent} onChange={(e) => set({ activityContent: e.target.value })} placeholder="논문 주제와 사업 분야와의 연관성을 구체적으로 작성해주세요." />
          </div>
          <p className="text-xs text-amber-700">※ 연구산출물의 경우 사업단 사사표기 필수 · 발행권(호) 등 미정 시 공란 작성 · 논문 심사료는 제외</p>
        </div>
      ) : (
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
      )}

      {!isPaper && isEvent && (
        <EventLocationSection
          values={values.eventLocation || { scope: "domestic" }}
          onChange={(loc) => set({ eventLocation: loc })}
        />
      )}
    </div>
  );
}

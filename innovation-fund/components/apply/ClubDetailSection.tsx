"use client";
import type { ClubDetail, ClubMember, ClubField } from "@/types";
import { CLUB_FIELD_LABELS, CLUB_PRESIDENT_MONTHLY } from "@/types";
import { Plus, Trash2 } from "lucide-react";

interface Props { values: ClubDetail; onChange: (v: ClubDetail) => void; preOnly?: boolean; }

const FIELDS: ClubField[] = ["security", "privacy", "cloud", "blockchain"];
const emptyMember = (role = "팀원"): ClubMember => ({ role, name: "", studentId: "", department: "", isMirae: false, phone: "" });

// 첨단 ICT 소학회 활동 지원 — 지원신청(계획서)·지원금 신청(운영비·회장 지원금) 공통 폼
export default function ClubDetailSection({ values, onChange, preOnly = false }: Props) {
  const set = (patch: Partial<ClubDetail>) => onChange({ ...values, ...patch });

  // 회장 1명 + 팀원(최소 5명) 기본 구성 보장
  const members: ClubMember[] = values.members?.length ? values.members : [emptyMember("회장"), ...Array.from({ length: 5 }, () => emptyMember())];
  const setMember = (i: number, patch: Partial<ClubMember>) => set({ members: members.map((m, idx) => idx === i ? { ...m, ...patch } : m) });
  const addMember = () => set({ members: [...members, emptyMember()] });
  const removeMember = (i: number) => { if (members[i].role === "회장") return; set({ members: members.filter((_, idx) => idx !== i) }); };

  const months = values.presidentMonths || 0;
  const presidentAmount = months * CLUB_PRESIDENT_MONTHLY;
  const fmt = (n: number) => n.toLocaleString("ko-KR");

  return (
    <div className="card space-y-4">
      <h2 className="section-title">첨단 ICT 소학회 활동 지원 정보</h2>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
        사이버보안·클라우드·블록체인·개인정보보호 등 첨단 ICT 분야 소학회(동아리) 활동을 지원합니다. 소학회별 <strong>최소 6명</strong>으로 구성하며, 미래융합가상학과 소속 학생이 절반 이상 참여하는 팀을 우선 지원합니다.
        {preOnly
          ? " 활동 계획을 구체적으로 작성해주세요."
          : " 선정된 소학회의 운영비(회의비·재료·학회 참가 등)와 소학회 회장 혁신인재지원금을 신청합니다."}
      </div>

      {/* 기본 정보 */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">소학회명 <span className="text-red-500">*</span></label>
          <input className="input-field" value={values.clubName || ""} onChange={(e) => set({ clubName: e.target.value })} placeholder="소학회 이름" />
        </div>
        <div>
          <label className="label">활동 분야 <span className="text-red-500">*</span></label>
          <select className="input-field" value={values.field || ""} onChange={(e) => set({ field: e.target.value as ClubField })}>
            <option value="">선택</option>
            {FIELDS.map((f) => <option key={f} value={f}>{CLUB_FIELD_LABELS[f]}</option>)}
          </select>
        </div>
        <div>
          <label className="label">활동 주제 <span className="text-red-500">*</span></label>
          <input className="input-field" value={values.topic || ""} onChange={(e) => set({ topic: e.target.value })} placeholder="예: 웹 취약점 분석 및 모의해킹 스터디" />
        </div>
        <div>
          <label className="label">지도교수 <span className="text-red-500">*</span></label>
          <input className="input-field" value={values.advisor || ""} onChange={(e) => set({ advisor: e.target.value })} placeholder="지도교수 성명" />
        </div>
      </div>

      {preOnly && (
        <>
          <div>
            <label className="label">소학회 소개 (200자 이내)</label>
            <textarea className="input-field h-20 resize-none" maxLength={200} value={values.intro || ""} onChange={(e) => set({ intro: e.target.value })} placeholder="소학회 구성·운영 방향을 간단히 소개해주세요." />
          </div>
          <div>
            <label className="label">특이사항 (수상 경력 등)</label>
            <textarea className="input-field h-20 resize-none" value={values.achievements || ""} onChange={(e) => set({ achievements: e.target.value })} placeholder="이전 수상 경력·활동 실적 등이 있으면 작성해주세요." />
          </div>
        </>
      )}

      {/* 구성원 명단 */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label mb-0">소학회 구성원 <span className="text-red-500">*</span> <span className="text-xs text-gray-400">(회장 포함 최소 6명)</span></label>
          <button type="button" onClick={addMember} className="btn-secondary text-xs flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> 팀원 추가</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-xs text-gray-500">
                <th className="text-left font-medium px-1 py-1 w-16">구분</th>
                <th className="text-left font-medium px-1 py-1">이름</th>
                <th className="text-left font-medium px-1 py-1">학번</th>
                <th className="text-left font-medium px-1 py-1">소속학과</th>
                <th className="text-center font-medium px-1 py-1 w-16">가상학과</th>
                <th className="text-left font-medium px-1 py-1">연락처</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => (
                <tr key={i}>
                  <td className="px-1 py-1">
                    {m.role === "회장"
                      ? <span className="badge bg-indigo-100 text-indigo-700">회장</span>
                      : <span className="text-gray-500 text-xs">팀원</span>}
                  </td>
                  <td className="px-1 py-1"><input className="input-field !h-9 !py-1" value={m.name} onChange={(e) => setMember(i, { name: e.target.value })} placeholder="이름" /></td>
                  <td className="px-1 py-1"><input className="input-field !h-9 !py-1" value={m.studentId} onChange={(e) => setMember(i, { studentId: e.target.value })} placeholder="학번" /></td>
                  <td className="px-1 py-1"><input className="input-field !h-9 !py-1" value={m.department} onChange={(e) => setMember(i, { department: e.target.value })} placeholder="학과" /></td>
                  <td className="px-1 py-1 text-center"><input type="checkbox" className="w-4 h-4" checked={m.isMirae} onChange={(e) => setMember(i, { isMirae: e.target.checked })} /></td>
                  <td className="px-1 py-1"><input className="input-field !h-9 !py-1" value={m.phone} onChange={(e) => setMember(i, { phone: e.target.value })} placeholder="010-0000-0000" /></td>
                  <td className="px-1 py-1 text-center">
                    {m.role !== "회장" && <button type="button" onClick={() => removeMember(i)} className="text-gray-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-gray-400 mt-1">가상학과 = 미래융합가상학과 소속 여부. 미래융합가상학과 학생이 <strong>절반 이상</strong> 참여하는 소학회를 우선 지원합니다.</p>
      </div>

      {preOnly ? (
        <>
          <div>
            <label className="label">활동 목표 (정량·정성) <span className="text-red-500">*</span></label>
            <textarea className="input-field h-24 resize-none" value={values.goals || ""} onChange={(e) => set({ goals: e.target.value })} placeholder="예) 해킹방어대회 참가 00명/수상 목표 0건, 자격증 취득 목표 00명, 논문 0편 투고 등 구체적 수치로 작성" />
          </div>
          <div>
            <label className="label">활동 계획 <span className="text-red-500">*</span></label>
            <textarea className="input-field h-28 resize-none" value={values.plan || ""} onChange={(e) => set({ plan: e.target.value })} placeholder="첨단 ICT 분야와의 연관성 위주로 월별 활동 계획을 상세히 작성해주세요." />
          </div>
          <div>
            <label className="label">기대 성과</label>
            <textarea className="input-field h-20 resize-none" value={values.expectedOutcome || ""} onChange={(e) => set({ expectedOutcome: e.target.value })} placeholder="해당 활동을 통해 얻고자 하는 성과를 구체적으로 작성해주세요." />
          </div>
        </>
      ) : (
        <>
          <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)" }}>
            <p className="text-sm font-semibold text-indigo-700">소학회 회장 혁신인재지원금 (진행요원비 기준)</p>
            <div className="grid sm:grid-cols-2 gap-4 items-end">
              <div>
                <label className="label">신청 개월 수 <span className="text-xs text-gray-400">(월 {fmt(CLUB_PRESIDENT_MONTHLY)}원)</span></label>
                <input className="input-field" type="number" min={0} max={6} value={values.presidentMonths || ""} onChange={(e) => set({ presidentMonths: Number(e.target.value) })} placeholder="예: 6 (5~6월·9~12월)" />
              </div>
              <div className="text-sm text-gray-600">회장 지원금 합계: <strong className="text-indigo-700">{fmt(presidentAmount)}원</strong></div>
            </div>
          </div>
          <div>
            <label className="label">운영비 사용 계획 (회의비·재료·학회 참가 등)</label>
            <textarea className="input-field h-24 resize-none" value={values.budgetNote || ""} onChange={(e) => set({ budgetNote: e.target.value })} placeholder="회의비(1인 최대 30,000원×인원×횟수)·교육·재료비·학회 참가비 등 산출 근거를 작성해주세요." />
          </div>
          <div>
            <label className="label">총 신청 금액 (원) <span className="text-red-500">*</span></label>
            <input className="input-field" type="number" min={0} value={values.requestAmount || ""} onChange={(e) => set({ requestAmount: Number(e.target.value) })} placeholder="운영비 + 회장 지원금 등 총 신청 금액" />
            <p className="text-[11px] text-gray-400 mt-1">소학회 운영 지원은 팀당 최대 2,000,000원/학기 범위 내에서 지원됩니다.</p>
          </div>
        </>
      )}
    </div>
  );
}

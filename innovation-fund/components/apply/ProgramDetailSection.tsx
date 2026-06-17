"use client";

interface ProgramDetail {
  programName: string; programType: string; participationPeriod: string;
  participationContent: string; supervisorName: string; requestAmount: number;
}

interface Props { values: ProgramDetail; onChange: (v: ProgramDetail) => void; }

const PROGRAM_TYPES = ["교과", "비교과", "실험실습", "현장실습", "인턴십", "기업체 연계 방문·프로젝트", "학회 참석", "기타"];

export default function ProgramDetailSection({ values, onChange }: Props) {
  const set = (k: keyof ProgramDetail, v: string | number) => onChange({ ...values, [k]: v });

  return (
    <div className="card space-y-4">
      <h2 className="section-title">프로그램 참여지원비 신청 정보</h2>
      <div className="callout-info p-3 text-sm">
        프로그램 참여지원비는 사업단이 승인한 교과·비교과, 실험실습, 현장실습, 인턴십, 기업체 연계 방문·프로젝트, 학회 참석 등에 참여하는 학생에게 지급됩니다.
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">프로그램명 <span className="text-red-500">*</span></label>
          <input className="input-field" value={values.programName} onChange={(e) => set("programName", e.target.value)} placeholder="프로그램명 입력" />
        </div>
        <div>
          <label className="label">프로그램 유형</label>
          <select className="input-field" value={values.programType} onChange={(e) => set("programType", e.target.value)}>
            <option value="">선택</option>
            {PROGRAM_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label">참여 기간</label>
          <input className="input-field" value={values.participationPeriod} onChange={(e) => set("participationPeriod", e.target.value)} placeholder="예: 2024-07-01 ~ 2024-08-31" />
        </div>
        <div>
          <label className="label">지도교수 또는 담당자명</label>
          <input className="input-field" value={values.supervisorName} onChange={(e) => set("supervisorName", e.target.value)} placeholder="홍길동 교수" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">참여 내용</label>
          <textarea className="input-field h-24 resize-none" value={values.participationContent} onChange={(e) => set("participationContent", e.target.value)} placeholder="참여 내용을 상세히 기술해주세요." />
        </div>
        <div>
          <label className="label">신청 금액 (원) <span className="text-red-500">*</span></label>
          <input className="input-field" type="number" value={values.requestAmount || ""} onChange={(e) => set("requestAmount", Number(e.target.value))} placeholder="0" />
        </div>
      </div>
    </div>
  );
}

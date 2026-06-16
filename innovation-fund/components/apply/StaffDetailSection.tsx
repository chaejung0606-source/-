"use client";

interface StaffDetail {
  programName: string; workPeriod: string; workDates: string;
  totalHours: number; studentType: "undergraduate" | "graduate"; taskDescription: string;
}

interface Props { values: StaffDetail; onChange: (v: StaffDetail) => void; calculatedAmount: number; }

export default function StaffDetailSection({ values, onChange, calculatedAmount }: Props) {
  const set = (k: keyof StaffDetail, v: string | number) => onChange({ ...values, [k]: v });

  return (
    <div className="card space-y-4">
      <h2 className="section-title">진행요원비 신청 정보</h2>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
        ※ 근로시간은 수업시간과 중복될 수 없으며, 프로그램 참여지원비와 중복 계상할 수 없습니다.
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">프로그램명 <span className="text-red-500">*</span></label>
          <input className="input-field" value={values.programName} onChange={(e) => set("programName", e.target.value)} placeholder="프로그램명" />
        </div>
        <div>
          <label className="label">학생 구분</label>
          <select className="input-field" value={values.studentType} onChange={(e) => set("studentType", e.target.value as "undergraduate" | "graduate")}>
            <option value="undergraduate">대학생 (시간당 15,000원)</option>
            <option value="graduate">대학원생 (시간당 20,000원)</option>
          </select>
        </div>
        <div>
          <label className="label">근무 기간</label>
          <input className="input-field" value={values.workPeriod} onChange={(e) => set("workPeriod", e.target.value)} placeholder="2024-09-01 ~ 2024-09-10" />
        </div>
        <div>
          <label className="label">근무 일자</label>
          <input className="input-field" value={values.workDates} onChange={(e) => set("workDates", e.target.value)} placeholder="2024-09-02, 2024-09-05" />
        </div>
        <div>
          <label className="label">총 근무 시간 <span className="text-red-500">*</span></label>
          <input className="input-field" type="number" min="0" value={values.totalHours || ""} onChange={(e) => set("totalHours", Number(e.target.value))} placeholder="0" />
        </div>
        <div>
          <label className="label">지급 예정액 (자동 계산)</label>
          <div className="input-field bg-gray-50 text-primary-700 font-bold">
            {calculatedAmount.toLocaleString()}원
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="label">담당 업무</label>
          <textarea className="input-field h-20 resize-none" value={values.taskDescription} onChange={(e) => set("taskDescription", e.target.value)} placeholder="담당 업무를 상세히 기술해주세요." />
        </div>
      </div>
    </div>
  );
}

"use client";

interface GradeDetail {
  subType: "microdegree" | "minor" | "double"; courseName: string;
  credits: number; gpa: number; microDegreeCompleted: boolean;
}

interface Props { values: GradeDetail; onChange: (v: GradeDetail) => void; calculatedAmount: number; }

const SUB_TYPES = [
  { value: "microdegree", label: "마이크로디그리", amount: "30만원" },
  { value: "minor", label: "부전공", amount: "100만원" },
  { value: "double", label: "복수전공", amount: "150만원" },
] as const;

export default function GradeDetailSection({ values, onChange, calculatedAmount }: Props) {
  const set = (k: keyof GradeDetail, v: string | number | boolean) => onChange({ ...values, [k]: v });

  return (
    <div className="card space-y-4">
      <h2 className="section-title">성적 우수 지원금 신청 정보</h2>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 space-y-1">
        <p>• 평점 평균 3.0 이상인 학생에 한합니다.</p>
        <p>• 가/부 과목은 평점 계산에서 제외됩니다.</p>
        <p>• 동일 명칭 마이크로디그리는 최초 1회만 지급합니다.</p>
      </div>
      <div>
        <label className="label">세부 유형 <span className="text-red-500">*</span></label>
        <div className="grid grid-cols-3 gap-3">
          {SUB_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => set("subType", t.value)}
              className={`border-2 rounded-lg p-3 text-center transition-colors ${
                values.subType === t.value ? "border-primary-600 bg-primary-50" : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="font-medium text-sm">{t.label}</div>
              <div className="text-xs text-primary-600 mt-1">{t.amount}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">이수 과정명</label>
          <input className="input-field" value={values.courseName} onChange={(e) => set("courseName", e.target.value)} placeholder="과정명 입력" />
        </div>
        <div>
          <label className="label">이수 학점</label>
          <input className="input-field" type="number" min="0" step="0.5" value={values.credits || ""} onChange={(e) => set("credits", Number(e.target.value))} placeholder="0" />
        </div>
        <div>
          <label className="label">평점 평균 (4.5 만점)</label>
          <input className="input-field" type="number" min="0" max="4.5" step="0.01" value={values.gpa || ""} onChange={(e) => set("gpa", Number(e.target.value))} placeholder="0.00" />
        </div>
        <div>
          <label className="label">지급 예정액 (자동 계산)</label>
          <div className="input-field bg-gray-50 text-primary-700 font-bold">{calculatedAmount.toLocaleString()}원</div>
        </div>
        {values.subType === "microdegree" && (
          <div className="sm:col-span-2 flex items-center gap-2">
            <input type="checkbox" id="micro" checked={values.microDegreeCompleted} onChange={(e) => set("microDegreeCompleted", e.target.checked)} className="w-4 h-4 accent-primary-600" />
            <label htmlFor="micro" className="text-sm text-gray-700">마이크로디그리 이수 완료</label>
          </div>
        )}
      </div>
    </div>
  );
}

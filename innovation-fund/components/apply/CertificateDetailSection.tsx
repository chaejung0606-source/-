"use client";

interface CertDetail {
  certName: string; issuingOrg: string; acquisitionDate: string;
  certField: string; difficulty: "high" | "mid" | "low" | "review"; isMirae: boolean;
}

interface Props { values: CertDetail; onChange: (v: CertDetail) => void; calculatedAmount: number; }

const DIFFICULTIES = [
  { value: "high" as const, label: "상", amount: "70만원" },
  { value: "mid" as const, label: "중", amount: "40만원" },
  { value: "low" as const, label: "하", amount: "10만원" },
  { value: "review" as const, label: "심의 필요", amount: "심의 후 결정" },
];

export default function CertificateDetailSection({ values, onChange, calculatedAmount }: Props) {
  const set = <K extends keyof CertDetail>(k: K, v: CertDetail[K]) => onChange({ ...values, [k]: v });

  return (
    <div className="card space-y-4">
      <h2 className="section-title">자격증 취득 우수성과 지원금 신청 정보</h2>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700 space-y-1">
        <p>• 미래융합가상학과 학생에 한하여 지급됩니다.</p>
        <p>• 지급대상 목록에 없는 자격증은 심의 후 난이도 및 지급 여부가 확정됩니다.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">자격증명 <span className="text-red-500">*</span></label>
          <input className="input-field" value={values.certName} onChange={(e) => set("certName", e.target.value)} placeholder="정보보안기사" />
        </div>
        <div>
          <label className="label">발급기관</label>
          <input className="input-field" value={values.issuingOrg} onChange={(e) => set("issuingOrg", e.target.value)} placeholder="한국산업인력공단" />
        </div>
        <div>
          <label className="label">취득일</label>
          <input className="input-field" type="date" value={values.acquisitionDate} onChange={(e) => set("acquisitionDate", e.target.value)} />
        </div>
        <div>
          <label className="label">자격증 분야</label>
          <input className="input-field" value={values.certField} onChange={(e) => set("certField", e.target.value)} placeholder="정보보안, 데이터분석 등" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">난이도</label>
          <div className="grid grid-cols-4 gap-2">
            {DIFFICULTIES.map((d) => (
              <button key={d.value} type="button" onClick={() => set("difficulty", d.value)} className={`border-2 rounded-lg p-3 text-center transition-colors ${values.difficulty === d.value ? "border-primary-600 bg-primary-50" : "border-gray-200"}`}>
                <div className="font-medium text-sm">{d.label}</div>
                <div className="text-xs text-primary-600 mt-0.5">{d.amount}</div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">지급 예정액 (자동 계산)</label>
          <div className="input-field bg-gray-50 text-primary-700 font-bold">
            {values.difficulty === "review" ? "심의 후 결정" : `${calculatedAmount.toLocaleString()}원`}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <input type="checkbox" id="mirae" checked={values.isMirae} onChange={(e) => set("isMirae", e.target.checked)} className="w-4 h-4 accent-primary-600" />
          <label htmlFor="mirae" className="text-sm text-gray-700">미래융합가상학과 소속임을 확인합니다</label>
        </div>
      </div>
    </div>
  );
}

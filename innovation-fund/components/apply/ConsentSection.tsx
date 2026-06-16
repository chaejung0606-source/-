"use client";
import { CheckCircle } from "lucide-react";

interface ConsentValues { privacy: boolean; truth: boolean; account: boolean; }
interface Props {
  values: ConsentValues;
  onChange: (v: ConsentValues) => void;
  signature: string;
  onSignatureChange: (s: string) => void;
  summary: { name: string; type: string; amount: number; calculatedAmount: number; };
}

export default function ConsentSection({ values, onChange, signature, onSignatureChange, summary }: Props) {
  const set = (k: keyof ConsentValues, v: boolean) => onChange({ ...values, [k]: v });

  const handleSignature = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onSignatureChange(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      {/* 신청 요약 */}
      <div className="card bg-primary-50 border border-primary-200">
        <h2 className="section-title text-primary-800">신청 내용 확인</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-600">신청자</span><span className="font-medium">{summary.name || "-"}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">신청 유형</span><span className="font-medium">{summary.type}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">자동 산정 금액</span><span className="font-medium text-primary-700">{summary.calculatedAmount.toLocaleString()}원</span></div>
          {summary.amount !== summary.calculatedAmount && (
            <div className="flex justify-between"><span className="text-gray-600">신청 금액</span><span className="font-medium">{summary.amount.toLocaleString()}원</span></div>
          )}
        </div>
      </div>

      {/* 동의 */}
      <div className="card">
        <h2 className="section-title">개인정보 수집·이용 동의</h2>
        <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-600 mb-4 leading-relaxed">
          <p className="font-medium text-gray-800 mb-2">개인정보 수집·이용 안내</p>
          <p>수집 항목: 이름, 학번, 소속, 학과, 연락처, 이메일, 계좌정보</p>
          <p>수집 목적: 혁신인재지원금 신청 접수 및 지급 관리</p>
          <p>보유 기간: 지원금 지급 완료 후 5년</p>
          <p className="mt-2">위 개인정보 수집·이용에 동의하지 않으실 경우 지원금 신청이 불가합니다.</p>
        </div>

        <div className="space-y-3">
          {[
            { key: "privacy" as const, label: "개인정보 수집·이용에 동의합니다." },
            { key: "truth" as const, label: "제출한 자료가 사실과 다를 경우 지급 취소 및 환수 조치가 가능함을 확인했습니다." },
            { key: "account" as const, label: "본인 명의 계좌로만 지급 가능함을 확인했습니다." },
          ].map((item) => (
            <label key={item.key} className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 border-2 transition-colors ${values[item.key] ? "bg-primary-600 border-primary-600" : "border-gray-300"}`}>
                {values[item.key] && <CheckCircle className="w-3.5 h-3.5 text-white" />}
              </div>
              <input type="checkbox" className="hidden" checked={values[item.key]} onChange={(e) => set(item.key, e.target.checked)} />
              <span className="text-sm text-gray-700">{item.label} <span className="text-red-500 font-medium">[필수]</span></span>
            </label>
          ))}
        </div>

        {(!values.privacy || !values.truth || !values.account) && (
          <p className="text-red-500 text-sm mt-3">모든 항목에 동의해야 신청을 제출할 수 있습니다.</p>
        )}
      </div>

      {/* 학생 서명 */}
      <div className="card">
        <h2 className="section-title">신청인 서명</h2>
        <p className="text-sm text-gray-500 mb-3">서명 이미지를 업로드하면 지급신청서 서명란에 자동 삽입됩니다. (선택)</p>
        <div className="flex items-center gap-4">
          <label className="btn-secondary cursor-pointer text-sm">
            서명 이미지 업로드
            <input type="file" accept="image/*" className="hidden" onChange={handleSignature} />
          </label>
          {signature && (
            <div className="flex items-center gap-2">
              <img src={signature} alt="서명" className="h-14 border border-gray-200 rounded-lg bg-white px-2" />
              <button onClick={() => onSignatureChange("")} className="text-xs text-red-500 hover:underline">삭제</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

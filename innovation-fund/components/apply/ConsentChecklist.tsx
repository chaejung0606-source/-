"use client";
import { CheckCircle } from "lucide-react";
import { DEFAULT_CONSENT_INTRO, DEFAULT_CONSENT_PRIVACY, DEFAULT_CONSENT_TRUTH, DEFAULT_CONSENT_ACCOUNT } from "@/lib/form-schema";

export interface ConsentValues { privacy: boolean; truth: boolean; account: boolean; }

interface Props {
  values: ConsentValues;
  onChange: (v: ConsentValues) => void;
  isPre?: boolean;  // 지원신청(활동 전): 계좌 관련 동의 제외
  // 관리자가 '신청폼 편집'에서 수정한 안내문·동의 항목 문구(미설정 시 기본 문구)
  intro?: string;
  privacyLabel?: string;
  truthLabel?: string;
  accountLabel?: string;
}

// 기본정보 바로 아래에서 동의받아야 하는 모든 항목을 한 번에 수집.
export default function ConsentChecklist({ values, onChange, isPre = false, intro, privacyLabel, truthLabel, accountLabel }: Props) {
  const set = (k: keyof ConsentValues, v: boolean) => onChange({ ...values, [k]: v });

  const items = [
    { key: "privacy" as const, label: privacyLabel?.trim() || DEFAULT_CONSENT_PRIVACY },
    { key: "truth" as const, label: truthLabel?.trim() || DEFAULT_CONSENT_TRUTH },
    ...(isPre ? [] : [{ key: "account" as const, label: accountLabel?.trim() || DEFAULT_CONSENT_ACCOUNT }]),
  ];
  const allAgreed = items.every((i) => values[i.key]);
  const setAll = (v: boolean) => onChange({ privacy: v, truth: v, account: isPre ? values.account : v });

  return (
    <div className="card">
      <h2 className="section-title">개인정보 수집·이용 및 신청 동의</h2>
      <div className="rounded-2xl p-4 text-xs text-gray-600 mb-4 leading-relaxed whitespace-pre-line" style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.7)" }}>
        <p className="font-semibold text-gray-800 mb-1">개인정보 수집·이용 안내</p>
        {intro?.trim() || DEFAULT_CONSENT_INTRO}
      </div>

      {/* 전체 동의 */}
      <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl mb-2" style={{ background: "rgba(99,102,241,0.06)" }}>
        <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors ${allAgreed ? "bg-primary-600 border-primary-600" : "border-gray-300"}`}>
          {allAgreed && <CheckCircle className="w-3.5 h-3.5 text-white" />}
        </div>
        <input type="checkbox" className="hidden" checked={allAgreed} onChange={(e) => setAll(e.target.checked)} />
        <span className="text-sm font-semibold text-gray-800">아래 내용에 모두 동의합니다.</span>
      </label>

      <div className="space-y-1 pl-1">
        {items.map((item) => (
          <label key={item.key} className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 border-2 transition-colors ${values[item.key] ? "bg-primary-600 border-primary-600" : "border-gray-300"}`}>
              {values[item.key] && <CheckCircle className="w-3.5 h-3.5 text-white" />}
            </div>
            <input type="checkbox" className="hidden" checked={values[item.key]} onChange={(e) => set(item.key, e.target.checked)} />
            <span className="text-sm text-gray-700">{item.label} <span className="text-red-500 font-medium">[필수]</span></span>
          </label>
        ))}
      </div>

      {!allAgreed && (
        <p className="text-red-500 text-sm mt-3">모든 항목에 동의해야 다음 단계로 진행할 수 있습니다.</p>
      )}
    </div>
  );
}

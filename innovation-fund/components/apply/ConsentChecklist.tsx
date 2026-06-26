"use client";
import { CheckCircle } from "lucide-react";

export interface ConsentValues { privacy: boolean; truth: boolean; account: boolean; }

interface Props {
  values: ConsentValues;
  onChange: (v: ConsentValues) => void;
  isPre?: boolean;  // 지원신청(활동 전): 계좌 관련 동의 제외
}

// 기본정보 바로 아래에서 동의받아야 하는 모든 항목을 한 번에 수집.
export default function ConsentChecklist({ values, onChange, isPre = false }: Props) {
  const set = (k: keyof ConsentValues, v: boolean) => onChange({ ...values, [k]: v });

  const items = [
    { key: "privacy" as const, label: "개인정보 수집·이용에 동의합니다." },
    { key: "truth" as const, label: "제출한 자료가 사실과 다를 경우 지원 취소 및 환수 조치가 가능함을 확인했습니다." },
    ...(isPre ? [] : [{ key: "account" as const, label: "본인 명의 계좌로만 지급 가능하며, 입력한 예금주와 제출하는 통장 사본의 예금주가 동일함을 확인했습니다." }]),
  ];
  const allAgreed = items.every((i) => values[i.key]);
  const setAll = (v: boolean) => onChange({ privacy: v, truth: v, account: isPre ? values.account : v });

  return (
    <div className="card">
      <h2 className="section-title">개인정보 수집·이용 및 신청 동의</h2>
      <div className="rounded-2xl p-4 text-xs text-gray-600 mb-4 leading-relaxed" style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.7)" }}>
        <p className="font-semibold text-gray-800 mb-1">개인정보 수집·이용 안내</p>
        <p>• 수집 항목: 이름, 학번, 학적유형, 소속(대학·캠퍼스·학과·전공), 연락처, 이메일, 신청 내용 및 증빙 서류(재학증명서·신분증·통장 사본·성과/참여 증빙 등), 서명{isPre ? "" : ", 본인 명의 계좌정보(은행·예금주·계좌번호)"}</p>
        <p>• 수집 목적: 지원 신청 접수, 자격 검토·심의, 지급 및 정산 관리</p>
        <p>• 보유 기간: 지원금 지급 완료 후 5년</p>
        <p className="mt-1">※ 아래 항목에 모두 동의해야 신청을 진행할 수 있습니다.</p>
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

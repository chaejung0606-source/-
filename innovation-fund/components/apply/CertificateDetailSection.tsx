"use client";
import { useState, useMemo } from "react";
import { AlertTriangle, Search } from "lucide-react";
import {
  SUPPORTED_CERTS, REVIEW_CERTS, ALL_LISTED_CERTS,
  checkUnsupported, CERT_DIFFICULTY_AMOUNT,
  type CertItem,
} from "@/lib/certificate-data";

interface CertDetail {
  certName: string; issuingOrg: string; acquisitionDate: string;
  certField: string; difficulty: "high" | "mid" | "low" | "review"; isMirae: boolean;
}

interface Props { values: CertDetail; onChange: (v: CertDetail) => void; calculatedAmount: number; }

const DIFF_LABEL: Record<string, string> = { high: "상 · 70만원", mid: "중 · 40만원", low: "하 · 10만원", review: "심의 후 결정" };

export default function CertificateDetailSection({ values, onChange, calculatedAmount }: Props) {
  const [inputMode, setInputMode] = useState<"list" | "manual">("list");
  const [search, setSearch] = useState("");
  const [manualInput, setManualInput] = useState("");
  const [unsupportedWarning, setUnsupportedWarning] = useState(false);

  const set = <K extends keyof CertDetail>(k: K, v: CertDetail[K]) => onChange({ ...values, [k]: v });

  // 목록에서 자격증 선택
  const selectCert = (cert: CertItem) => {
    onChange({
      ...values,
      certName: cert.name,
      certField: cert.field || "",
      difficulty: cert.difficulty,
    });
    setManualInput("");
    setUnsupportedWarning(false);
  };

  // 수기 입력 처리
  const handleManualInput = (val: string) => {
    setManualInput(val);
    const isUnsupported = checkUnsupported(val);
    setUnsupportedWarning(isUnsupported);
    onChange({
      ...values,
      certName: val,
      difficulty: "review", // 그 외 자격증은 심의 대상
      certField: values.certField,
    });
  };

  const filteredSupported = useMemo(
    () => SUPPORTED_CERTS.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())),
    [search]
  );
  const filteredReview = useMemo(
    () => REVIEW_CERTS.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())),
    [search]
  );

  const isListSelected = inputMode === "list" && ALL_LISTED_CERTS.some((c) => c.name === values.certName);

  return (
    <div className="card space-y-4">
      <h2 className="section-title">자격증 취득 우수성과 지원금 신청 정보</h2>
      <div className="rounded-2xl p-3 text-sm text-amber-700 space-y-1" style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.3)" }}>
        <p>• 미래융합가상학과 학생에 한하여 지급됩니다.</p>
        <p>• 목록에서 자격증을 선택하거나, 목록에 없는 경우 직접 입력해주세요. (둘 중 하나 필수)</p>
        <p>• 목록에 없는 자격증은 심의 후 지급 여부와 난이도가 확정됩니다.</p>
      </div>

      {/* 입력 방식 토글 */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => { setInputMode("list"); setManualInput(""); setUnsupportedWarning(false); if (!ALL_LISTED_CERTS.some(c => c.name === values.certName)) set("certName", ""); }}
          className={`rounded-2xl p-3 text-center text-sm font-semibold transition-all ${inputMode === "list" ? "btn-primary" : "btn-secondary"}`}
        >
          목록에서 선택
        </button>
        <button
          type="button"
          onClick={() => { setInputMode("manual"); set("certName", ""); }}
          className={`rounded-2xl p-3 text-center text-sm font-semibold transition-all ${inputMode === "manual" ? "btn-primary" : "btn-secondary"}`}
        >
          그 외 자격증 직접 입력
        </button>
      </div>

      {/* 목록 선택 모드 */}
      {inputMode === "list" && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input-field pl-10" placeholder="자격증명 검색" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          {values.certName && isListSelected && (
            <div className="rounded-2xl p-3 text-sm font-medium" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)" }}>
              선택됨: <span className="text-indigo-700 font-bold">{values.certName}</span>
              <span className="ml-2 text-xs text-gray-500">({DIFF_LABEL[values.difficulty]})</span>
            </div>
          )}

          <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
            {/* 지원가능 */}
            <div>
              <div className="text-xs font-bold text-green-600 mb-1.5 sticky top-0">✓ 지원가능 자격증</div>
              <div className="space-y-1">
                {filteredSupported.map((cert) => (
                  <button
                    key={cert.name}
                    type="button"
                    onClick={() => selectCert(cert)}
                    className={`w-full text-left rounded-xl px-3 py-2 text-sm transition-all ${values.certName === cert.name ? "btn-primary" : "glass hover:bg-white"}`}
                  >
                    <span className="font-medium">{cert.name}</span>
                    <span className={`ml-2 text-xs ${values.certName === cert.name ? "text-white/80" : "text-gray-400"}`}>{DIFF_LABEL[cert.difficulty]}</span>
                  </button>
                ))}
                {filteredSupported.length === 0 && <p className="text-xs text-gray-400 px-3">검색 결과 없음</p>}
              </div>
            </div>
            {/* 심의대상 */}
            <div>
              <div className="text-xs font-bold text-purple-600 mb-1.5">◑ 심의대상 자격증 (심의 후 확정)</div>
              <div className="space-y-1">
                {filteredReview.map((cert) => (
                  <button
                    key={cert.name}
                    type="button"
                    onClick={() => selectCert(cert)}
                    className={`w-full text-left rounded-xl px-3 py-2 text-sm transition-all ${values.certName === cert.name ? "btn-primary" : "glass hover:bg-white"}`}
                  >
                    <span className="font-medium">{cert.name}</span>
                    <span className={`ml-2 text-xs ${values.certName === cert.name ? "text-white/80" : "text-gray-400"}`}>심의대상</span>
                  </button>
                ))}
                {filteredReview.length === 0 && <p className="text-xs text-gray-400 px-3">검색 결과 없음</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 수기 입력 모드 */}
      {inputMode === "manual" && (
        <div className="space-y-2">
          <label className="label">자격증명 직접 입력 <span className="text-red-500">*</span></label>
          <input
            className="input-field"
            value={manualInput}
            onChange={(e) => handleManualInput(e.target.value)}
            placeholder="목록에 없는 자격증명을 입력하세요"
          />
          {unsupportedWarning && (
            <div className="flex items-start gap-2 rounded-2xl p-3 text-sm text-red-700" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span><strong>지원불가 자격증입니다.</strong> 입력하신 자격증은 사업단 지원 대상이 아닙니다. 다른 자격증을 확인해주세요.</span>
            </div>
          )}
          {manualInput && !unsupportedWarning && (
            <p className="text-xs text-purple-600">※ 목록에 없는 자격증은 심의 후 지급 여부와 난이도가 확정됩니다.</p>
          )}
        </div>
      )}

      {/* 공통 입력 */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">발급기관</label>
          <input className="input-field" value={values.issuingOrg} onChange={(e) => set("issuingOrg", e.target.value)} placeholder="한국산업인력공단" />
        </div>
        <div>
          <label className="label">취득일</label>
          <input className="input-field" type="date" value={values.acquisitionDate} onChange={(e) => set("acquisitionDate", e.target.value)} />
        </div>
        <div>
          <label className="label">지급 예정액 (자동 계산)</label>
          <div className="input-field font-bold text-indigo-700">
            {values.difficulty === "review" ? "심의 후 결정" : `${calculatedAmount.toLocaleString()}원`}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-7">
          <input type="checkbox" id="mirae" checked={values.isMirae} onChange={(e) => set("isMirae", e.target.checked)} className="w-4 h-4 accent-indigo-600" />
          <label htmlFor="mirae" className="text-sm text-gray-700">미래융합가상학과 소속임을 확인합니다</label>
        </div>
      </div>
    </div>
  );
}

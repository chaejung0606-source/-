"use client";
import { useState } from "react";
import { CheckCircle } from "lucide-react";
import SignaturePad from "./SignaturePad";

interface Props {
  signature: string;
  onSignatureChange: (s: string) => void;
  summary: { name: string; type: string; amount: number; calculatedAmount: number; };
  isPre?: boolean;  // 지원신청: 계좌·금액 관련 항목 제외
}

export default function ConsentSection({ signature, onSignatureChange, summary, isPre = false }: Props) {
  const [sigMode, setSigMode] = useState<"draw" | "upload">("draw");

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
          {!isPre && (
            <>
              <div className="flex justify-between"><span className="text-gray-600">자동 산정 금액</span><span className="font-medium text-primary-700">{summary.calculatedAmount.toLocaleString()}원</span></div>
              {summary.amount !== summary.calculatedAmount && (
                <div className="flex justify-between"><span className="text-gray-600">신청 금액</span><span className="font-medium">{summary.amount.toLocaleString()}원</span></div>
              )}
            </>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-500 px-1">※ 개인정보 수집·이용 및 신청 동의는 1단계(기본 정보)에서 완료되었습니다.</p>

      {/* 학생 서명 */}
      <div className="card">
        <h2 className="section-title">신청인 서명 <span className="text-red-500">*</span></h2>
        <p className="text-sm text-gray-500 mb-3">직접 서명하거나 서명 이미지를 업로드하세요. 지급신청서 서명란에 자동 삽입됩니다. <span className="text-red-500 font-medium">(필수)</span></p>

        {/* 방식 선택 */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl mb-4 bg-gray-50 border border-gray-100 max-w-xs">
          <button type="button" onClick={() => setSigMode("draw")}
            className={`py-2 rounded-xl text-sm font-semibold transition ${sigMode === "draw" ? "bg-primary-600 text-white" : "text-gray-600"}`}>
            직접 서명
          </button>
          <button type="button" onClick={() => setSigMode("upload")}
            className={`py-2 rounded-xl text-sm font-semibold transition ${sigMode === "upload" ? "bg-primary-600 text-white" : "text-gray-600"}`}>
            이미지 업로드
          </button>
        </div>

        {sigMode === "draw" ? (
          <SignaturePad onChange={onSignatureChange} />
        ) : (
          <div className="flex items-center gap-4">
            <label className={`cursor-pointer text-sm ${signature ? "btn-secondary" : "btn-primary"}`}>
              서명 이미지 업로드
              <input type="file" accept="image/*" className="hidden" onChange={handleSignature} />
            </label>
            {signature && (
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={signature} alt="서명" className="h-14 border border-gray-200 rounded-lg bg-white px-2" />
                <button type="button" onClick={() => onSignatureChange("")} className="text-xs text-red-500 hover:underline">삭제</button>
              </div>
            )}
          </div>
        )}

        {signature && (
          <p className="text-xs text-green-600 mt-2 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> 서명이 적용되었습니다.</p>
        )}
      </div>
    </div>
  );
}

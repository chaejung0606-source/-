"use client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { Suspense } from "react";

function CompleteContent() {
  const params = useSearchParams();
  const receiptNumber = params.get("receipt") || "-";
  const applicationDate = params.get("date") || "-";
  const applicationType = params.get("type") || "-";
  const amount = params.get("amount") || "0";
  const isPre = params.get("phase") === "pre";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-xl w-full">
        <div className="card text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">{isPre ? "지원신청이 정상 접수되었습니다" : "신청이 정상 접수되었습니다"}</h1>
          <p className="text-gray-500 mb-8">{isPre ? "검토 후 참여 승인 여부가 안내됩니다." : "검토 후 지급 여부가 결정됩니다."}</p>

          <div className="bg-gray-50 rounded-xl p-6 text-left space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">접수번호</span>
              <span className="font-bold text-primary-700">{receiptNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">신청일</span>
              <span className="font-medium">{applicationDate}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">신청 유형</span>
              <span className="font-medium">{applicationType}</span>
            </div>
            {!isPre && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">신청 금액</span>
                <span className="font-medium">{Number(amount).toLocaleString()}원</span>
              </div>
            )}
          </div>

          <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-4 text-left mb-4">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>허위 신청 또는 부적격 사유 확인 시 지급이 취소되거나 환수될 수 있습니다.</p>
          </div>

          {/* 지급은 연구통합관리시스템에 등록한 본인 명의 계좌로만 처리됨 — 등록 누락 시 지급 지연/불가 */}
          <div className="text-sm text-indigo-800 bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-left mb-6">
            <p className="font-semibold mb-1">💳 지원금을 받으려면 ‘본인 명의 계좌’ 등록이 필요합니다</p>
            <p className="text-indigo-700 leading-relaxed">실제 지급은 <strong>연구통합관리시스템(학생용)</strong>에 등록된 본인 명의 계좌로 처리됩니다. 아직 등록하지 않았다면 꼭 등록해주세요. (미등록 시 지급이 지연·불가할 수 있습니다.)</p>
            <a href="https://knu-icf.kangwon.ac.kr/issue_main2.act" target="_blank" rel="noopener noreferrer" className="inline-block mt-2 font-semibold text-indigo-600 underline">▶ 연구통합관리시스템 본인계좌 등록하러 가기</a>
          </div>

          <Link href="/" className="btn-primary w-full block text-center">
            메인으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CompletePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">로딩 중...</div>}>
      <CompleteContent />
    </Suspense>
  );
}

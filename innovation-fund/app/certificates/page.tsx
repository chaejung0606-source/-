"use client";
import Link from "next/link";
import { ArrowLeft, Home as HomeIcon } from "lucide-react";
import TopNav from "@/components/home/TopNav";
import CertList from "@/components/home/CertList";

// 자격증 목록 — 상단바 '자격증 목록' 메뉴에서 진입하는 독립 페이지 (공간대여 페이지와 동일한 구조)
export default function CertificatesPage() {
  return (
    <div className="min-h-screen">
      <header className="glass-header sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 flex items-center justify-center shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/sdu-shield.png" alt="SDU 사업단 로고" className="w-full h-full object-contain" />
            </div>
            <div className="font-bold text-sm sm:text-lg leading-tight holo-text truncate">학생 지원금 신청 플랫폼</div>
          </Link>
          <TopNav />
          <Link href="/" className="glass-pill px-4 h-10 flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-indigo-600 shrink-0"><HomeIcon className="w-4 h-4" /> 홈</Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 pb-28">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-indigo-500 hover:text-indigo-700 mb-4"><ArrowLeft className="w-4 h-4" /> 홈으로</Link>
        <CertList />
      </div>
    </div>
  );
}

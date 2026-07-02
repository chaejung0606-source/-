import type { Metadata, Viewport } from "next";
import { Nanum_Pen_Script, Black_Han_Sans } from "next/font/google";
import "./globals.css";
import CursorGlitter from "@/components/common/CursorGlitter";
import ApplicantDashboard from "@/components/mypage/ApplicantDashboard";
import HeroClouds from "@/components/home/HeroClouds";

const handwriting = Nanum_Pen_Script({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-handwriting",
  display: "swap",
});

// 굵고 임팩트 있는 제목용 한글 글씨체 (검은고딕)
const bubble = Black_Han_Sans({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bubble",
  display: "swap",
});

export const metadata: Metadata = {
  title: "학생 지원금 신청 플랫폼 / 강원대학교 데이터보안·활용 혁신융합대학사업단",
  description: "강원대학교 데이터보안·활용 혁신융합대학사업단 학생 지원금 신청 및 관리 플랫폼",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${handwriting.variable} ${bubble.variable}`}>
      <body>
        {/* 모든 페이지 공통 배경 — 홈과 동일한 뭉게구름·하늘 (본문 뒤 고정) */}
        <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden" aria-hidden="true">
          <HeroClouds />
        </div>
        {/* 마우스 포인터를 따라다니는 반짝이 */}
        <CursorGlitter />
        {children}
        {/* 신청자 로그인 시 모든 페이지 왼쪽에 뜨는 '내 신청 현황' 대시보드 (관리자 영역 제외) */}
        <ApplicantDashboard />
      </body>
    </html>
  );
}

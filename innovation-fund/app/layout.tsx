import type { Metadata, Viewport } from "next";
import { Nanum_Pen_Script } from "next/font/google";
import "./globals.css";
import CursorGlitter from "@/components/common/CursorGlitter";

const handwriting = Nanum_Pen_Script({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-handwriting",
  display: "swap",
});

export const metadata: Metadata = {
  title: "혁신인재지원금 신청 플랫폼 | 강원대학교 데이터보안·활용 혁신융합대학사업단",
  description: "강원대학교 데이터보안·활용 혁신융합대학사업단 혁신인재지원금 신청 및 관리 플랫폼",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={handwriting.variable}>
      <body>
        {/* 영롱한 글리터 오버레이 (클릭 비차단, 콘텐츠 뒤) */}
        <div className="glitter-overlay" aria-hidden="true" />
        {/* 마우스 포인터를 따라다니는 반짝이 */}
        <CursorGlitter />
        {children}
      </body>
    </html>
  );
}

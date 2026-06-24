import type { Metadata, Viewport } from "next";
import { Nanum_Pen_Script, Black_Han_Sans } from "next/font/google";
import "./globals.css";
import CursorGlitter from "@/components/common/CursorGlitter";

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
    <html lang="ko" className={`${handwriting.variable} ${bubble.variable}`}>
      <body>
        {/* 마우스 포인터를 따라다니는 반짝이 */}
        <CursorGlitter />
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "혁신인재지원금 신청 플랫폼 | 강원대학교 데이터보안·활용 혁신융합대학사업단",
  description: "강원대학교 데이터보안·활용 혁신융합대학사업단 혁신인재지원금 신청 및 관리 플랫폼",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

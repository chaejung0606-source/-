"use client";
import Link from "next/link";
import { Shield } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6" />
            <span className="font-bold">혁신인재지원금 관리 시스템</span>
          </div>
          <nav className="flex gap-4 text-sm">
            <Link href="/admin/dashboard" className="text-primary-200 hover:text-white">대시보드</Link>
            <Link href="/admin/applications" className="text-primary-200 hover:text-white">신청 목록</Link>
            <Link href="/" className="text-primary-200 hover:text-white">메인 사이트</Link>
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}

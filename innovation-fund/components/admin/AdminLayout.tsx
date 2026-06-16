"use client";
import Link from "next/link";
import { Shield } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="glass-header sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-indigo-600" />
            <span className="font-bold holo-text">혁신인재지원금 관리 시스템</span>
          </div>
          <nav className="flex gap-5 text-sm font-medium">
            <Link href="/admin/dashboard" className="text-indigo-500 hover:text-indigo-700">대시보드</Link>
            <Link href="/admin/applications" className="text-indigo-500 hover:text-indigo-700">신청 목록</Link>
            <Link href="/" className="text-indigo-500 hover:text-indigo-700">메인 사이트</Link>
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}

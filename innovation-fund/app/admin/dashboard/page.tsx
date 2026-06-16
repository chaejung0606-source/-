"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Clock, AlertCircle, CheckCircle, XCircle, Users } from "lucide-react";
import type { Application, ReviewStatus, PaymentStatus } from "@/types";
import AdminLayout from "@/components/admin/AdminLayout";

export default function AdminDashboard() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/applications").then((r) => r.json()).then((d) => { setApps(d); setLoading(false); });
  }, []);

  const count = (field: "reviewStatus" | "paymentStatus", val: string) =>
    apps.filter((a) => a[field] === val).length;

  const reviewStats: { label: string; value: ReviewStatus; color: string; icon: React.ReactNode }[] = [
    { label: "접수완료", value: "received", color: "bg-blue-100 text-blue-700", icon: <FileText className="w-5 h-5" /> },
    { label: "검토중", value: "reviewing", color: "bg-yellow-100 text-yellow-700", icon: <Clock className="w-5 h-5" /> },
    { label: "보완요청", value: "supplement", color: "bg-orange-100 text-orange-700", icon: <AlertCircle className="w-5 h-5" /> },
    { label: "심의필요", value: "committee", color: "bg-purple-100 text-purple-700", icon: <Users className="w-5 h-5" /> },
    { label: "승인", value: "approved", color: "bg-green-100 text-green-700", icon: <CheckCircle className="w-5 h-5" /> },
    { label: "반려", value: "rejected", color: "bg-red-100 text-red-700", icon: <XCircle className="w-5 h-5" /> },
  ];

  const payStats: { label: string; value: PaymentStatus; color: string }[] = [
    { label: "지급대기", value: "waiting", color: "bg-gray-100 text-gray-700" },
    { label: "지출결의중", value: "processing", color: "bg-blue-100 text-blue-700" },
    { label: "지출완료", value: "completed", color: "bg-green-100 text-green-700" },
    { label: "지급보류", value: "hold", color: "bg-orange-100 text-orange-700" },
    { label: "환수대상", value: "refund", color: "bg-red-100 text-red-700" },
  ];

  if (loading) return <AdminLayout><div className="text-center py-20 text-gray-400">로딩 중...</div></AdminLayout>;

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">대시보드</h1>

      {/* 총계 */}
      <div className="card mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
            <FileText className="w-6 h-6 text-primary-700" />
          </div>
          <div>
            <div className="text-3xl font-bold text-primary-700">{apps.length}</div>
            <div className="text-gray-500 text-sm">전체 신청 건수</div>
          </div>
        </div>
      </div>

      {/* 검토 상태 */}
      <h2 className="font-semibold text-gray-700 mb-3">검토 상태</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {reviewStats.map((s) => (
          <div key={s.value} className={`rounded-xl p-4 ${s.color}`}>
            <div className="flex items-center gap-2 mb-1">{s.icon}<span className="text-xs font-medium">{s.label}</span></div>
            <div className="text-2xl font-bold">{count("reviewStatus", s.value)}</div>
          </div>
        ))}
      </div>

      {/* 지급 상태 */}
      <h2 className="font-semibold text-gray-700 mb-3">지급 상태</h2>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
        {payStats.map((s) => (
          <div key={s.value} className={`rounded-xl p-4 ${s.color}`}>
            <div className="text-xs font-medium mb-1">{s.label}</div>
            <div className="text-2xl font-bold">{count("paymentStatus", s.value)}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Link href="/admin/applications" className="btn-primary">신청 목록 보기 →</Link>
      </div>
    </AdminLayout>
  );
}

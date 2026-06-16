"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import type { Application } from "@/types";
import {
  REVIEW_STATUS_META, PAYMENT_STATUS_META, REVIEW_STATUS_ORDER, PAYMENT_STATUS_ORDER,
} from "@/config/status";
import AdminLayout from "@/components/admin/AdminLayout";

export default function AdminDashboard() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/applications").then((r) => r.json()).then((d) => { setApps(d); setLoading(false); });
  }, []);

  const count = (field: "reviewStatus" | "paymentStatus", val: string) =>
    apps.filter((a) => a[field] === val).length;

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
        {REVIEW_STATUS_ORDER.map((s) => (
          <div key={s} className={`rounded-2xl p-4 ${REVIEW_STATUS_META[s].badge}`}>
            <div className="text-xs font-medium mb-1">{REVIEW_STATUS_META[s].label}</div>
            <div className="text-2xl font-bold">{count("reviewStatus", s)}</div>
          </div>
        ))}
      </div>

      {/* 지급 상태 */}
      <h2 className="font-semibold text-gray-700 mb-3">지급 상태</h2>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
        {PAYMENT_STATUS_ORDER.map((s) => (
          <div key={s} className={`rounded-2xl p-4 ${PAYMENT_STATUS_META[s].badge}`}>
            <div className="text-xs font-medium mb-1">{PAYMENT_STATUS_META[s].label}</div>
            <div className="text-2xl font-bold">{count("paymentStatus", s)}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Link href="/admin/applications" className="btn-primary">신청 목록 보기 →</Link>
      </div>
    </AdminLayout>
  );
}

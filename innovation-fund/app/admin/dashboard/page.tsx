"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// 대시보드는 신청 목록 상단으로 통합되었습니다. 기존 경로는 신청 목록으로 이동합니다.
export default function AdminDashboardRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin/applications"); }, [router]);
  return <div className="min-h-screen flex items-center justify-center text-gray-400">신청 목록으로 이동 중...</div>;
}

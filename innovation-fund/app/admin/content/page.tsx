"use client";
import AdminLayout from "@/components/admin/AdminLayout";
import ContentPanel from "@/components/admin/ContentPanel";

// '유형별 지급 기준'은 신청폼 편집 메뉴 탭으로 통합됨. 이 경로는 직접 접근용으로 유지.
export default function ContentAdminPage() {
  return <AdminLayout><ContentPanel /></AdminLayout>;
}

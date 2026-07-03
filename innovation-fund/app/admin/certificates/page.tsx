"use client";
import AdminLayout from "@/components/admin/AdminLayout";
import CertificatesPanel from "@/components/admin/CertificatesPanel";

// '자격증 목록'은 신청폼 편집 메뉴 탭으로 통합됨. 이 경로는 직접 접근용으로 유지.
export default function CertificatesAdminPage() {
  return <AdminLayout><CertificatesPanel /></AdminLayout>;
}

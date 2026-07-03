"use client";
import AdminLayout from "@/components/admin/AdminLayout";
import FileStoragePanel from "@/components/admin/FileStoragePanel";

// '파일 저장 경로'는 사이트 설정 메뉴 탭으로 통합됨. 이 경로는 직접 접근용으로 유지.
export default function SettingsPage() {
  return <AdminLayout><FileStoragePanel /></AdminLayout>;
}

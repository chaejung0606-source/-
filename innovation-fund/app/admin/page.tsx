import { redirect } from "next/navigation";

// /admin 진입 시 관리자 기본 화면(신청 목록)으로 이동 — 인증은 이동 대상 페이지에서 처리.
export default function AdminIndex() {
  redirect("/admin/applications");
}

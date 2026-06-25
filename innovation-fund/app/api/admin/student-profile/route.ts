import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAdminSession } from "@/lib/admin-auth";

// 관리자: 대리 신청용 신청자 프로필 조회 (Auth user_metadata 기준 → 폼 자동입력)
export async function GET(req: NextRequest) {
  if (!(await getAdminSession(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });

  const admin = supabaseAdmin();
  const { data, error } = await admin.auth.admin.getUserById(id);
  if (error || !data?.user) return NextResponse.json({ error: "신청자를 찾을 수 없습니다." }, { status: 404 });
  const m = (data.user.user_metadata || {}) as Record<string, unknown>;
  // 계좌 등 일부는 프로필 테이블이 더 최신일 수 있어 보강
  const { data: prof } = await admin.from("student_profiles").select("*").eq("id", id).maybeSingle();
  const p = (prof || {}) as Record<string, unknown>;
  return NextResponse.json({
    profile: {
      studentId: String(m.studentId || p.student_id || ""),
      name: String(m.name || p.name || ""),
      campus: String(m.campus || p.campus || ""),
      department: String(m.department || p.department || ""),
      phone: String(m.phone || p.phone || ""),
      email: String(m.realEmail || p.email || ""),
      university: String(m.university || p.university || "강원대학교"),
      bankName: String(m.bankName || p.bank_name || ""),
      accountNumber: String(m.accountNumber || p.account_number || ""),
      accountHolder: String(m.accountHolder || p.account_holder || ""),
      timetable: Array.isArray((m as { timetable?: unknown }).timetable) ? (m as { timetable: unknown[] }).timetable : [],
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireExpense } from "@/lib/admin-auth";

// 관리자: 신청자 비밀번호 재설정 (평문 비밀번호는 조회 불가 → 새 비밀번호로 재설정)
export async function POST(req: NextRequest) {
  if (!(await requireExpense(req))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { id, password } = await req.json().catch(() => ({}));
  if (!id || !password) return NextResponse.json({ ok: false, error: "대상과 새 비밀번호가 필요합니다." }, { status: 400 });
  if (String(password).length < 8) return NextResponse.json({ ok: false, error: "비밀번호는 8자 이상이어야 합니다." }, { status: 400 });

  const { error } = await supabaseAdmin().auth.admin.updateUserById(id, { password: String(password) });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

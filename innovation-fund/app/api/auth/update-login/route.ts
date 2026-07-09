import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

// 신청자 비밀번호 변경 — 현재 비밀번호로 본인 확인 후 새 비밀번호로 교체.
export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ ok: false, error: "인증이 필요합니다." }, { status: 401 });

  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: { user }, error: authError } = await anon.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const currentPassword = String(b.currentPassword || "");
  const newPassword = String(b.newPassword || "");

  if (!currentPassword) return NextResponse.json({ ok: false, error: "현재 비밀번호를 입력해주세요." }, { status: 400 });
  if (!newPassword) return NextResponse.json({ ok: false, error: "새 비밀번호를 입력해주세요." }, { status: 400 });
  if (newPassword.length < 8) return NextResponse.json({ ok: false, error: "비밀번호는 8자 이상이어야 합니다." }, { status: 400 });

  // 본인 확인 — 현재 비밀번호로 재인증(별도 클라이언트라 현재 세션에 영향 없음)
  const reauth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { error: pwErr } = await reauth.auth.signInWithPassword({ email: user.email || "", password: currentPassword });
  if (pwErr) return NextResponse.json({ ok: false, error: "현재 비밀번호가 올바르지 않습니다." }, { status: 401 });

  const { error: upErr } = await supabaseAdmin().auth.admin.updateUserById(user.id, { password: newPassword });
  if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}

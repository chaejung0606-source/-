import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

// 신청자 로그인 정보 수정 — 학번(아이디) / 비밀번호 변경.
// 학번 변경은 Auth 합성 이메일·user_metadata·student_profiles·applications(비정규화 student_id)에
// 모두 반영하여 관리자 페이지(신청자/신청 목록)에서도 일관되게 보이도록 한다.
const APPLICANT_EMAIL_DOMAIN = "coss-applicant.kangwon.ac.kr";
const emailForStudentId = (sid: string) => `${sid.trim().toLowerCase()}@${APPLICANT_EMAIL_DOMAIN}`;

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
  const newStudentId = b.newStudentId === undefined ? null : String(b.newStudentId).trim();
  const newPassword = b.newPassword === undefined ? null : String(b.newPassword);

  if (!currentPassword) return NextResponse.json({ ok: false, error: "현재 비밀번호를 입력해주세요." }, { status: 400 });

  // 본인 확인 — 현재 비밀번호로 재인증(별도 클라이언트라 현재 세션에 영향 없음)
  const reauth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { error: pwErr } = await reauth.auth.signInWithPassword({ email: user.email || "", password: currentPassword });
  if (pwErr) return NextResponse.json({ ok: false, error: "현재 비밀번호가 올바르지 않습니다." }, { status: 401 });

  const admin = supabaseAdmin();
  const meta = (user.user_metadata || {}) as Record<string, unknown>;
  const curStudentId = String(meta.studentId || "");

  const changingId = !!newStudentId && newStudentId !== curStudentId;
  const changingPw = !!newPassword;
  if (!changingId && !changingPw) return NextResponse.json({ ok: false, error: "변경할 내용이 없습니다." }, { status: 400 });

  if (changingPw && newPassword!.length < 6) {
    return NextResponse.json({ ok: false, error: "비밀번호는 6자 이상이어야 합니다." }, { status: 400 });
  }

  if (changingId) {
    if (!/^[A-Za-z0-9]{4,20}$/.test(newStudentId!)) {
      return NextResponse.json({ ok: false, error: "학번은 영문/숫자 4~20자로 입력해주세요." }, { status: 400 });
    }
    // 중복 확인 (다른 사용자가 이미 사용 중인 학번 차단)
    const { data: dup } = await admin.from("student_profiles").select("id").eq("student_id", newStudentId!).maybeSingle();
    if (dup && dup.id !== user.id) {
      return NextResponse.json({ ok: false, error: "이미 사용 중인 학번입니다." }, { status: 409 });
    }
  }

  // 1) Auth 계정 갱신 (이메일/메타/비밀번호)
  const updatePayload: Record<string, unknown> = {};
  if (changingId) {
    updatePayload.email = emailForStudentId(newStudentId!);
    updatePayload.email_confirm = true;
    updatePayload.user_metadata = { ...meta, studentId: newStudentId };
  }
  if (changingPw) updatePayload.password = newPassword;
  const { error: upErr } = await admin.auth.admin.updateUserById(user.id, updatePayload);
  if (upErr) {
    const msg = /already.*registered|email/i.test(upErr.message) ? "이미 사용 중인 학번입니다." : upErr.message;
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }

  // 2) 학번 변경 시 프로필·신청서의 비정규화 학번도 동기화 → 관리자 페이지 반영
  if (changingId) {
    const { error: pErr } = await admin.from("student_profiles").update({ student_id: newStudentId }).eq("id", user.id);
    if (pErr) return NextResponse.json({ ok: false, error: "프로필 학번 갱신 실패: " + pErr.message }, { status: 500 });
    await admin.from("applications").update({ student_id: newStudentId }).eq("applicant_id", user.id);
  }

  return NextResponse.json({ ok: true, studentId: changingId ? newStudentId : curStudentId, passwordChanged: changingPw });
}

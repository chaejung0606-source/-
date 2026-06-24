import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const APPLICANT_EMAIL_DOMAIN = "coss-applicant.kangwon.ac.kr";

// 서버에서 service_role로 신청자 계정 생성 (email_confirm=true → 이메일 확인 불필요).
// 합성 이메일을 쓰므로 이렇게 해야 가입 즉시 로그인 가능.
export async function POST(req: NextRequest) {
  const b = await req.json();
  const studentId = String(b.studentId || "").trim();
  const password = String(b.password || "");
  const name = String(b.name || "").trim();

  if (!studentId || !password || !name) {
    return NextResponse.json({ ok: false, error: "필수 정보를 모두 입력해주세요." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ ok: false, error: "비밀번호는 6자 이상이어야 합니다." }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const email = `${studentId.toLowerCase()}@${APPLICANT_EMAIL_DOMAIN}`;
  const meta = {
    studentId,
    name,
    campus: String(b.campus || "").trim(),
    department: String(b.department || "").trim(),
    phone: String(b.phone || "").trim(),
    realEmail: String(b.email || "").trim(),
    university: String(b.university || "강원대학교").trim(),
    bankName: String(b.bankName || "").trim(),
    accountNumber: String(b.accountNumber || "").trim(),
    accountHolder: String(b.accountHolder || "").trim(),
  };

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: meta,
  });

  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes("already") || m.includes("registered") || m.includes("exists")) {
      return NextResponse.json({ ok: false, error: "이미 가입된 학번입니다." }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  const uid = data.user?.id;
  if (uid) {
    await admin.from("student_profiles").upsert({
      id: uid, student_id: studentId, name: meta.name, department: meta.department,
      phone: meta.phone, email: meta.realEmail, university: meta.university,
      bank_name: meta.bankName, account_number: meta.accountNumber, account_holder: meta.accountHolder,
    });
  }

  return NextResponse.json({ ok: true });
}

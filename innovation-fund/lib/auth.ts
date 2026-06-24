// 신청자(학생) 인증 — Supabase Auth 기반.
// 로그인은 학번 + 비밀번호. 학번을 합성 이메일로 매핑해 Auth에 사용(사용자는 학번만 입력).
// 비밀번호는 Supabase가 bcrypt로 해시, 세션은 JWT(쿠키/스토리지) — 평문 저장/사칭 위험 제거.
import { supabase } from "./supabase";
import type { ClassTime } from "@/types";

const APPLICANT_EMAIL_DOMAIN = "coss-applicant.kangwon.ac.kr";
const emailForStudentId = (sid: string) => `${sid.trim().toLowerCase()}@${APPLICANT_EMAIL_DOMAIN}`;

export interface StudentUser {
  studentId: string;
  name: string;
  campus: string;
  department: string;
  phone: string;
  email: string;
  university: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  timetable: ClassTime[];
}

export interface RegisterInput {
  studentId: string; password: string; name: string;
  campus?: string; department: string; phone: string; email: string; university?: string;
  bankName?: string; accountNumber?: string; accountHolder?: string;
}

export async function register(input: RegisterInput): Promise<{ ok: boolean; error?: string }> {
  const studentId = input.studentId.trim();
  if (!studentId || !input.password || !input.name.trim()) return { ok: false, error: "필수 정보를 모두 입력해주세요." };
  if (input.password.length < 6) return { ok: false, error: "비밀번호는 6자 이상이어야 합니다." };

  // 서버(service_role)에서 계정 생성 — 이메일 확인 불필요(email_confirm=true)
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      studentId, password: input.password, name: input.name.trim(),
      campus: input.campus || "", department: input.department.trim(), phone: input.phone.trim(),
      email: input.email.trim(), university: input.university || "강원대학교",
      bankName: input.bankName || "", accountNumber: input.accountNumber || "", accountHolder: input.accountHolder || "",
    }),
  });
  const j = await res.json().catch(() => ({ ok: false, error: "서버 응답 오류" }));
  if (!j.ok) return { ok: false, error: j.error || "회원가입에 실패했습니다." };

  // 가입 직후 로그인하여 세션 생성
  return login(studentId, input.password);
}

export async function login(studentId: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.auth.signInWithPassword({
    email: emailForStudentId(studentId), password,
  });
  if (error) return { ok: false, error: "학번 또는 비밀번호가 올바르지 않습니다." };
  return { ok: true };
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
}

// 현재 로그인한 신청자의 비밀번호 확인 (개인정보·시간표 수정 전 본인 확인용)
export async function verifyPassword(password: string): Promise<boolean> {
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email;
  if (!email || !password) return false;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return !error;
}

export async function currentUser(): Promise<StudentUser | null> {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;

  const meta = (user.user_metadata || {}) as Record<string, any>;
  const timetable: ClassTime[] = Array.isArray(meta.timetable) ? meta.timetable : [];

  const { data: p } = await supabase
    .from("student_profiles").select("*").eq("id", user.id).maybeSingle();
  if (p) {
    return {
      studentId: p.student_id, name: p.name, campus: p.campus || meta.campus || "", department: p.department || "",
      phone: p.phone || "", email: p.email || "", university: p.university || "강원대학교",
      bankName: p.bank_name || "", accountNumber: p.account_number || "", accountHolder: p.account_holder || "",
      timetable,
    };
  }
  // 프로필이 없으면 user_metadata로 대체
  const m = meta as Record<string, string>;
  return {
    studentId: m.studentId || "", name: m.name || "", campus: m.campus || "", department: m.department || "",
    phone: m.phone || "", email: m.realEmail || "", university: m.university || "강원대학교",
    bankName: m.bankName || "", accountNumber: m.accountNumber || "", accountHolder: m.accountHolder || "",
    timetable,
  };
}

// 신청자(학생) 인증 — Supabase Auth 기반.
// 로그인은 학번 + 비밀번호. 학번을 합성 이메일로 매핑해 Auth에 사용(사용자는 학번만 입력).
// 비밀번호는 Supabase가 bcrypt로 해시, 세션은 JWT(쿠키/스토리지) — 평문 저장/사칭 위험 제거.
import { supabase } from "./supabase";

const APPLICANT_EMAIL_DOMAIN = "coss-applicant.kangwon.ac.kr";
const emailForStudentId = (sid: string) => `${sid.trim().toLowerCase()}@${APPLICANT_EMAIL_DOMAIN}`;

export interface StudentUser {
  studentId: string;
  name: string;
  department: string;
  phone: string;
  email: string;
  university: string;
}

export interface RegisterInput {
  studentId: string; password: string; name: string;
  department: string; phone: string; email: string; university?: string;
}

export async function register(input: RegisterInput): Promise<{ ok: boolean; error?: string }> {
  const studentId = input.studentId.trim();
  if (!studentId || !input.password || !input.name.trim()) return { ok: false, error: "필수 정보를 모두 입력해주세요." };
  if (input.password.length < 6) return { ok: false, error: "비밀번호는 6자 이상이어야 합니다." };

  const meta = {
    studentId,
    name: input.name.trim(),
    department: input.department.trim(),
    phone: input.phone.trim(),
    realEmail: input.email.trim(),
    university: (input.university || "강원대학교").trim(),
  };

  const { data, error } = await supabase.auth.signUp({
    email: emailForStudentId(studentId),
    password: input.password,
    options: { data: meta },
  });
  if (error) {
    if (error.message.toLowerCase().includes("already") || error.message.includes("registered")) {
      return { ok: false, error: "이미 가입된 학번입니다." };
    }
    return { ok: false, error: error.message };
  }

  // 세션이 있으면(이메일 확인 OFF) 프로필 테이블에 기록 (RLS: 본인만)
  const uid = data.user?.id;
  if (uid && data.session) {
    await supabase.from("student_profiles").insert({
      id: uid, student_id: studentId, name: meta.name, department: meta.department,
      phone: meta.phone, email: meta.realEmail, university: meta.university,
    });
    return { ok: true };
  }

  // 세션이 없으면 즉시 로그인 시도
  const r = await supabase.auth.signInWithPassword({ email: emailForStudentId(studentId), password: input.password });
  if (r.error) return { ok: false, error: "가입은 완료됐으나 자동 로그인에 실패했습니다. 로그인 탭에서 로그인해 주세요." };
  if (r.data.user) {
    await supabase.from("student_profiles").upsert({
      id: r.data.user.id, student_id: studentId, name: meta.name, department: meta.department,
      phone: meta.phone, email: meta.realEmail, university: meta.university,
    });
  }
  return { ok: true };
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

export async function currentUser(): Promise<StudentUser | null> {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;

  const { data: p } = await supabase
    .from("student_profiles").select("*").eq("id", user.id).maybeSingle();
  if (p) {
    return {
      studentId: p.student_id, name: p.name, department: p.department || "",
      phone: p.phone || "", email: p.email || "", university: p.university || "강원대학교",
    };
  }
  // 프로필이 없으면 user_metadata로 대체
  const m = (user.user_metadata || {}) as Record<string, string>;
  return {
    studentId: m.studentId || "", name: m.name || "", department: m.department || "",
    phone: m.phone || "", email: m.realEmail || "", university: m.university || "강원대학교",
  };
}

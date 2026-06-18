// 신청자(학생) 자체 회원가입/로그인 — 데모용 localStorage 기반.
// ⚠️ 실제 운영 시 Supabase Auth 등 서버 인증으로 교체 필요 (비밀번호 평문 저장 금지).

export interface StudentUser {
  studentId: string;
  name: string;
  department: string;
  phone: string;
  email: string;
  university: string;
  pwHash: string;
}

const USERS_KEY = "studentUsers";
const SESSION_KEY = "studentSession";

// 데모용 가벼운 해시 (보안 목적 아님)
function hash(pw: string): string {
  try { return btoa(unescape(encodeURIComponent("if-" + pw))); } catch { return pw; }
}

function readUsers(): StudentUser[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || "[]"); } catch { return []; }
}

function writeUsers(users: StudentUser[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export interface RegisterInput {
  studentId: string; password: string; name: string;
  department: string; phone: string; email: string; university?: string;
}

export function register(input: RegisterInput): { ok: boolean; error?: string } {
  const id = input.studentId.trim();
  if (!id || !input.password || !input.name.trim()) return { ok: false, error: "필수 정보를 모두 입력해주세요." };
  if (input.password.length < 4) return { ok: false, error: "비밀번호는 4자 이상이어야 합니다." };
  const users = readUsers();
  if (users.some((u) => u.studentId === id)) return { ok: false, error: "이미 가입된 학번입니다." };
  users.push({
    studentId: id,
    name: input.name.trim(),
    department: input.department.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
    university: (input.university || "강원대학교").trim(),
    pwHash: hash(input.password),
  });
  writeUsers(users);
  localStorage.setItem(SESSION_KEY, id);
  return { ok: true };
}

export function login(studentId: string, password: string): { ok: boolean; error?: string } {
  const users = readUsers();
  const user = users.find((u) => u.studentId === studentId.trim());
  if (!user || user.pwHash !== hash(password)) return { ok: false, error: "학번 또는 비밀번호가 올바르지 않습니다." };
  localStorage.setItem(SESSION_KEY, user.studentId);
  return { ok: true };
}

export function logout(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}

export function currentUser(): StudentUser | null {
  if (typeof window === "undefined") return null;
  const id = localStorage.getItem(SESSION_KEY);
  if (!id) return null;
  return readUsers().find((u) => u.studentId === id) || null;
}

export function isLoggedIn(): boolean {
  return currentUser() !== null;
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

// 학적상태변경 — 대학원 진학 등으로 학번(로그인 아이디)이 바뀌는 경우.
// applicant_id(UUID)는 그대로 유지되므로 기존 신청 기록은 모두 보존되고,
// Auth 합성 이메일·user_metadata·student_profiles·applications(비정규화 student_id)를
// 새 학번으로 동기화하여 관리자 페이지에서도 일관되게 보이도록 한다.
const APPLICANT_EMAIL_DOMAIN = "coss-applicant.kangwon.ac.kr";
const emailForStudentId = (sid: string) => `${sid.trim().toLowerCase()}@${APPLICANT_EMAIL_DOMAIN}`;
const STATUSES = ["재학생", "대학원생", "졸업생", "휴학생", "수료생", "기타"];

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
  const newStudentId = String(b.newStudentId || "").trim();
  const academicStatus = String(b.academicStatus || "").trim();

  if (!currentPassword) return NextResponse.json({ ok: false, error: "현재 비밀번호를 입력해주세요." }, { status: 400 });
  if (!newStudentId) return NextResponse.json({ ok: false, error: "새 학번을 입력해주세요." }, { status: 400 });
  if (!/^[A-Za-z0-9]{4,20}$/.test(newStudentId)) {
    return NextResponse.json({ ok: false, error: "학번은 영문/숫자 4~20자로 입력해주세요." }, { status: 400 });
  }
  if (academicStatus && !STATUSES.includes(academicStatus)) {
    return NextResponse.json({ ok: false, error: "학적상태 값이 올바르지 않습니다." }, { status: 400 });
  }

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
  const changingId = newStudentId !== curStudentId;

  // 학번 중복 확인(다른 사용자가 사용 중이면 차단)
  if (changingId) {
    const { data: dup } = await admin.from("student_profiles").select("id").eq("student_id", newStudentId).maybeSingle();
    if (dup && dup.id !== user.id) {
      return NextResponse.json({ ok: false, error: "이미 사용 중인 학번입니다." }, { status: 409 });
    }
  }

  // 1) Auth 계정(이메일·메타) 갱신
  const { error: upErr } = await admin.auth.admin.updateUserById(user.id, {
    ...(changingId ? { email: emailForStudentId(newStudentId), email_confirm: true } : {}),
    user_metadata: { ...meta, studentId: newStudentId, academicStatus: academicStatus || meta.academicStatus || "재학생" },
  });
  if (upErr) {
    const msg = /already.*registered|email/i.test(upErr.message) ? "이미 사용 중인 학번입니다." : upErr.message;
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }

  // 2) 프로필 갱신 — 학번·학적상태·이전 학번 이력. (컬럼 없으면 단계적 폴백)
  const { data: profRow } = await admin.from("student_profiles").select("student_id, previous_student_ids").eq("id", user.id).maybeSingle();
  const history: string[] = Array.isArray(profRow?.previous_student_ids) ? (profRow!.previous_student_ids as string[]) : [];
  if (changingId && curStudentId && !history.includes(curStudentId)) history.push(curStudentId);

  const fullUpdate = { student_id: newStudentId, academic_status: academicStatus || "재학생", previous_student_ids: history };
  let pErr = (await admin.from("student_profiles").update(fullUpdate).eq("id", user.id)).error;
  if (pErr && /previous_student_ids|academic_status/i.test(pErr.message)) {
    // 이력/상태 컬럼이 아직 없으면 학번만이라도 갱신
    pErr = (await admin.from("student_profiles").update({ student_id: newStudentId }).eq("id", user.id)).error;
  }
  if (pErr) return NextResponse.json({ ok: false, error: "프로필 갱신 실패: " + pErr.message }, { status: 500 });

  // 3) 기존 신청서의 비정규화 학번도 새 학번으로 동기화 → 관리자 목록 일관성
  if (changingId) await admin.from("applications").update({ student_id: newStudentId }).eq("applicant_id", user.id);

  return NextResponse.json({ ok: true, studentId: newStudentId, academicStatus: academicStatus || "재학생", changedId: changingId });
}

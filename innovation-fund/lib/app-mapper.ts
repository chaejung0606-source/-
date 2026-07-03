// 앱(camelCase) ↔ Supabase applications 테이블(snake_case) 변환
import type { Application } from "@/types";

// PostgREST가 "Could not find the 'X' column ... in the schema cache" 오류를 내면
// (배포 DB가 일부 컬럼 미마이그레이션) 해당 컬럼을 제외하고 자동 재시도한다.
// exec: 주어진 row로 insert/update 등을 수행하고 { data, error }를 반환.
export async function withMissingColumnRetry<T>(
  row: Record<string, unknown>,
  exec: (r: Record<string, unknown>) => PromiseLike<{ data: T | null; error: { message: string } | null }>,
  maxTries = 12,
): Promise<{ data: T | null; error: { message: string } | null }> {
  let attempt: Record<string, unknown> = { ...row };
  let last: { data: T | null; error: { message: string } | null } = { data: null, error: null };
  for (let i = 0; i < maxTries; i++) {
    last = await exec(attempt);
    if (!last.error) return last;
    // PostgREST(스키마 캐시) 형식과 Postgres raw(column "x" does not exist) 형식 모두 매칭
    const msg = last.error.message || "";
    const m = msg.match(/Could not find the '([^']+)' column/i)
      || msg.match(/column "?([a-zA-Z0-9_]+)"? does not exist/i);
    if (m && m[1] in attempt) { const { [m[1]]: _drop, ...rest } = attempt; attempt = rest; continue; }
    return last;
  }
  return last;
}

// 신청 제출 payload → DB row
export function toRow(p: any, applicantId?: string): Record<string, any> {
  return {
    applicant_id: applicantId ?? null,
    name: p.name,
    student_id: p.studentId,
    university: p.university,
    campus: p.campus || null,
    department: p.department,
    grade: p.grade,
    academic_status: p.academicStatus,
    grad_completion: p.gradCompletion || null,
    completed_years: p.completedYears || null,
    current_semester: p.currentSemester || null,
    phone: p.phone,
    email: p.email,
    application_date: p.applicationDate,
    bank_name: p.bankInfo?.bankName || null,
    account_number: p.bankInfo?.accountNumber || null,
    account_holder: p.bankInfo?.accountHolder || null,
    account_mismatch: !!p.accountMismatch,
    application_phase: p.applicationPhase || "fund",
    application_type: p.applicationType,
    // club_detail 컬럼이 실DB에 없으면 폴백으로 제거되어 소학회 내용이 유실될 수 있으므로,
    // 항상 존재하는 program_detail(JSONB)에 __clubDetail로 미러링해 데이터 손실을 방지한다.
    program_detail: p.clubDetail
      ? { ...(p.programDetail && typeof p.programDetail === "object" ? p.programDetail : {}), __clubDetail: p.clubDetail }
      : (p.programDetail ?? null),
    staff_detail: p.staffDetail ?? null,
    grade_detail: p.gradeDetail ?? null,
    contest_detail: p.contestDetail ?? null,
    certificate_detail: p.certificateDetail ?? null,
    labor_detail: p.laborDetail ?? null,
    activity_detail: p.activityDetail ?? null,
    club_detail: p.clubDetail ?? null,
    files: p.files ?? [],
    signature: p.signature || null,
    privacy_consent: !!p.privacyConsent,
    truth_consent: !!p.truthConsent,
    account_consent: !!p.accountConsent,
    request_amount: p.requestAmount ?? 0,
    calculated_amount: p.calculatedAmount ?? 0,
    is_draft: !!p.isDraft,
    draft_step: p.draftStep ?? null,
    is_test: !!p.isTest,
    verified_account: p.verifiedAccount ?? null,
    // 스키마 폼 답변이 있을 때만 포함(컬럼 미존재 환경에서 기존 제출이 깨지지 않도록)
    ...(p.formAnswers ? { form_answers: p.formAnswers } : {}),
  };
}

// DB row → Application
export function fromRow(r: any): Application {
  // program_detail에 미러링된 소학회 내용(__clubDetail) 복원 + programDetail에서 제거
  const pdRaw = r.program_detail;
  const mirroredClub = pdRaw && typeof pdRaw === "object" ? pdRaw.__clubDetail : undefined;
  const programDetailClean = (() => {
    if (!pdRaw || typeof pdRaw !== "object" || !("__clubDetail" in pdRaw)) return pdRaw ?? undefined;
    const { __clubDetail, ...rest } = pdRaw;
    return Object.keys(rest).length ? rest : undefined;
  })();
  return {
    id: r.id,
    receiptNumber: r.receipt_number || "",
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    name: r.name,
    studentId: r.student_id,
    university: r.university,
    campus: r.campus || undefined,
    department: r.department,
    grade: r.grade,
    academicStatus: r.academic_status,
    gradCompletion: r.grad_completion || undefined,
    completedYears: r.completed_years || undefined,
    currentSemester: r.current_semester || undefined,
    phone: r.phone,
    email: r.email,
    applicationDate: r.application_date,
    bankInfo: {
      bankName: r.bank_name || "",
      accountNumber: r.account_number || "",
      accountHolder: r.account_holder || "",
    },
    accountMismatch: r.account_mismatch ?? undefined,
    applicationPhase: r.application_phase || "fund",
    applicationType: r.application_type,
    programDetail: programDetailClean,
    staffDetail: r.staff_detail ?? undefined,
    gradeDetail: r.grade_detail ?? undefined,
    contestDetail: r.contest_detail ?? undefined,
    certificateDetail: r.certificate_detail ?? undefined,
    laborDetail: r.labor_detail ?? undefined,
    activityDetail: r.activity_detail ?? undefined,
    clubDetail: r.club_detail ?? mirroredClub ?? undefined,
    files: r.files ?? [],
    privacyConsent: !!r.privacy_consent,
    truthConsent: !!r.truth_consent,
    accountConsent: !!r.account_consent,
    signature: r.signature || undefined,
    reviewStatus: r.review_status,
    paymentStatus: r.payment_status,
    adminMemo: r.admin_memo || "",
    reviewStage: r.review_stage ?? undefined,
    handoffNote: r.handoff_note || undefined,
    approvedAmount: r.approved_amount ?? undefined,
    requestAmount: r.request_amount ?? 0,
    calculatedAmount: r.calculated_amount ?? 0,
    canceled: !!r.canceled,
    canceledAt: r.canceled_at || undefined,
    canceledIp: r.canceled_ip || undefined,
    isDraft: !!r.is_draft,
    draftStep: r.draft_step ?? undefined,
    isTest: !!r.is_test,
    verifiedAccount: r.verified_account ?? undefined,
    formAnswers: r.form_answers ?? (r.program_detail && r.program_detail.formAnswers) ?? undefined,
  };
}

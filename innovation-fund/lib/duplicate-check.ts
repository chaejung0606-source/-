// 동일 유형 중복 신청 방지 — 제출 전 본인의 같은 유형·단계 '유효' 신청 존재 여부를 조회.
// 취소·반려 건은 재신청이 정당하므로 제외한다. (RLS로 본인 신청만 조회됨)
import { supabase } from "./supabase";

export interface DuplicateHit { id: string; receiptNumber: string }

export async function findDuplicateApplications(
  applicantId: string,
  applicationType: string,
  applicationPhase: string,
  excludeId?: string | null,
): Promise<DuplicateHit[]> {
  const { data, error } = await supabase
    .from("applications")
    .select("id,receipt_number,review_status")
    .eq("applicant_id", applicantId)
    .eq("application_type", applicationType)
    .eq("application_phase", applicationPhase)
    .eq("is_draft", false)
    .eq("canceled", false);
  if (error || !data) return [];
  return data
    .filter((r) => r.id !== excludeId && r.review_status !== "rejected")
    .map((r) => ({ id: String(r.id), receiptNumber: String(r.receipt_number || "") }));
}

// 중복이 있으면 확인창을 띄우고, 사용자가 '그래도 제출'을 선택했는지 반환(true=진행).
export async function confirmIfDuplicate(
  applicantId: string,
  applicationType: string,
  applicationPhase: string,
  excludeId?: string | null,
): Promise<boolean> {
  const dups = await findDuplicateApplications(applicantId, applicationType, applicationPhase, excludeId);
  if (dups.length === 0) return true;
  const rn = dups[0].receiptNumber ? ` (접수번호 ${dups[0].receiptNumber})` : "";
  return window.confirm(
    `이미 같은 종류의 신청이 ${dups.length}건 있습니다${rn}.\n` +
    `동일 유형 중복 신청은 지급 심사에서 제외될 수 있습니다.\n\n그래도 새로 제출하시겠습니까?`,
  );
}

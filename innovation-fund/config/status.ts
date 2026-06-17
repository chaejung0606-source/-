// 검토/지급 상태 단일 소스 (라벨 + 배지 색상 + 순서)
import type { ReviewStatus, PaymentStatus } from "@/types";
import { REVIEW_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/types";

export interface StatusMeta {
  label: string;
  badge: string; // pastel pill 색상 클래스
}

// 파스텔/오팔 톤으로 순화 — 의미(색 계열)는 유지
export const REVIEW_STATUS_META: Record<ReviewStatus, StatusMeta> = {
  received:   { label: REVIEW_STATUS_LABELS.received,   badge: "bg-indigo-50 text-indigo-600" },
  reviewing:  { label: REVIEW_STATUS_LABELS.reviewing,  badge: "bg-amber-50 text-amber-600" },
  supplement: { label: REVIEW_STATUS_LABELS.supplement, badge: "bg-orange-50 text-orange-600" },
  committee:  { label: REVIEW_STATUS_LABELS.committee,  badge: "bg-violet-50 text-violet-600" },
  approved:   { label: REVIEW_STATUS_LABELS.approved,   badge: "bg-emerald-50 text-emerald-600" },
  rejected:   { label: REVIEW_STATUS_LABELS.rejected,   badge: "bg-rose-50 text-rose-600" },
};

export const PAYMENT_STATUS_META: Record<PaymentStatus, StatusMeta> = {
  waiting:    { label: PAYMENT_STATUS_LABELS.waiting,    badge: "bg-slate-100 text-slate-500" },
  processing: { label: PAYMENT_STATUS_LABELS.processing, badge: "bg-sky-50 text-sky-600" },
  completed:  { label: PAYMENT_STATUS_LABELS.completed,  badge: "bg-teal-50 text-teal-600" },
  hold:       { label: PAYMENT_STATUS_LABELS.hold,       badge: "bg-orange-50 text-orange-600" },
  refund:     { label: PAYMENT_STATUS_LABELS.refund,     badge: "bg-rose-50 text-rose-600" },
};

export const REVIEW_STATUS_ORDER: ReviewStatus[] =
  ["received", "reviewing", "supplement", "committee", "approved", "rejected"];

export const PAYMENT_STATUS_ORDER: PaymentStatus[] =
  ["waiting", "processing", "completed", "hold", "refund"];

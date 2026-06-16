// 검토/지급 상태 단일 소스 (라벨 + 배지 색상 + 순서)
import type { ReviewStatus, PaymentStatus } from "@/types";
import { REVIEW_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/types";

export interface StatusMeta {
  label: string;
  badge: string; // pastel pill 색상 클래스
}

export const REVIEW_STATUS_META: Record<ReviewStatus, StatusMeta> = {
  received:   { label: REVIEW_STATUS_LABELS.received,   badge: "bg-blue-100 text-blue-700" },
  reviewing:  { label: REVIEW_STATUS_LABELS.reviewing,  badge: "bg-amber-100 text-amber-700" },
  supplement: { label: REVIEW_STATUS_LABELS.supplement, badge: "bg-orange-100 text-orange-700" },
  committee:  { label: REVIEW_STATUS_LABELS.committee,  badge: "bg-purple-100 text-purple-700" },
  approved:   { label: REVIEW_STATUS_LABELS.approved,   badge: "bg-green-100 text-green-700" },
  rejected:   { label: REVIEW_STATUS_LABELS.rejected,   badge: "bg-red-100 text-red-700" },
};

export const PAYMENT_STATUS_META: Record<PaymentStatus, StatusMeta> = {
  waiting:    { label: PAYMENT_STATUS_LABELS.waiting,    badge: "bg-slate-100 text-slate-600" },
  processing: { label: PAYMENT_STATUS_LABELS.processing, badge: "bg-blue-100 text-blue-700" },
  completed:  { label: PAYMENT_STATUS_LABELS.completed,  badge: "bg-teal-100 text-teal-700" },
  hold:       { label: PAYMENT_STATUS_LABELS.hold,       badge: "bg-orange-100 text-orange-700" },
  refund:     { label: PAYMENT_STATUS_LABELS.refund,     badge: "bg-red-100 text-red-700" },
};

export const REVIEW_STATUS_ORDER: ReviewStatus[] =
  ["received", "reviewing", "supplement", "committee", "approved", "rejected"];

export const PAYMENT_STATUS_ORDER: PaymentStatus[] =
  ["waiting", "processing", "completed", "hold", "refund"];

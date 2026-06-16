import { clsx } from "clsx";
import type { ReviewStatus, PaymentStatus } from "@/types";
import { REVIEW_STATUS_META, PAYMENT_STATUS_META } from "@/config/status";

export function ReviewBadge({ status }: { status: ReviewStatus }) {
  const meta = REVIEW_STATUS_META[status];
  return <span className={clsx("badge", meta.badge)}>{meta.label}</span>;
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const meta = PAYMENT_STATUS_META[status];
  return <span className={clsx("badge", meta.badge)}>{meta.label}</span>;
}

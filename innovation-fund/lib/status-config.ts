// 검토/지급 상태 드롭다운 옵션을 관리자가 수정·추가·삭제 (app_config 보관).
// 미설정 시 config/status 의 기본값을 사용.
import {
  REVIEW_STATUS_META, PAYMENT_STATUS_META, REVIEW_STATUS_ORDER, PAYMENT_STATUS_ORDER,
} from "@/config/status";

export interface StatusOpt { key: string; label: string; badge: string; }
export interface StatusConfig { review: StatusOpt[]; payment: StatusOpt[]; }

// 새 상태에 고를 수 있는 색상 프리셋
export const BADGE_PRESETS: { name: string; badge: string }[] = [
  { name: "파랑", badge: "bg-blue-100 text-blue-700" },
  { name: "노랑", badge: "bg-amber-100 text-amber-700" },
  { name: "주황", badge: "bg-orange-100 text-orange-700" },
  { name: "보라", badge: "bg-purple-100 text-purple-700" },
  { name: "초록", badge: "bg-green-100 text-green-700" },
  { name: "청록", badge: "bg-teal-100 text-teal-700" },
  { name: "빨강", badge: "bg-red-100 text-red-700" },
  { name: "회색", badge: "bg-slate-100 text-slate-600" },
];

export const DEFAULT_STATUS_CONFIG: StatusConfig = {
  review: REVIEW_STATUS_ORDER.map((k) => ({ key: k, label: REVIEW_STATUS_META[k].label, badge: REVIEW_STATUS_META[k].badge })),
  payment: PAYMENT_STATUS_ORDER.map((k) => ({ key: k, label: PAYMENT_STATUS_META[k].label, badge: PAYMENT_STATUS_META[k].badge })),
};

export function newStatusKey(): string {
  return "st-" + Math.random().toString(36).slice(2, 9);
}

// 상태 키 → {label, badge} 조회 (config 우선, 없으면 기본값, 그래도 없으면 키 그대로)
export function statusMeta(config: StatusConfig, kind: "review" | "payment", key: string): StatusOpt {
  return config[kind].find((o) => o.key === key)
    || DEFAULT_STATUS_CONFIG[kind].find((o) => o.key === key)
    || { key, label: key, badge: "bg-slate-100 text-slate-600" };
}

// 저장 값 정규화 (잘못된 형태면 기본값)
export function normalizeStatusConfig(value: unknown): StatusConfig {
  const v = (value || {}) as Partial<StatusConfig>;
  const norm = (arr: unknown, def: StatusOpt[]): StatusOpt[] => {
    if (!Array.isArray(arr) || arr.length === 0) return def;
    return (arr as unknown[]).map((o, i) => {
      const x = (o || {}) as Record<string, unknown>;
      return {
        key: String(x.key || `st-${i}`),
        label: String(x.label || ""),
        badge: String(x.badge || "bg-slate-100 text-slate-600"),
      };
    }).filter((o) => o.label.trim() !== "");
  };
  const review = norm(v.review, DEFAULT_STATUS_CONFIG.review);
  // 'supplemented'(보완완료)는 보완요청 후 재제출 시 시스템이 자동 부여하는 상태 —
  // 새 상태 추가 이전에 저장된 커스텀 설정에도 항상 포함되도록 병합(보완요청 뒤에 삽입)
  if (!review.some((o) => o.key === "supplemented")) {
    const def = DEFAULT_STATUS_CONFIG.review.find((o) => o.key === "supplemented");
    if (def) {
      const idx = review.findIndex((o) => o.key === "supplement");
      review.splice(idx >= 0 ? idx + 1 : review.length, 0, def);
    }
  }
  return {
    review,
    payment: norm(v.payment, DEFAULT_STATUS_CONFIG.payment),
  };
}

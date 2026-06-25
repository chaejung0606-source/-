// 성과형 지원(성적 우수·경진대회·자격증)의 학기별 신청기한 — 관리자 설정값.
export interface TypePeriod { start: string; end: string; }
export type TypePeriods = Record<string, TypePeriod>;

// 신청기한이 적용되는 유형 (프로그램이 없는 성과형)
export const PERIOD_TYPES = ["grade", "contest", "certificate"] as const;

export async function fetchTypePeriods(): Promise<TypePeriods> {
  try {
    const r = await fetch("/api/type-periods", { cache: "no-store" });
    const j = await r.json();
    return (j.periods || {}) as TypePeriods;
  } catch {
    return {};
  }
}

// 지정 날짜(기본 오늘)에 신청 가능한지. 기한 미설정(둘 다 빈값)이면 상시 허용.
export function isTypeOpen(p: TypePeriod | undefined, date?: string): boolean {
  if (!p || (!p.start && !p.end)) return true;
  const d = date || new Date().toISOString().slice(0, 10);
  if (p.start && d < p.start) return false;
  if (p.end && d > p.end) return false;
  return true;
}

export function periodLabel(p?: TypePeriod): string {
  if (!p || (!p.start && !p.end)) return "";
  return `${p.start || "상시"} ~ ${p.end || "상시"}`;
}

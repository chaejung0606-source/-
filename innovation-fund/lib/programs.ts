// 사업단 프로그램 관리 — 관리자가 신청기간을 설정하고, 학생은 신청기간 내에만 선택 가능.
// 데모용 localStorage 기반 (실제 운영 시 Supabase 테이블로 이전).
import type { FundCategory } from "@/types";

export interface Program {
  id: string;
  category: FundCategory;   // labor / innovation / activity
  name: string;
  role?: string;            // 근로장학금 역할 (예: 공간관리)
  applyStart: string;       // YYYY-MM-DD (신청 시작)
  applyEnd: string;         // YYYY-MM-DD (신청 마감)
  note: string;             // 비고 (모집 인원 등)
}

const KEY = "siteProgramsV1";

// 운영 계획(안) 기반 기본 프로그램
const SEED: Program[] = [
  // 근로장학금 (가~마)
  { id: "labor-coss", category: "labor", name: "COSS 서포터즈", role: "공간관리", applyStart: "2026-03-01", applyEnd: "2027-02-28", note: "30명 내외" },
  { id: "labor-ta", category: "labor", name: "수업 운영 지원 (TA)", role: "수업 보조", applyStart: "2026-03-01", applyEnd: "2026-06-30", note: "모집 시기 별 상이" },
  { id: "labor-mentor", category: "labor", name: "학사지원 멘토단", role: "학사 멘토링", applyStart: "2026-03-01", applyEnd: "2027-02-28", note: "2명 내외" },
  { id: "labor-eval", category: "labor", name: "공동 수업 학생 평가단", role: "수업 평가", applyStart: "2026-03-01", applyEnd: "2026-06-30", note: "학기 별 운영" },
  { id: "labor-etc", category: "labor", name: "기타 상시 프로그램 및 사업 운영 지원", role: "사업 운영 지원", applyStart: "2026-01-01", applyEnd: "2027-12-31", note: "상시" },
  // 혁신인재지원금 (프로그램 참여지원비 / 진행요원비 공통)
  { id: "inno-bootcamp", category: "innovation", name: "데이터보안 부트캠프", applyStart: "2026-03-01", applyEnd: "2026-07-31", note: "교과·비교과" },
  { id: "inno-hackathon", category: "innovation", name: "AI 활용 해커톤", applyStart: "2026-04-01", applyEnd: "2026-05-31", note: "비교과" },
  { id: "inno-intern", category: "innovation", name: "기업체 연계 인턴십", applyStart: "2026-01-01", applyEnd: "2026-12-31", note: "현장실습·인턴십" },
  // 학생활동지원비
  { id: "act-club", category: "activity", name: "학생 자치·동아리 활동 지원", applyStart: "2026-03-01", applyEnd: "2026-11-30", note: "활동 계획서 필수" },
  { id: "act-conf", category: "activity", name: "학술 행사·학회 참가 지원", applyStart: "2026-01-01", applyEnd: "2026-12-31", note: "상시" },
];

export function getPrograms(): Program[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) { localStorage.setItem(KEY, JSON.stringify(SEED)); return SEED; }
    return JSON.parse(raw);
  } catch { return SEED; }
}

export function savePrograms(list: Program[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list));
}

// 지정 날짜에 신청 가능한지 (기본: 오늘)
export function isProgramActive(p: Program, date?: string): boolean {
  const d = date || new Date().toISOString().split("T")[0];
  return p.applyStart <= d && d <= p.applyEnd;
}

// 카테고리 + 날짜 기준 신청 가능한 프로그램 목록
export function getActivePrograms(category: FundCategory, date?: string): Program[] {
  return getPrograms().filter((p) => p.category === category && isProgramActive(p, date));
}

export function newProgramId(): string {
  return "p-" + Math.random().toString(36).slice(2, 9);
}

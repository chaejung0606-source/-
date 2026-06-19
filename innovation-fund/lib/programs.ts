// 사업단 프로그램 관리 — Supabase `programs` 테이블 기반(공개 읽기, 쓰기는 관리자 서버 라우트).
import { supabase } from "./supabase";
import type { FundCategory } from "@/types";

export interface Program {
  id: string;
  category: FundCategory;   // labor / innovation / activity
  name: string;
  role?: string;            // 근로장학금 역할
  applyStart: string;       // YYYY-MM-DD
  applyEnd: string;         // YYYY-MM-DD
  note: string;             // 비고
}

// 운영 계획(안) 기반 기본 프로그램 (DB가 비어있을 때 관리자 화면 초기값)
export const SEED: Program[] = [
  { id: "labor-coss", category: "labor", name: "COSS 서포터즈", role: "공간관리", applyStart: "2026-03-01", applyEnd: "2027-02-28", note: "30명 내외" },
  { id: "labor-ta", category: "labor", name: "수업 운영 지원 (TA)", role: "수업 보조", applyStart: "2026-03-01", applyEnd: "2026-06-30", note: "모집 시기 별 상이" },
  { id: "labor-mentor", category: "labor", name: "학사지원 멘토단", role: "학사 멘토링", applyStart: "2026-03-01", applyEnd: "2027-02-28", note: "2명 내외" },
  { id: "labor-eval", category: "labor", name: "공동 수업 학생 평가단", role: "수업 평가", applyStart: "2026-03-01", applyEnd: "2026-06-30", note: "학기 별 운영" },
  { id: "labor-etc", category: "labor", name: "기타 상시 프로그램 및 사업 운영 지원", role: "사업 운영 지원", applyStart: "2026-01-01", applyEnd: "2027-12-31", note: "상시" },
  { id: "inno-bootcamp", category: "innovation", name: "데이터보안 부트캠프", applyStart: "2026-03-01", applyEnd: "2026-07-31", note: "교과·비교과" },
  { id: "inno-hackathon", category: "innovation", name: "AI 활용 해커톤", applyStart: "2026-04-01", applyEnd: "2026-05-31", note: "비교과" },
  { id: "inno-intern", category: "innovation", name: "기업체 연계 인턴십", applyStart: "2026-01-01", applyEnd: "2026-12-31", note: "현장실습·인턴십" },
  { id: "act-club", category: "activity", name: "학생 자치·동아리 활동 지원", applyStart: "2026-03-01", applyEnd: "2026-11-30", note: "활동 계획서 필수" },
  { id: "act-conf", category: "activity", name: "학술 행사·학회 참가 지원", applyStart: "2026-01-01", applyEnd: "2026-12-31", note: "상시" },
];

function rowToProgram(r: any): Program {
  return { id: r.id, category: r.category, name: r.name, role: r.role || undefined, applyStart: r.apply_start, applyEnd: r.apply_end, note: r.note || "" };
}
export function programToRow(p: Program): Record<string, any> {
  return { id: p.id, category: p.category, name: p.name, role: p.role || null, apply_start: p.applyStart, apply_end: p.applyEnd, note: p.note || "" };
}

// 전체 프로그램 (공개 읽기)
export async function fetchPrograms(): Promise<Program[]> {
  const { data, error } = await supabase.from("programs").select("*");
  if (error || !data) return [];
  return (data as any[]).map(rowToProgram);
}

// 지정 날짜에 신청 가능 여부 (기본: 오늘)
export function isProgramActive(p: Program, date?: string): boolean {
  const d = date || new Date().toISOString().split("T")[0];
  return p.applyStart <= d && d <= p.applyEnd;
}

// 목록을 카테고리 + 날짜로 필터
export function filterActive(list: Program[], category: FundCategory, date?: string): Program[] {
  return list.filter((p) => p.category === category && isProgramActive(p, date));
}

export function newProgramId(): string {
  return "p-" + Math.random().toString(36).slice(2, 9);
}

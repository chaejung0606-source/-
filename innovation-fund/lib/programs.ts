// 사업단 프로그램 관리 — Supabase `programs` 테이블 기반(공개 읽기, 쓰기는 관리자 서버 라우트).
import { supabase } from "./supabase";
import type { FundCategory } from "@/types";

// 신청자가 작성해야 하는 보고서/증빙 항목 (프로그램별 관리자 설정)
export interface ReportField {
  id: string;
  label: string;            // 항목명 (예: 활동 내용, 결과 보고)
  type: "text" | "file";    // 서술형 입력 / 파일 업로드
  required?: boolean;       // 필수 여부
}

export interface Program {
  id: string;
  category: FundCategory;   // labor / innovation / activity
  name: string;
  role?: string;            // 근로장학금 역할 (구버전 단일 값 호환)
  roles?: string[];         // 역할 목록 (여러 개 입력 가능)
  reportFields?: ReportField[]; // 신청자 보고서 입력 항목
  preApply?: boolean;       // 지원신청(활동 전) 가능 여부 (구버전 호환)
  preApplyStart?: string;   // 지원신청 시작 YYYY-MM-DD
  preApplyEnd?: string;     // 지원신청 마감 YYYY-MM-DD
  applyStart: string;       // 지원금 신청 시작 YYYY-MM-DD
  applyEnd: string;         // 지원금 신청 마감 YYYY-MM-DD
  note: string;             // 비고
}

// 프로그램의 역할 목록 (roles 우선, 없으면 단일 role 폴백)
export function getProgramRoles(p: Program): string[] {
  if (p.roles && p.roles.length) return p.roles.filter((r) => r.trim());
  return p.role ? [p.role] : [];
}

export function newFieldId(): string {
  return "f-" + Math.random().toString(36).slice(2, 9);
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
  const roles: string[] = Array.isArray(r.roles) ? r.roles : (r.role ? [r.role] : []);
  return {
    id: r.id, category: r.category, name: r.name,
    role: r.role || undefined,
    roles,
    reportFields: Array.isArray(r.report_fields) ? r.report_fields : [],
    preApply: !!r.pre_apply,
    preApplyStart: r.pre_apply_start || undefined,
    preApplyEnd: r.pre_apply_end || undefined,
    applyStart: r.apply_start, applyEnd: r.apply_end, note: r.note || "",
  };
}
export function programToRow(p: Program): Record<string, any> {
  const roles = (p.roles && p.roles.length) ? p.roles.filter((r) => r.trim()) : (p.role ? [p.role] : []);
  return {
    id: p.id, category: p.category, name: p.name,
    role: roles[0] || null,          // 구버전 호환 단일 값
    roles,
    report_fields: p.reportFields || [],
    pre_apply: !!(p.preApplyStart && p.preApplyEnd) || !!p.preApply,
    pre_apply_start: p.preApplyStart || null,
    pre_apply_end: p.preApplyEnd || null,
    apply_start: p.applyStart, apply_end: p.applyEnd, note: p.note || "",
  };
}

// 전체 프로그램 (공개 읽기)
export async function fetchPrograms(): Promise<Program[]> {
  const { data, error } = await supabase.from("programs").select("*");
  if (error || !data) return [];
  return (data as any[]).map(rowToProgram);
}

export type ApplyPhase = "pre" | "fund";

// 단계별 신청 기간. 지원신청(pre)은 지원신청 기간을 쓰되,
// 미설정 시 지원금 신청 기간으로 폴백 → 기본적으로 지원금 신청과 동일한 목록이 노출됨.
export function applyWindow(p: Program, phase: ApplyPhase = "fund"): { start: string; end: string } {
  if (phase === "pre") {
    return { start: p.preApplyStart || p.applyStart, end: p.preApplyEnd || p.applyEnd };
  }
  return { start: p.applyStart, end: p.applyEnd };
}

// 지정 날짜에 신청 가능 여부 (기본: 오늘)
export function isProgramActive(p: Program, date?: string, phase: ApplyPhase = "fund"): boolean {
  const d = date || new Date().toISOString().split("T")[0];
  const { start, end } = applyWindow(p, phase);
  return !!start && !!end && start <= d && d <= end;
}

// 목록을 카테고리 + 날짜 + 단계(pre/fund)로 필터
export function filterActive(list: Program[], category: FundCategory, date?: string, phase: ApplyPhase = "fund"): Program[] {
  return list.filter((p) => p.category === category && isProgramActive(p, date, phase));
}

export function newProgramId(): string {
  return "p-" + Math.random().toString(36).slice(2, 9);
}

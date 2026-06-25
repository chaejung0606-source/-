// 사업단 프로그램 관리 — Supabase `programs` 테이블 기반(공개 읽기, 쓰기는 관리자 서버 라우트).
import { supabase } from "./supabase";
import type { FundCategory, ReportFieldType } from "@/types";

// 신청자가 작성해야 하는 보고서/증빙 항목 (프로그램별 관리자 설정)
export interface ReportField {
  id: string;
  label: string;            // 항목명 (예: 활동 내용, 결과 보고)
  type: ReportFieldType;    // 서술형 / 파일 / 서약(동의) / 서명 / 드롭다운
  required?: boolean;       // 필수 여부
  text?: string;            // 서약(agreement) 본문
  options?: string[];       // 드롭다운(select) 선택지
}

// COSS 서포터즈 / TA 등 프로그램별 기본 입력 항목 템플릿
// (관리자가 reportFields를 직접 설정하지 않은 경우 프로그램명으로 자동 적용)
const TA_PLEDGE = "위의 추천을 받아 피추천인은 TA로서의 역할을 성실히 수행할 것을 서약하며 다음의 사항을 준수할 것을 약속합니다.\n1. 학습자 지원과 교수 보조 업무를 성실히 수행할 것\n2. 학내 규정을 준수하고, 교과목 관련 업무를 충실히 이행할 것\n3. TA로서의 역할에 대한 비밀유지 의무를 준수할 것\n4. 정당한 이유 없이 TA 업무를 게을리 하지 않을 것";

const PROGRAM_TEMPLATES: { match: (name: string) => boolean; fields: ReportField[] }[] = [
  {
    match: (n) => n.includes("서포터즈") || n.toUpperCase().includes("COSS"),
    fields: [
      { id: "coss-intro", label: "자기소개서 및 지원동기", type: "text", required: true },
      { id: "coss-promo", label: "홍보 활동 경력", type: "text" },
      { id: "coss-ability", label: "개인역량 (자료 업로드)", type: "file" },
    ],
  },
  {
    match: (n) => n.toUpperCase().includes("TA") || n.includes("수업 운영"),
    fields: [
      { id: "ta-course", label: "교과목명", type: "text", required: true },
      { id: "ta-reason", label: "추천사유", type: "text", required: true },
      { id: "ta-pledge", label: "TA 서약서", type: "agreement", required: true, text: TA_PLEDGE },
      { id: "ta-sign", label: "추천인(교수) 서명", type: "signature", required: true },
    ],
  },
  {
    // 학사지원 멘토단 / 사업단 근로(기타 상시 사업 운영 지원)
    match: (n) => n.includes("멘토") || n.includes("사업 운영") || n.includes("사업단 근로") || n.includes("상시"),
    fields: [
      { id: "mentor-role", label: "역할", type: "text", required: true },
      { id: "mentor-career", label: "관련 경력", type: "text" },
      { id: "mentor-free", label: "자율 작성란", type: "text" },
    ],
  },
];

// 프로그램·단계(지원신청 pre / 지원금 신청 fund)에 적용할 입력 항목.
// 관리자 설정값 우선, 없으면 지원신청(pre)에 한해 프로그램명 기반 기본 템플릿 적용.
export function effectiveReportFields(
  p?: { name?: string; reportFields?: ReportField[]; preReportFields?: ReportField[] } | null,
  phase: "pre" | "fund" = "fund",
): ReportField[] {
  if (!p) return [];
  const fields = phase === "pre" ? p.preReportFields : p.reportFields;
  if (fields && fields.length) return fields;
  if (phase === "pre") {
    const tpl = PROGRAM_TEMPLATES.find((t) => t.match(p.name || ""));
    if (tpl) return tpl.fields;
  }
  return [];
}

export interface Program {
  id: string;
  category: FundCategory;   // labor / innovation / activity
  // 혁신인재지원금 내 세부 유형: program(프로그램 참여지원비) / staff(진행요원비).
  // 지정된 유형에서만 신청 가능. 미지정(구버전)은 program으로 간주.
  programType?: "program" | "staff";
  // 프로그램 신청대상: virtual(미래융합가상학과 학생만) / designated(지정학생만) / anyone(누구나). 미지정은 anyone.
  audience?: "virtual" | "designated" | "anyone";
  name: string;
  role?: string;            // 근로장학금 역할 (구버전 단일 값 호환)
  roles?: string[];         // 역할 목록 (여러 개 입력 가능)
  reportFields?: ReportField[];    // 지원금 신청(fund) 신청자 입력 항목
  preReportFields?: ReportField[]; // 지원신청(pre) 신청자 입력 항목
  // 전체 신청 폼 빌더 스키마 (단계·항목·필수여부). 있으면 신청자 폼을 이 스키마로 구성.
  preFormSchema?: import("./form-schema").FormSchema;  // 지원신청(pre)
  fundFormSchema?: import("./form-schema").FormSchema; // 지원금 신청(fund)
  preApply?: boolean;       // 지원신청(활동 전) 가능 여부 (구버전 호환)
  preApplyStart?: string;   // 지원신청 시작 YYYY-MM-DD
  preApplyEnd?: string;     // 지원신청 마감 YYYY-MM-DD
  applyStart: string;       // 지원금 신청 시작 YYYY-MM-DD
  applyEnd: string;         // 지원금 신청 마감 YYYY-MM-DD
  note: string;             // 비고
  enabled?: boolean;        // (구버전 호환) 전체 활성/비활성. 기본 활성
  enabledPre?: boolean;     // 지원신청(활동 전) 단계 활성 여부. 기본 활성
  enabledFund?: boolean;    // 지원금 신청(활동 후) 단계 활성 여부. 기본 활성
}

// 단계별 활성 여부 (단계 플래그 우선, 없으면 구버전 enabled로 폴백, 그래도 없으면 활성)
export function isPhaseEnabled(p: { enabled?: boolean; enabledPre?: boolean; enabledFund?: boolean }, phase: ApplyPhase): boolean {
  const flag = phase === "pre" ? p.enabledPre : p.enabledFund;
  return (flag ?? p.enabled) !== false;
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
    programType: r.program_type === "staff" ? "staff" : (r.program_type === "program" ? "program" : undefined),
    audience: r.audience === "virtual" ? "virtual" : (r.audience === "designated" ? "designated" : "anyone"),
    role: r.role || undefined,
    roles,
    reportFields: Array.isArray(r.report_fields) ? r.report_fields : [],
    preReportFields: Array.isArray(r.pre_report_fields) ? r.pre_report_fields : [],
    preApply: !!r.pre_apply,
    preApplyStart: r.pre_apply_start || undefined,
    preApplyEnd: r.pre_apply_end || undefined,
    applyStart: r.apply_start, applyEnd: r.apply_end, note: r.note || "",
    enabled: r.enabled !== false,
    enabledPre: r.enabled_pre == null ? (r.enabled !== false) : r.enabled_pre !== false,
    enabledFund: r.enabled_fund == null ? (r.enabled !== false) : r.enabled_fund !== false,
  };
}
export function programToRow(p: Program): Record<string, any> {
  const roles = (p.roles && p.roles.length) ? p.roles.filter((r) => r.trim()) : (p.role ? [p.role] : []);
  return {
    id: p.id, category: p.category, name: p.name,
    program_type: p.category === "innovation" ? (p.programType || "program") : null,
    audience: p.audience === "virtual" ? "virtual" : (p.audience === "designated" ? "designated" : "anyone"),
    role: roles[0] || null,          // 구버전 호환 단일 값
    roles,
    report_fields: p.reportFields || [],
    pre_report_fields: p.preReportFields || [],
    pre_apply: !!(p.preApplyStart && p.preApplyEnd) || !!p.preApply,
    pre_apply_start: p.preApplyStart || null,
    pre_apply_end: p.preApplyEnd || null,
    apply_start: p.applyStart, apply_end: p.applyEnd, note: p.note || "",
    // 구버전 enabled: 두 단계 모두 비활성일 때만 false (옛 코드 폴백 호환)
    enabled: (p.enabledPre !== false) || (p.enabledFund !== false),
    enabled_pre: p.enabledPre !== false,
    enabled_fund: p.enabledFund !== false,
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

// 지정 날짜에 신청 가능 여부 (기본: 오늘). 비활성(enabled=false) 프로그램은 항상 false
export function isProgramActive(p: Program, date?: string, phase: ApplyPhase = "fund"): boolean {
  if (!isPhaseEnabled(p, phase)) return false;
  const d = date || new Date().toISOString().split("T")[0];
  const { start, end } = applyWindow(p, phase);
  return !!start && !!end && start <= d && d <= end;
}

// 목록을 카테고리 + 날짜 + 단계(pre/fund)로 필터
export function filterActive(list: Program[], category: FundCategory, date?: string, phase: ApplyPhase = "fund"): Program[] {
  return list.filter((p) => p.category === category && isProgramActive(p, date, phase));
}

// 프로그램이 특정 신청 유형(program/staff 등)에 속하는지 — 혁신인재지원금은 programType로 구분
export function programMatchesType(p: Program, type: string): boolean {
  if (type === "program" || type === "staff") return (p.programType || "program") === type;
  return true; // 그 외 유형은 카테고리만으로 판단
}

// 카테고리(by 유형) + 날짜 + 단계로 필터 — program/staff는 programType까지 구분
export function filterActiveByType(list: Program[], type: string, category: FundCategory, date?: string, phase: ApplyPhase = "fund"): Program[] {
  return list.filter((p) => p.category === category && programMatchesType(p, type) && isProgramActive(p, date, phase));
}

export function newProgramId(): string {
  return "p-" + Math.random().toString(36).slice(2, 9);
}

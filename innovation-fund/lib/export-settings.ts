import type { ApplicationType } from "@/types";

export interface ExportSetting { filename?: string; path?: string; } // path는 구버전 설정 호환용(더 이상 사용 안 함)
export type ExportSettings = Record<string, ExportSetting>;

export const DEFAULT_FILENAME = "{접수번호} 혁신인재지원금 지급신청서_({이름}_{학번})";

// 관리자 화면에서 실제 내려받을 수 있는 파일 종류 — 파일 저장 경로 메뉴와 1:1 대응
export type ExportKind =
  | "listAll" | "listSelected" | "eligibleList" | "certList"   // 엑셀
  | "payment" | "review" | "batchZip";                          // PDF·ZIP

export interface ExportKindInfo {
  key: ExportKind;
  label: string;
  desc: string;        // 어느 화면의 어떤 버튼인지
  defaultName: string;
  vars: string[];      // 파일명에 사용할 수 있는 변수
}

// 엑셀 다운로드 (버튼 → 파일 바로 저장)
export const EXCEL_KINDS: ExportKindInfo[] = [
  { key: "listAll", label: "전체 목록 다운로드 (Excel)", desc: "신청 목록 화면 — 신청 + 취소 목록 병합(접수번호 순)", defaultName: "전체신청목록_{날짜}", vars: ["날짜"] },
  { key: "listSelected", label: "선택 목록 다운로드 (Excel)", desc: "신청 목록 화면 — 선택한 항목만", defaultName: "선택신청목록_{날짜}", vars: ["날짜"] },
  { key: "eligibleList", label: "신청 가능 학생 (Excel)", desc: "신청자 정보 화면 — 프로그램별 신청 가능 학생", defaultName: "프로그램별신청가능학생_{날짜}", vars: ["날짜"] },
  { key: "certList", label: "자격증 목록 (Excel)", desc: "자격증 목록 관리 화면 — 전체 시트", defaultName: "자격증목록_{날짜}", vars: ["날짜"] },
];

// PDF 인쇄·일괄 ZIP 다운로드
export const PDF_KINDS: ExportKindInfo[] = [
  { key: "payment", label: "지출자료 (PDF)", desc: "신청 목록·상세 화면 — 단건 인쇄 파일명 및 일괄 ZIP 안의 건별 파일명", defaultName: "{접수번호} {유형} 지출자료_({이름}_{학번})", vars: ["접수번호", "이름", "학번", "유형", "날짜"] },
  { key: "review", label: "심의요청서 (PDF)", desc: "신청 목록·상세 화면 — 단건 인쇄 파일명 및 일괄 ZIP 안의 건별 파일명", defaultName: "{접수번호} {유형} 심의요청서_({이름}_{학번})", vars: ["접수번호", "이름", "학번", "유형", "날짜"] },
  { key: "batchZip", label: "일괄 다운로드 (ZIP)", desc: "신청 목록 화면 — 여러 건 선택 시 건별 PDF를 담은 ZIP 파일명", defaultName: "{문서} 일괄_{날짜}_{건수}건", vars: ["문서", "날짜", "건수"] },
];

// 호환용 통합 목록
export const EXPORT_KINDS: ExportKindInfo[] = [...EXCEL_KINDS, ...PDF_KINDS];

export function getExportSettings(): ExportSettings {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem("exportSettings") || "{}"); } catch { return {}; }
}

export function saveExportSettings(s: ExportSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("exportSettings", JSON.stringify(s));
}

function applyVars(tpl: string, vars: Record<string, string>): string {
  // 변수명이 한글({접수번호}·{이름} 등)이라 \w 대신 중괄호 안 전체를 매칭한다.
  return tpl.replace(/\{([^{}]+)\}/g, (_, k) => vars[k.trim()] ?? `{${k}}`);
}

// 신청유형별 PDF 파일명 (지급신청서 — 현재 UI 버튼은 없고 인쇄 페이지 doc 미지정 시 호환용)
export function buildFilename(type: ApplicationType, vars: Record<string, string>): string {
  const s = getExportSettings();
  const tpl = s[type]?.filename || DEFAULT_FILENAME;
  return applyVars(tpl, vars);
}

// 내보내기 종류별 파일명 (설정값 우선, 없으면 기본값)
export function buildExportName(kind: ExportKind, vars: Record<string, string>): string {
  const s = getExportSettings();
  const def = EXPORT_KINDS.find((k) => k.key === kind)?.defaultName || "{날짜}";
  const tpl = s[kind]?.filename || def;
  return applyVars(tpl, vars);
}

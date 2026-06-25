import type { ApplicationType } from "@/types";

export interface ExportSetting { filename: string; path: string; }
export type ExportSettings = Record<string, ExportSetting>;

export const DEFAULT_FILENAME = "{접수번호} 혁신인재지원금 지급신청서_({이름}_{학번})";

// PDF 내보내기 기본 파일명 (파일 저장 경로 메뉴에서 따로 설정하지 않고, 신청 유형이 자동 반영됨)
const PDF_DEFAULT_NAME: Record<string, string> = {
  payment: "{접수번호} {유형} 지출자료_({이름}_{학번})",
  review: "{접수번호} {유형} 심의요청서_({이름}_{학번})",
};

// 엑셀 다운로드 종류 — 파일 저장 경로에서 파일명·경로 설정 (PDF 내보내기는 유형별 자동)
export type ExportKind = "payment" | "review" | "listAll" | "listSelected";
export const EXPORT_KINDS: { key: ExportKind; label: string; desc: string; defaultName: string }[] = [
  { key: "listAll", label: "전체 목록 다운로드 (Excel)", desc: "신청 목록 + 취소 목록 병합 (접수번호 순)", defaultName: "전체신청목록_{날짜}" },
  { key: "listSelected", label: "선택 목록 다운로드 (Excel)", desc: "선택한 항목만 다운로드", defaultName: "선택신청목록_{날짜}" },
];

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

// 신청유형별 PDF 파일명 (지급신청서)
export function buildFilename(type: ApplicationType, vars: Record<string, string>): string {
  const s = getExportSettings();
  const tpl = s[type]?.filename || DEFAULT_FILENAME;
  return applyVars(tpl, vars);
}

// 내보내기 종류별 파일명 (엑셀: 설정값 우선 / PDF: 유형 자동 반영 기본값)
export function buildExportName(kind: ExportKind, vars: Record<string, string>): string {
  const s = getExportSettings();
  const def = EXPORT_KINDS.find((k) => k.key === kind)?.defaultName || PDF_DEFAULT_NAME[kind] || "{날짜}";
  const tpl = s[kind]?.filename || def;
  return applyVars(tpl, vars);
}

// 내보내기 종류별 보관 경로(메모)
export function getExportPath(kind: ExportKind): string {
  const s = getExportSettings();
  return s[kind]?.path || "";
}

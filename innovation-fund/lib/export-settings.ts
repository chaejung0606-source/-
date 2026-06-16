import type { ApplicationType } from "@/types";

export interface ExportSetting { filename: string; path: string; }
export type ExportSettings = Record<string, ExportSetting>;

export const DEFAULT_FILENAME = "{접수번호} 혁신인재지원금 지급신청서_({이름}_{학번})";

export function getExportSettings(): ExportSettings {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem("exportSettings") || "{}"); } catch { return {}; }
}

export function saveExportSettings(s: ExportSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("exportSettings", JSON.stringify(s));
}

export function buildFilename(type: ApplicationType, vars: Record<string, string>): string {
  const s = getExportSettings();
  const tpl = s[type]?.filename || DEFAULT_FILENAME;
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

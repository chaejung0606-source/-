"use client";
import { Plus, Trash2 } from "lucide-react";
import type { FormField } from "@/lib/form-schema";

// 표 기본 템플릿 (2행 × 2열) — 첫 행 머리글 + 둘째 행 예시/입력
export function defaultTableCells(): string[][] {
  return [["항목", "내용"], ["", ""]];
}

// 저장된 표 값(JSON 문자열)을 2차원 배열로 파싱
export function parseTableGrid(value?: string): string[][] | null {
  if (!value) return null;
  try {
    const g = JSON.parse(value);
    if (Array.isArray(g) && g.every((r) => Array.isArray(r))) {
      return (g as unknown[][]).map((r) => r.map((c) => String(c ?? "")));
    }
  } catch { /* ignore */ }
  return null;
}

interface Props {
  field: FormField;
  value?: string;             // 신청자가 채운 표(JSON). 없으면 관리자 템플릿으로 초기화
  onChange?: (v: string) => void;
  disabled?: boolean;         // true = 읽기전용(미리보기/관리자 확인)
}

// 관리자가 만든 표를 신청자가 채우는 컴포넌트. disabled면 읽기전용으로 표만 표시.
export default function TableField({ field, value, onChange, disabled }: Props) {
  const template = field.tableCells && field.tableCells.length ? field.tableCells : defaultTableCells();
  const rows0 = template.length;
  const cols0 = template[0]?.length || 0;

  // 현재 표 데이터 — 신청자 입력값이 있으면 그것을, 없으면 관리자 템플릿을 그대로 사용
  const grid = parseTableGrid(value) || template.map((r) => r.map((c) => c));
  const rows = grid.length;
  const cols = Math.max(cols0, grid[0]?.length || 0);

  // 관리자가 내용을 채운 칸(템플릿 범위 내 비어있지 않은 칸)은 고정 표시, 빈 칸은 신청자 입력칸
  const fixedAt = (r: number, c: number) => r < rows0 && c < cols0 && (template[r]?.[c] || "").trim() !== "";
  const headerAt = (r: number, c: number) => (!!field.tableHeaderRow && r === 0) || (!!field.tableHeaderCol && c === 0);

  const commit = (g: string[][]) => onChange?.(JSON.stringify(g));
  const setCell = (r: number, c: number, val: string) => { const g = grid.map((row) => [...row]); g[r][c] = val; commit(g); };
  const addRow = () => { const g = grid.map((row) => [...row]); g.push(Array(cols).fill("")); commit(g); };
  const addCol = () => commit(grid.map((row) => [...row, ""]));
  const removeRow = (r: number) => { if (r < rows0 || rows <= 1) return; commit(grid.filter((_, i) => i !== r)); };
  const removeCol = (c: number) => { if (c < cols0 || cols <= 1) return; commit(grid.map((row) => row.filter((_, i) => i !== c))); };

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="border-collapse text-sm" style={{ minWidth: "min(100%, 400px)" }}>
          <tbody>
            {grid.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => {
                  const fixed = fixedAt(r, c);
                  const header = headerAt(r, c);
                  const cls = `border border-gray-300 align-top ${header ? "bg-indigo-50 font-semibold text-gray-800" : fixed ? "bg-gray-50 text-gray-600" : "bg-white"}`;
                  return (
                    <td key={c} className={cls} style={{ minWidth: 90, padding: 0 }}>
                      {fixed || disabled ? (
                        <div className="px-2 py-1.5 whitespace-pre-line min-h-[34px]">{cell || (disabled ? "" : "")}</div>
                      ) : (
                        <input
                          className="w-full px-2 py-1.5 outline-none bg-transparent focus:bg-indigo-50/40"
                          value={cell}
                          onChange={(e) => setCell(r, c, e.target.value)}
                          placeholder="입력"
                        />
                      )}
                    </td>
                  );
                })}
                {!disabled && field.tableAddRows && r >= rows0 && (
                  <td className="border-0 pl-1">
                    <button type="button" onClick={() => removeRow(r)} className="text-gray-300 hover:text-red-500" title="이 행 삭제"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                )}
              </tr>
            ))}
            {!disabled && field.tableAddCols && (
              <tr>
                {grid[0]?.map((_, c) => (
                  <td key={c} className="border-0 pt-1 text-center">
                    {c >= cols0 && <button type="button" onClick={() => removeCol(c)} className="text-gray-300 hover:text-red-500" title="이 열 삭제"><Trash2 className="w-3.5 h-3.5" /></button>}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {!disabled && (field.tableAddRows || field.tableAddCols) && (
        <div className="flex gap-2">
          {field.tableAddRows && <button type="button" onClick={addRow} className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> 행 추가</button>}
          {field.tableAddCols && <button type="button" onClick={addCol} className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> 열 추가</button>}
        </div>
      )}
    </div>
  );
}

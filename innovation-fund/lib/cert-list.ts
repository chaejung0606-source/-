// 자격증 목록 — 여러 시트(지원 가능/심의대상/지원 불가 등), 행=자격증, 열=구분, 열별 학생 공개여부.
// app_config 'cert_list' 보관.

export interface CertColumn { id: string; name: string; pub: boolean; } // pub = 학생 공개
export interface CertRow { id: string; cells: Record<string, string>; pub?: boolean; } // pub = 학생 공개(기본 true)
export interface CertSheet { id: string; name: string; columns: CertColumn[]; rows: CertRow[]; }
export interface CertList { sheets: CertSheet[]; updatedAt?: string; updateNote?: string; }

export function newCertId(p = "c"): string { return p + "-" + Math.random().toString(36).slice(2, 9); }

function defaultColumns(): CertColumn[] {
  return [
    { id: newCertId("col"), name: "자격증명", pub: true },
    { id: newCertId("col"), name: "발급기관", pub: true },
    { id: newCertId("col"), name: "난이도", pub: true },
    { id: newCertId("col"), name: "지원 금액", pub: true },
    { id: newCertId("col"), name: "분야", pub: true },
  ];
}

export const DEFAULT_SHEET_NAMES = ["지원 가능 자격증", "심의대상 자격증", "지원 불가 자격증"];

export function defaultCertList(): CertList {
  return { sheets: DEFAULT_SHEET_NAMES.map((name) => ({ id: newCertId("sheet"), name, columns: defaultColumns(), rows: [] })) };
}

function normColumns(arr: unknown): CertColumn[] {
  if (!Array.isArray(arr) || arr.length === 0) return defaultColumns();
  return (arr as unknown[]).map((c, i) => {
    const o = (c || {}) as Record<string, unknown>;
    return { id: String(o.id || `col-${i}`), name: String(o.name || `구분 ${i + 1}`), pub: o.pub !== false };
  });
}
function normRows(arr: unknown): CertRow[] {
  if (!Array.isArray(arr)) return [];
  return (arr as unknown[]).map((r, i) => {
    const o = (r || {}) as Record<string, unknown>;
    const cells = (o.cells && typeof o.cells === "object") ? o.cells as Record<string, string> : {};
    return { id: String(o.id || `row-${i}`), pub: o.pub !== false, cells: Object.fromEntries(Object.entries(cells).map(([k, val]) => [k, String(val ?? "")])) };
  });
}

export function normalizeCertList(value: unknown): CertList {
  const v = (value || {}) as Record<string, unknown>;
  const meta = { updatedAt: v.updatedAt ? String(v.updatedAt) : undefined, updateNote: v.updateNote ? String(v.updateNote) : undefined };
  // 신버전: { sheets: [...] }
  if (Array.isArray(v.sheets) && v.sheets.length) {
    return {
      ...meta,
      sheets: (v.sheets as unknown[]).map((s, i) => {
        const o = (s || {}) as Record<string, unknown>;
        return { id: String(o.id || `sheet-${i}`), name: String(o.name || `시트 ${i + 1}`), columns: normColumns(o.columns), rows: normRows(o.rows) };
      }),
    };
  }
  // 구버전: { columns, rows } → 한 시트로 이관
  if (Array.isArray(v.columns)) {
    return { ...meta, sheets: [{ id: newCertId("sheet"), name: "자격증 목록", columns: normColumns(v.columns), rows: normRows(v.rows) }] };
  }
  return defaultCertList();
}

// 공개 열만 남긴 버전 (학생 노출용) — 시트는 유지
export function publicCertList(list: CertList): CertList {
  return {
    updatedAt: list.updatedAt,
    updateNote: list.updateNote,
    sheets: list.sheets.map((sh) => {
      const cols = sh.columns.filter((c) => c.pub);
      const ids = new Set(cols.map((c) => c.id));
      // 비공개 열 제거 + 비공개 행(pub === false) 제거
      return { id: sh.id, name: sh.name, columns: cols, rows: sh.rows.filter((r) => r.pub !== false).map((r) => ({ id: r.id, cells: Object.fromEntries(Object.entries(r.cells).filter(([k]) => ids.has(k))) })) };
    }),
  };
}

// CSV 파싱 (따옴표·줄바꿈 처리)
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cur = "", inQ = false;
  const t = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (inQ) {
      if (ch === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += ch;
    } else {
      if (ch === '"') inQ = true;
      else if (ch === ",") { row.push(cur); cur = ""; }
      else if (ch === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
      else cur += ch;
    }
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

// 표(행렬) → 한 시트의 columns/rows (첫 행 = 열 제목)
export function gridToSheetData(grid: string[][]): { columns: CertColumn[]; rows: CertRow[] } {
  if (grid.length === 0) return { columns: defaultColumns(), rows: [] };
  const header = grid[0];
  const columns: CertColumn[] = header.map((h, i) => ({ id: newCertId("col"), name: h.trim() || `구분 ${i + 1}`, pub: true }));
  const rows: CertRow[] = grid.slice(1).map((r) => ({
    id: newCertId("row"),
    pub: true,
    cells: Object.fromEntries(columns.map((c, i) => [c.id, (r[i] ?? "").trim()])),
  }));
  return { columns, rows };
}

// 자격증 목록 — 관리자 편집(행=자격증, 열=구분), 열별 학생 공개여부. app_config 'cert_list' 보관.

export interface CertColumn { id: string; name: string; pub: boolean; } // pub = 학생에게 공개
export interface CertRow { id: string; cells: Record<string, string>; }
export interface CertList { columns: CertColumn[]; rows: CertRow[]; }

export function newCertId(p = "c"): string { return p + "-" + Math.random().toString(36).slice(2, 9); }

export const DEFAULT_CERT_LIST: CertList = {
  columns: [
    { id: "col-name", name: "자격증명", pub: true },
    { id: "col-org", name: "발급기관", pub: true },
    { id: "col-level", name: "난이도", pub: true },
    { id: "col-amount", name: "지원 금액", pub: true },
    { id: "col-field", name: "분야", pub: true },
  ],
  rows: [],
};

export function normalizeCertList(value: unknown): CertList {
  const v = (value || {}) as Partial<CertList>;
  if (!Array.isArray(v.columns) || v.columns.length === 0) return DEFAULT_CERT_LIST;
  const columns: CertColumn[] = (v.columns as unknown[]).map((c, i) => {
    const o = (c || {}) as Record<string, unknown>;
    return { id: String(o.id || `col-${i}`), name: String(o.name || `구분 ${i + 1}`), pub: o.pub !== false };
  });
  const rows: CertRow[] = Array.isArray(v.rows) ? (v.rows as unknown[]).map((r, i) => {
    const o = (r || {}) as Record<string, unknown>;
    const cells = (o.cells && typeof o.cells === "object") ? o.cells as Record<string, string> : {};
    return { id: String(o.id || `row-${i}`), cells: Object.fromEntries(Object.entries(cells).map(([k, val]) => [k, String(val ?? "")])) };
  }) : [];
  return { columns, rows };
}

// 공개 열만 남긴 버전 (학생 노출용)
export function publicCertList(list: CertList): CertList {
  const cols = list.columns.filter((c) => c.pub);
  const ids = new Set(cols.map((c) => c.id));
  const rows = list.rows.map((r) => ({ id: r.id, cells: Object.fromEntries(Object.entries(r.cells).filter(([k]) => ids.has(k))) }));
  return { columns: cols, rows };
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

// 표(행렬) → CertList (첫 행 = 열 제목)
export function gridToCertList(grid: string[][]): CertList {
  if (grid.length === 0) return { columns: [], rows: [] };
  const header = grid[0];
  const columns: CertColumn[] = header.map((h, i) => ({ id: `col-${i}-${Math.random().toString(36).slice(2, 6)}`, name: h.trim() || `구분 ${i + 1}`, pub: true }));
  const rows: CertRow[] = grid.slice(1).map((r) => ({
    id: newCertId("row"),
    cells: Object.fromEntries(columns.map((c, i) => [c.id, (r[i] ?? "").trim()])),
  }));
  return { columns, rows };
}

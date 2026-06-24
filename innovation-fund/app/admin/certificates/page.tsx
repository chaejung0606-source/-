"use client";
import { useEffect, useState } from "react";
import { Save, Plus, Trash2, Download, Eye, EyeOff, FileSpreadsheet, Search } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { type CertList, type CertSheet, defaultCertList, newCertId } from "@/lib/cert-list";

const SHEET_URL = "https://docs.google.com/spreadsheets/d/1N4H_igfGJ3UTvjCjSfnB2Ap5g0aNK1_myW0EJQ388_I/edit?usp=sharing";

export default function CertificatesAdminPage() {
  const [list, setList] = useState<CertList>(defaultCertList());
  const [activeSheet, setActiveSheet] = useState(0);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/api/admin/cert-list").then((r) => r.json()).then((d) => { if (d?.sheets?.length) setList(d); }).catch(() => {});
  }, []);

  const dirty = () => setSaved(false);
  const sheet: CertSheet | undefined = list.sheets[activeSheet];
  const patchSheet = (fn: (s: CertSheet) => CertSheet) => { setList((l) => ({ sheets: l.sheets.map((s, i) => i === activeSheet ? fn(s) : s) })); dirty(); };

  // 시트
  const addSheet = () => { setList((l) => ({ sheets: [...l.sheets, { id: newCertId("sheet"), name: `새 시트 ${l.sheets.length + 1}`, columns: [{ id: newCertId("col"), name: "자격증명", pub: true }], rows: [] }] })); setActiveSheet(list.sheets.length); dirty(); };
  const renameSheet = (name: string) => patchSheet((s) => ({ ...s, name }));
  const removeSheet = () => { if (list.sheets.length <= 1) { alert("시트는 최소 1개가 필요합니다."); return; } if (!confirm(`시트 ‘${sheet?.name}’를 삭제할까요?`)) return; setList((l) => ({ sheets: l.sheets.filter((_, i) => i !== activeSheet) })); setActiveSheet(0); dirty(); };

  // 열/행/셀
  const setCol = (id: string, patch: Partial<CertList["sheets"][number]["columns"][number]>) => patchSheet((s) => ({ ...s, columns: s.columns.map((c) => c.id === id ? { ...c, ...patch } : c) }));
  const addCol = () => patchSheet((s) => ({ ...s, columns: [...s.columns, { id: newCertId("col"), name: "새 구분", pub: true }] }));
  const removeCol = (id: string) => patchSheet((s) => ({ ...s, columns: s.columns.filter((c) => c.id !== id), rows: s.rows.map((r) => { const { [id]: _drop, ...rest } = r.cells; return { ...r, cells: rest }; }) }));
  const addRow = () => patchSheet((s) => ({ ...s, rows: [...s.rows, { id: newCertId("row"), cells: {} }] }));
  const removeRow = (id: string) => patchSheet((s) => ({ ...s, rows: s.rows.filter((r) => r.id !== id) }));
  const setCell = (rowId: string, colId: string, val: string) => patchSheet((s) => ({ ...s, rows: s.rows.map((r) => r.id === rowId ? { ...r, cells: { ...r.cells, [colId]: val } } : r) }));

  const save = async () => {
    const res = await fetch("/api/admin/cert-list", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(list) });
    const j = await res.json().catch(() => ({}));
    if (j.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); } else alert("저장 실패: " + (j.error || res.status));
  };

  const applyImport = (data: { columns: CertSheet["columns"]; rows: CertSheet["rows"] }) => {
    patchSheet((s) => ({ ...s, columns: data.columns, rows: data.rows }));
  };
  const importFromSheet = async () => {
    if (!confirm(`구글 시트에서 가져와 현재 시트 ‘${sheet?.name}’ 내용을 덮어씁니다. 계속할까요?\n(시트가 '링크가 있는 모든 사용자: 뷰어'로 공유돼 있어야 합니다)`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/cert-list/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: SHEET_URL }) });
      const j = await res.json().catch(() => ({}));
      if (j.ok && j.data) { applyImport(j.data); alert(`가져왔습니다. 자격증 ${j.data.rows.length}건 · 구분 ${j.data.columns.length}열. 확인 후 '저장'을 눌러주세요.`); }
      else alert("가져오기 실패: " + (j.error || res.status) + "\n\n대신 시트 내용을 복사해 'CSV/표 붙여넣기'를 사용해보세요.");
    } finally { setBusy(false); }
  };
  const importPaste = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/cert-list/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csv: pasteText }) });
      const j = await res.json().catch(() => ({}));
      if (j.ok && j.data) { applyImport(j.data); setPasteOpen(false); setPasteText(""); alert(`불러왔습니다. 자격증 ${j.data.rows.length}건 · 구분 ${j.data.columns.length}열. 확인 후 '저장'을 눌러주세요.`); }
      else alert("불러오기 실패: " + (j.error || res.status));
    } finally { setBusy(false); }
  };

  const downloadExcel = async () => {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    list.sheets.forEach((s) => {
      const aoa = [s.columns.map((c) => c.name), ...s.rows.map((r) => s.columns.map((c) => r.cells[c.id] || ""))];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 30) || "시트");
    });
    XLSX.writeFile(wb, `자격증목록_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const terms = q.split(/[\s,]+/).map((t) => t.trim().toLowerCase()).filter(Boolean);
  const visibleRows = sheet ? sheet.rows.filter((r) => terms.length === 0 || terms.every((t) => sheet.columns.map((c) => r.cells[c.id] || "").join(" ").toLowerCase().includes(t))) : [];

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-800">자격증 목록</h1>
        <div className="flex gap-2 flex-wrap">
          <button onClick={downloadExcel} className="btn-secondary text-sm flex items-center gap-1.5"><Download className="w-4 h-4" /> 엑셀 다운로드</button>
          <button onClick={save} className="btn-primary flex items-center gap-2"><Save className="w-4 h-4" /> 저장</button>
        </div>
      </div>
      <p className="text-gray-500 text-sm mb-3">시트(지원 가능/심의대상/지원 불가 등)별로 편집합니다. 행=자격증, 열=구분이며 열별 <strong>학생 공개/비공개</strong>를 설정할 수 있습니다. 저장하면 홈 ‘자격증 목록’에 즉시 반영됩니다.</p>

      {/* 시트 선택 */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {list.sheets.map((s, i) => (
          <button key={s.id} onClick={() => { setActiveSheet(i); setQ(""); }} className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition ${i === activeSheet ? "bg-indigo-500 text-white border-indigo-500" : "bg-white/70 border-gray-200 text-gray-600 hover:border-indigo-300"}`}>
            {s.name} <span className="text-xs opacity-70">({s.rows.length})</span>
          </button>
        ))}
        <button onClick={addSheet} className="px-2.5 py-1.5 rounded-full text-sm border border-dashed text-gray-500 hover:text-indigo-600 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> 시트</button>
      </div>

      {sheet && (
        <>
          <div className="card mb-3 flex items-center gap-2 flex-wrap">
            <label className="text-xs font-semibold text-gray-500">시트 이름</label>
            <input className="input-field !w-auto text-sm" value={sheet.name} onChange={(e) => renameSheet(e.target.value)} />
            <button onClick={removeSheet} className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> 시트 삭제</button>
            <div className="relative ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input className="input-field pl-9 text-sm w-56" placeholder="이 시트에서 검색" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>

          <div className="card mb-4 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-500">가져오기</span>
            <button onClick={importFromSheet} disabled={busy} className="btn-secondary text-sm flex items-center gap-1.5"><FileSpreadsheet className="w-4 h-4" /> 구글 시트에서 가져오기</button>
            <button onClick={() => setPasteOpen((v) => !v)} className="btn-secondary text-sm">CSV/표 붙여넣기</button>
            <a href={SHEET_URL} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline ml-auto">연결된 구글 시트 열기 ↗</a>
          </div>
          {pasteOpen && (
            <div className="card mb-4 space-y-2">
              <p className="text-xs text-gray-500">구글 시트의 해당 탭에서 표 전체를 복사(Ctrl+C)해 붙여넣으세요. 첫 줄이 구분(열 제목)이 되며, 현재 시트 ‘{sheet.name}’에 적용됩니다.</p>
              <textarea className="input-field h-32 font-mono text-xs" value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder={"자격증명\t발급기관\t난이도\n정보보안기사\t한국인터넷진흥원\t상"} />
              <button onClick={importPaste} disabled={busy || !pasteText.trim()} className="btn-primary text-sm">불러오기</button>
            </div>
          )}
          {saved && <div className="mb-3 text-green-600 text-sm font-medium">✓ 저장되었습니다.</div>}

          {/* 그리드 */}
          <div className="card overflow-x-auto">
            <table className="text-sm border-collapse min-w-full">
              <thead>
                <tr>
                  <th className="p-1.5 align-bottom">
                    <button onClick={addRow} className="btn-secondary text-xs flex items-center gap-1 whitespace-nowrap"><Plus className="w-3.5 h-3.5" /> 행 추가</button>
                  </th>
                  {sheet.columns.map((c) => (
                    <th key={c.id} className="p-1.5 align-top min-w-[140px]">
                      <input className="input-field !py-1 text-xs font-bold mb-1" value={c.name} onChange={(e) => setCol(c.id, { name: e.target.value })} placeholder="구분명" />
                      <div className="flex items-center justify-between gap-1">
                        <button onClick={() => setCol(c.id, { pub: !c.pub })} className={`text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 ${c.pub ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-500"}`} title="학생 공개 여부">
                          {c.pub ? <><Eye className="w-3 h-3" /> 공개</> : <><EyeOff className="w-3 h-3" /> 비공개</>}
                        </button>
                        <button onClick={() => removeCol(c.id)} className="text-gray-300 hover:text-red-500" title="열 삭제"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </th>
                  ))}
                  <th className="p-1.5 align-top"><button onClick={addCol} className="btn-secondary text-xs flex items-center gap-1 whitespace-nowrap"><Plus className="w-3.5 h-3.5" /> 열 추가</button></th>
                </tr>
              </thead>
              <tbody>
                {sheet.rows.length === 0 ? (
                  <tr><td colSpan={sheet.columns.length + 2} className="text-center text-gray-400 py-8 text-xs">자격증이 없습니다. ‘행 추가’ 또는 ‘가져오기’를 사용하세요.</td></tr>
                ) : visibleRows.length === 0 ? (
                  <tr><td colSpan={sheet.columns.length + 2} className="text-center text-gray-400 py-8 text-xs">검색 결과가 없습니다.</td></tr>
                ) : visibleRows.map((r) => (
                  <tr key={r.id} className="border-t border-gray-100">
                    <td className="text-center"><button onClick={() => removeRow(r.id)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button></td>
                    {sheet.columns.map((c) => (
                      <td key={c.id} className="p-1"><input className="input-field !py-1 text-xs" value={r.cells[c.id] || ""} onChange={(e) => setCell(r.id, c.id, e.target.value)} /></td>
                    ))}
                    <td></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-2">{q ? `검색 ${visibleRows.length}건 / ` : ""}총 {sheet.rows.length}건</p>
        </>
      )}
    </AdminLayout>
  );
}

"use client";
import { useRef, useEffect, useState } from "react";
import { Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Table as TableIcon, Type, Highlighter, Link as LinkIcon, Rows, Columns, Trash2 } from "lucide-react";

// 한글(HWP) 작업용 리치 텍스트 에디터 — 글자크기·색·배경색·링크·표(삽입/행열 편집)
interface Props {
  initialHtml: string;
  onChange: (html: string) => void;
}

const CELL_STYLE = "border:1px solid #cbd5e1;padding:6px 8px;min-width:40px";
const FONT_SIZES = ["12", "14", "16", "18", "20", "24", "28", "32", "40"];

export default function RichTextEditor({ initialHtml, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const composing = useRef(false);
  const [tableMenu, setTableMenu] = useState(false);
  const [grid, setGrid] = useState({ r: 0, c: 0 }); // 그리드 선택기 하이라이트
  const emit = () => { if (ref.current && !composing.current) onChange(ref.current.innerHTML); };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el || composing.current) return;
    if (el.innerHTML !== initialHtml) el.innerHTML = initialHtml;
  }, [initialHtml]);

  // CSS 인라인 스타일로 적용(폰트 size 속성 대신) — 색·배경색이 style로 들어가도록
  const exec = (command: string, value?: string) => {
    ref.current?.focus();
    try { document.execCommand("styleWithCSS", false, "true"); } catch { /* noop */ }
    document.execCommand(command, false, value);
    emit();
  };

  // 글자 크기(px) — execCommand fontSize(1~7)만 지원하므로 임시 size=7 적용 후 px로 치환
  const applyFontSize = (px: string) => {
    if (!px) return;
    ref.current?.focus();
    document.execCommand("fontSize", false, "7");
    ref.current?.querySelectorAll('font[size="7"]').forEach((f) => {
      const el = f as HTMLElement;
      el.removeAttribute("size");
      el.style.fontSize = `${px}px`;
    });
    emit();
  };

  // 글자 배경색(형광펜)
  const applyHighlight = (color: string) => {
    ref.current?.focus();
    try { document.execCommand("styleWithCSS", false, "true"); } catch { /* noop */ }
    if (!document.execCommand("hiliteColor", false, color)) document.execCommand("backColor", false, color);
    emit();
  };

  // 링크 삽입 — 선택 텍스트가 있으면 링크로, 없으면 URL 텍스트로 삽입. 새 탭 열기 설정.
  const insertLink = () => {
    ref.current?.focus();
    const sel = window.getSelection();
    const hasText = !!sel && sel.toString().trim().length > 0;
    const url = window.prompt("링크 주소(URL)를 입력하세요", "https://");
    if (!url) return;
    if (hasText) document.execCommand("createLink", false, url);
    else document.execCommand("insertHTML", false, `<a href="${url}">${url}</a>`);
    ref.current?.querySelectorAll("a").forEach((a) => { a.target = "_blank"; a.rel = "noopener noreferrer"; });
    emit();
  };

  // 표 삽입(그리드에서 r×c 선택)
  const insertTable = (r: number, c: number) => {
    if (!r || !c) return;
    let html = '<table style="border-collapse:collapse;width:100%;margin:8px 0" border="1"><tbody>';
    for (let i = 0; i < r; i++) {
      html += "<tr>";
      for (let j = 0; j < c; j++) html += `<td style="${CELL_STYLE}">&nbsp;</td>`;
      html += "</tr>";
    }
    html += "</tbody></table><p><br/></p>";
    exec("insertHTML", html);
    setTableMenu(false); setGrid({ r: 0, c: 0 });
  };

  // 현재 커서가 위치한 표의 셀(td/th)
  const currentCell = (): HTMLTableCellElement | null => {
    const sel = window.getSelection();
    let node: Node | null = sel?.anchorNode || null;
    while (node && node !== ref.current) {
      if (node.nodeType === 1 && /^(TD|TH)$/.test((node as HTMLElement).tagName)) return node as HTMLTableCellElement;
      node = node.parentNode;
    }
    return null;
  };
  const newCell = () => { const td = document.createElement("td"); td.setAttribute("style", CELL_STYLE); td.innerHTML = "&nbsp;"; return td; };

  const addRow = (below: boolean) => {
    const cell = currentCell(); if (!cell) { alert("표 안에 커서를 두고 사용하세요."); return; }
    const row = cell.parentElement as HTMLTableRowElement;
    const tr = document.createElement("tr");
    for (let i = 0; i < row.children.length; i++) tr.appendChild(newCell());
    row.parentElement!.insertBefore(tr, below ? row.nextSibling : row);
    emit();
  };
  const addCol = (right: boolean) => {
    const cell = currentCell(); if (!cell) { alert("표 안에 커서를 두고 사용하세요."); return; }
    const idx = Array.from(cell.parentElement!.children).indexOf(cell);
    cell.closest("table")?.querySelectorAll("tr").forEach((tr) => {
      const refCell = tr.children[idx] || null;
      tr.insertBefore(newCell(), right ? (refCell ? refCell.nextSibling : null) : refCell);
    });
    emit();
  };
  const delRow = () => {
    const cell = currentCell(); if (!cell) { alert("표 안에 커서를 두고 사용하세요."); return; }
    const row = cell.parentElement as HTMLTableRowElement;
    const table = cell.closest("table");
    row.remove();
    if (table && table.querySelectorAll("tr").length === 0) table.remove();
    emit();
  };
  const delCol = () => {
    const cell = currentCell(); if (!cell) { alert("표 안에 커서를 두고 사용하세요."); return; }
    const idx = Array.from(cell.parentElement!.children).indexOf(cell);
    const table = cell.closest("table");
    table?.querySelectorAll("tr").forEach((tr) => tr.children[idx]?.remove());
    if (table && (table.querySelector("tr")?.children.length || 0) === 0) table.remove();
    emit();
  };
  const delTable = () => {
    const cell = currentCell(); if (!cell) { alert("표 안에 커서를 두고 사용하세요."); return; }
    cell.closest("table")?.remove();
    emit();
  };

  const Btn = ({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) => (
    <button type="button" title={title} onMouseDown={(e) => e.preventDefault()} onClick={onClick}
      className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:bg-indigo-50 hover:text-indigo-600">
      {children}
    </button>
  );

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-visible">
      <div className="flex items-center gap-0.5 flex-wrap px-2 py-1.5 border-b border-gray-100 bg-gray-50">
        <select title="글자 크기" onMouseDown={(e) => e.preventDefault()} onChange={(e) => { applyFontSize(e.target.value); e.target.selectedIndex = 0; }}
          className="h-8 rounded-lg border border-gray-200 text-xs px-1 text-gray-600">
          <option value="">글자크기</option>
          {FONT_SIZES.map((s) => <option key={s} value={s}>{s}px</option>)}
        </select>
        <span className="w-px h-5 bg-gray-200 mx-1" />
        <Btn onClick={() => exec("bold")} title="굵게"><Bold className="w-4 h-4" /></Btn>
        <Btn onClick={() => exec("italic")} title="기울임"><Italic className="w-4 h-4" /></Btn>
        <Btn onClick={() => exec("underline")} title="밑줄"><Underline className="w-4 h-4" /></Btn>
        <Btn onClick={() => exec("strikeThrough")} title="취소선"><Strikethrough className="w-4 h-4" /></Btn>
        <label className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:bg-indigo-50 cursor-pointer relative" title="글자 색" onMouseDown={(e) => e.preventDefault()}>
          <Type className="w-4 h-4" />
          <input type="color" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => exec("foreColor", e.target.value)} />
        </label>
        <label className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:bg-indigo-50 cursor-pointer relative" title="글자 배경색(형광펜)" onMouseDown={(e) => e.preventDefault()}>
          <Highlighter className="w-4 h-4" />
          <input type="color" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => applyHighlight(e.target.value)} />
        </label>
        <Btn onClick={insertLink} title="링크 삽입"><LinkIcon className="w-4 h-4" /></Btn>
        <span className="w-px h-5 bg-gray-200 mx-1" />
        <Btn onClick={() => exec("justifyLeft")} title="왼쪽 정렬"><AlignLeft className="w-4 h-4" /></Btn>
        <Btn onClick={() => exec("justifyCenter")} title="가운데 정렬"><AlignCenter className="w-4 h-4" /></Btn>
        <Btn onClick={() => exec("justifyRight")} title="오른쪽 정렬"><AlignRight className="w-4 h-4" /></Btn>
        <span className="w-px h-5 bg-gray-200 mx-1" />
        <Btn onClick={() => exec("insertUnorderedList")} title="글머리 기호"><List className="w-4 h-4" /></Btn>
        <Btn onClick={() => exec("insertOrderedList")} title="번호 목록"><ListOrdered className="w-4 h-4" /></Btn>
        <span className="w-px h-5 bg-gray-200 mx-1" />

        {/* 표 도구 — 삽입(그리드 선택) + 행·열 편집 */}
        <div className="relative">
          <Btn onClick={() => setTableMenu((v) => !v)} title="표"><TableIcon className="w-4 h-4" /></Btn>
          {tableMenu && (
            <>
              <div className="fixed inset-0 z-10" onMouseDown={() => setTableMenu(false)} />
              <div className="absolute left-0 top-9 z-20 w-64 rounded-xl border border-gray-200 bg-white shadow-xl p-3" onMouseDown={(e) => e.preventDefault()}>
                <p className="text-[11px] font-semibold text-gray-500 mb-1.5">표 만들기 ({grid.r || 0} × {grid.c || 0})</p>
                <div className="inline-grid gap-0.5 mb-2" style={{ gridTemplateColumns: "repeat(8, 18px)" }}>
                  {Array.from({ length: 8 * 8 }).map((_, i) => {
                    const r = Math.floor(i / 8) + 1, c = (i % 8) + 1;
                    const on = r <= grid.r && c <= grid.c;
                    return (
                      <button key={i} type="button"
                        onMouseEnter={() => setGrid({ r, c })}
                        onClick={() => insertTable(r, c)}
                        className={`w-[18px] h-[18px] rounded-sm border ${on ? "bg-indigo-400 border-indigo-500" : "bg-white border-gray-200"}`}
                      />
                    );
                  })}
                </div>
                <div className="border-t border-gray-100 pt-2 grid grid-cols-2 gap-1">
                  <button type="button" onClick={() => addRow(false)} className="flex items-center gap-1 text-xs text-gray-700 hover:text-indigo-600 px-1.5 py-1 rounded hover:bg-indigo-50"><Rows className="w-3.5 h-3.5" /> 위에 행</button>
                  <button type="button" onClick={() => addRow(true)} className="flex items-center gap-1 text-xs text-gray-700 hover:text-indigo-600 px-1.5 py-1 rounded hover:bg-indigo-50"><Rows className="w-3.5 h-3.5" /> 아래 행</button>
                  <button type="button" onClick={() => addCol(false)} className="flex items-center gap-1 text-xs text-gray-700 hover:text-indigo-600 px-1.5 py-1 rounded hover:bg-indigo-50"><Columns className="w-3.5 h-3.5" /> 왼쪽 열</button>
                  <button type="button" onClick={() => addCol(true)} className="flex items-center gap-1 text-xs text-gray-700 hover:text-indigo-600 px-1.5 py-1 rounded hover:bg-indigo-50"><Columns className="w-3.5 h-3.5" /> 오른쪽 열</button>
                  <button type="button" onClick={delRow} className="flex items-center gap-1 text-xs text-rose-600 hover:bg-rose-50 px-1.5 py-1 rounded"><Trash2 className="w-3.5 h-3.5" /> 행 삭제</button>
                  <button type="button" onClick={delCol} className="flex items-center gap-1 text-xs text-rose-600 hover:bg-rose-50 px-1.5 py-1 rounded"><Trash2 className="w-3.5 h-3.5" /> 열 삭제</button>
                  <button type="button" onClick={delTable} className="col-span-2 flex items-center justify-center gap-1 text-xs text-rose-600 hover:bg-rose-50 px-1.5 py-1 rounded"><Trash2 className="w-3.5 h-3.5" /> 표 전체 삭제</button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5">행·열 편집은 표 안에 커서를 두고 사용하세요.</p>
              </div>
            </>
          )}
        </div>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onCompositionStart={() => { composing.current = true; }}
        onCompositionEnd={() => { composing.current = false; emit(); }}
        className="rich-content min-h-[220px] p-4 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-indigo-200"
      />
    </div>
  );
}

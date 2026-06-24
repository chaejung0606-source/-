"use client";
import { useRef } from "react";
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, Table as TableIcon, Type } from "lucide-react";

// 간단한 한글 작업용 리치 텍스트 에디터 (글자크기·모양·정렬·표 삽입 등)
interface Props {
  initialHtml: string;
  onChange: (html: string) => void;
}

export default function RichTextEditor({ initialHtml, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const emit = () => { if (ref.current) onChange(ref.current.innerHTML); };
  const cmd = (command: string, value?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, value);
    emit();
  };
  const insertTable = () => {
    const r = parseInt(window.prompt("표 행(가로줄) 수", "2") || "0", 10);
    const c = parseInt(window.prompt("표 열(세로줄) 수", "2") || "0", 10);
    if (!r || !c || r > 30 || c > 12) return;
    let html = '<table style="border-collapse:collapse;width:100%;margin:8px 0" border="1"><tbody>';
    for (let i = 0; i < r; i++) {
      html += "<tr>";
      for (let j = 0; j < c; j++) html += '<td style="border:1px solid #cbd5e1;padding:6px 8px;min-width:40px">&nbsp;</td>';
      html += "</tr>";
    }
    html += "</tbody></table><p><br/></p>";
    cmd("insertHTML", html);
  };

  const Btn = ({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) => (
    <button type="button" title={title} onMouseDown={(e) => e.preventDefault()} onClick={onClick}
      className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:bg-indigo-50 hover:text-indigo-600">
      {children}
    </button>
  );

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center gap-0.5 flex-wrap px-2 py-1.5 border-b border-gray-100 bg-gray-50">
        <select title="글자 크기" onMouseDown={(e) => e.preventDefault()} onChange={(e) => { cmd("fontSize", e.target.value); e.target.selectedIndex = 0; }}
          className="h-8 rounded-lg border border-gray-200 text-xs px-1 text-gray-600">
          <option value="">글자크기</option>
          <option value="2">작게</option>
          <option value="3">보통</option>
          <option value="5">크게</option>
          <option value="6">제목</option>
        </select>
        <Btn onClick={() => cmd("bold")} title="굵게"><Bold className="w-4 h-4" /></Btn>
        <Btn onClick={() => cmd("italic")} title="기울임"><Italic className="w-4 h-4" /></Btn>
        <Btn onClick={() => cmd("underline")} title="밑줄"><Underline className="w-4 h-4" /></Btn>
        <label className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:bg-indigo-50 cursor-pointer relative" title="글자 색" onMouseDown={(e) => e.preventDefault()}>
          <Type className="w-4 h-4" />
          <input type="color" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => cmd("foreColor", e.target.value)} />
        </label>
        <span className="w-px h-5 bg-gray-200 mx-1" />
        <Btn onClick={() => cmd("justifyLeft")} title="왼쪽 정렬"><AlignLeft className="w-4 h-4" /></Btn>
        <Btn onClick={() => cmd("justifyCenter")} title="가운데 정렬"><AlignCenter className="w-4 h-4" /></Btn>
        <Btn onClick={() => cmd("justifyRight")} title="오른쪽 정렬"><AlignRight className="w-4 h-4" /></Btn>
        <span className="w-px h-5 bg-gray-200 mx-1" />
        <Btn onClick={() => cmd("insertUnorderedList")} title="목록"><List className="w-4 h-4" /></Btn>
        <Btn onClick={insertTable} title="표 삽입"><TableIcon className="w-4 h-4" /></Btn>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        className="rich-content min-h-[220px] p-4 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-indigo-200"
        dangerouslySetInnerHTML={{ __html: initialHtml }}
      />
    </div>
  );
}

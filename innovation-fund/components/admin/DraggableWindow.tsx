"use client";
import { useEffect, useRef, useState } from "react";
import { X, Move } from "lucide-react";

// 임시 팝업창처럼 동작하는 비모달 플로팅 창.
// - 뒤의 플랫폼 내용을 가리지 않음(백드롭 없음, 페이지 조작 가능)
// - 헤더를 잡아 자유롭게 이동, 모서리로 크기 조절
interface Props {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  initial?: { x: number; y: number; w: number; h: number };
}

export default function DraggableWindow({ title, onClose, children, initial }: Props) {
  const [pos, setPos] = useState({ x: initial?.x ?? 120, y: initial?.y ?? 120 });
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!drag.current) return;
      setPos({ x: e.clientX - drag.current.dx, y: e.clientY - drag.current.dy });
    };
    const onUp = () => { drag.current = null; document.body.style.userSelect = ""; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  const startDrag = (e: React.MouseEvent) => {
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    document.body.style.userSelect = "none";
  };

  return (
    <div
      className="fixed z-[120] rounded-2xl shadow-2xl border border-gray-200 bg-white overflow-hidden flex flex-col"
      style={{ left: pos.x, top: pos.y, width: initial?.w ?? 520, height: initial?.h ?? 560, resize: "both", minWidth: 280, minHeight: 220 }}
    >
      <div
        onMouseDown={startDrag}
        className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border-b border-indigo-100 cursor-move select-none"
      >
        <Move className="w-4 h-4 text-indigo-400 flex-shrink-0" />
        <span className="text-sm font-semibold text-gray-700 truncate flex-1">{title}</span>
        <button onClick={onClose} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
      </div>
      <div className="flex-1 overflow-auto bg-gray-50 flex items-center justify-center p-2">
        {children}
      </div>
    </div>
  );
}

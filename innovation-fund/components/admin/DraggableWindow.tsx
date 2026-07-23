"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Move } from "lucide-react";

// 임시 팝업창처럼 동작하는 비모달 플로팅 창.
// - 뒤의 플랫폼 내용을 가리지 않음(백드롭 없음, 페이지 조작 가능)
// - 헤더를 잡아 자유롭게 이동, 모서리로 크기 조절
// - document.body로 포털 렌더 → 조상 요소의 backdrop-filter/overflow(글래스 카드 등)에
//   잘려 보이지 않는 문제 방지. 사이트 콘텐츠 영역 밖(여백)으로 나가도 항상 보인다.
interface Props {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  initial?: { x: number; y: number; w: number; h: number };
  onFocus?: () => void; // 창을 클릭하면 맨 앞으로 가져오기 위한 콜백(여러 창 동시 표시 시)
}

export default function DraggableWindow({ title, onClose, children, initial, onFocus }: Props) {
  const [pos, setPos] = useState({ x: initial?.x ?? 120, y: initial?.y ?? 120 });
  const [mounted, setMounted] = useState(false);
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // 자유롭게 이동(사이트 영역 밖 여백으로도 이동 가능)하되, 창을 완전히 놓쳐
  // 다시 잡을 수 없게 되는 것만 방지: 헤더(제목 줄)를 항상 화면 안에 남긴다.
  const KEEP = 120; // 최소한 화면에 남길 창의 가로 폭(px)
  const HEADER = 40; // 헤더 높이(px)
  const clamp = (x: number, y: number) => ({
    x: Math.min(Math.max(KEEP - (initial?.w ?? 520), x), window.innerWidth - KEEP),
    y: Math.min(Math.max(0, y), window.innerHeight - HEADER),
  });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!drag.current) return;
      setPos(clamp(e.clientX - drag.current.dx, e.clientY - drag.current.dy));
    };
    const onUp = () => { drag.current = null; document.body.style.userSelect = ""; };
    const onResize = () => setPos((p) => clamp(p.x, p.y));
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); window.removeEventListener("resize", onResize); };
  }, []);

  const startDrag = (e: React.MouseEvent) => {
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    document.body.style.userSelect = "none";
  };

  if (!mounted) return null;

  return createPortal(
    <div
      onMouseDown={onFocus}
      className="fixed z-[2000] rounded-2xl shadow-2xl border border-gray-200 bg-white overflow-hidden flex flex-col"
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
    </div>,
    document.body
  );
}

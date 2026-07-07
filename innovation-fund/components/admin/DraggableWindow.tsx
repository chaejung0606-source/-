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
  const winRef = useRef<HTMLDivElement>(null);

  // 창이 화면(뷰포트)을 벗어나 안 보이게 되는 것을 방지: 항상 화면 안에 머물도록 좌표를 보정.
  // 창이 화면보다 큰 경우엔 좌상단을 0으로 고정해 최소한 좌상단이 보이게 한다.
  const clamp = (x: number, y: number) => {
    const el = winRef.current;
    const w = el?.offsetWidth ?? initial?.w ?? 520;
    const h = el?.offsetHeight ?? initial?.h ?? 560;
    const maxX = Math.max(0, window.innerWidth - w);
    const maxY = Math.max(0, window.innerHeight - h);
    return { x: Math.min(Math.max(0, x), maxX), y: Math.min(Math.max(0, y), maxY) };
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!drag.current) return;
      setPos(clamp(e.clientX - drag.current.dx, e.clientY - drag.current.dy));
    };
    const onUp = () => { drag.current = null; document.body.style.userSelect = ""; };
    // 브라우저 창 크기가 바뀌어도(작아져도) 팝업이 화면 밖으로 나가지 않게 재보정
    const onResize = () => setPos((p) => clamp(p.x, p.y));
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); window.removeEventListener("resize", onResize); };
  }, []);

  // 최초 표시 시에도 초기 좌표가 화면을 벗어나면 보정
  useEffect(() => { setPos((p) => clamp(p.x, p.y)); }, []);

  const startDrag = (e: React.MouseEvent) => {
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    document.body.style.userSelect = "none";
  };

  return (
    <div
      ref={winRef}
      className="fixed z-[120] rounded-2xl shadow-2xl border border-gray-200 bg-white overflow-hidden flex flex-col"
      style={{ left: pos.x, top: pos.y, width: initial?.w ?? 520, height: initial?.h ?? 560, resize: "both", minWidth: 280, minHeight: 220, maxWidth: "100vw", maxHeight: "100vh" }}
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

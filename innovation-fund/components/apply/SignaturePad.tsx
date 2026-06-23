"use client";
import { useRef, useEffect, useState } from "react";

interface Props {
  onChange: (dataUrl: string) => void;  // 서명 PNG(base64) — 비우면 ""
}

// 마우스·터치로 직접 그리는 서명 패드 (외부 라이브러리 없이 Canvas + Pointer Events)
export default function SignaturePad({ onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = Math.max(1, rect.width) * ratio;
    c.height = Math.max(1, rect.height) * ratio;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
  }, []);

  const pos = (e: React.PointerEvent) => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent) => {
    drawing.current = true;
    last.current = pos(e);
    try { (e.target as Element).setPointerCapture(e.pointerId); } catch { /* noop */ }
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !last.current) return;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    if (!hasInk) setHasInk(true);
  };
  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    const c = canvasRef.current;
    if (c && hasInk) onChange(c.toDataURL("image/png"));
  };

  const clear = () => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (c && ctx) ctx.clearRect(0, 0, c.width, c.height);
    setHasInk(false);
    onChange("");
  };

  return (
    <div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-full h-40 rounded-xl bg-white border-2 border-dashed border-gray-300 touch-none cursor-crosshair"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
        />
        {!hasInk && (
          <span className="absolute inset-0 flex items-center justify-center text-sm text-gray-300 pointer-events-none">
            이 영역에 마우스 또는 손가락으로 서명하세요
          </span>
        )}
      </div>
      <div className="flex items-center justify-end mt-2">
        <button type="button" onClick={clear} className="text-xs text-red-500 hover:underline">지우기</button>
      </div>
    </div>
  );
}

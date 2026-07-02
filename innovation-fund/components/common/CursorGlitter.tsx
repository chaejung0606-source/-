"use client";
import { useEffect, useRef } from "react";

// 영롱한 색 입자 (펄/홀로그래픽 톤)
const COLORS = ["#ffffff", "#bae6fd", "#ddd6fe", "#c4fde0", "#fbcfe8", "#fde68a"];
// 은색빛 입자 (메탈릭 실버 톤)
const SILVER = ["#f8fafc", "#e5e7eb", "#cbd5e1", "#dde3ea", "#eef2f7"];
const STAR = "polygon(50% 0%, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0% 50%, 39% 39%)";

// 마우스 포인터를 따라다니는 반짝이 효과 (클릭 비차단, 기능 영향 없음)
export default function CursorGlitter() {
  const last = useRef({ x: 0, y: 0, t: 0 });
  const dragging = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    // 터치 기기에서는 비활성 (포인터 이동이 없음)
    if (window.matchMedia?.("(hover: none)").matches) return;

    const spawn = (x: number, y: number) => {
      const el = document.createElement("span");
      const size = 5 + Math.random() * 7;
      // 절반가량은 은색빛(메탈릭 실버) 반짝임으로 — 드래그 시 은은한 은빛이 섞이도록
      const silver = Math.random() < 0.5;
      const color = silver
        ? SILVER[Math.floor(Math.random() * SILVER.length)]
        : COLORS[Math.floor(Math.random() * COLORS.length)];
      // 실버는 금속 광택(그라데이션)과 흰빛 글로우로 반짝임 강조
      const background = silver
        ? `linear-gradient(135deg,#ffffff 0%,${color} 45%,#9aa4b2 55%,#ffffff 100%)`
        : color;
      const glow = silver
        ? "drop-shadow(0 0 4px #ffffff) drop-shadow(0 0 7px #cbd5e1)"
        : `drop-shadow(0 0 3px ${color})`;
      const dx = (Math.random() - 0.5) * 36;
      const dy = (Math.random() - 0.5) * 24 + 14; // 살짝 아래로 떨어지듯
      el.style.cssText = [
        "position:fixed",
        `left:${x}px`, `top:${y}px`,
        `width:${size}px`, `height:${size}px`,
        `background:${background}`,
        `clip-path:${STAR}`,
        "margin-left:" + (-size / 2) + "px",
        "margin-top:" + (-size / 2) + "px",
        "pointer-events:none",
        "z-index:9999",
        `filter:${glow}`,
        "will-change:transform,opacity",
      ].join(";");
      document.body.appendChild(el);
      const anim = el.animate(
        [
          { transform: "translate(0,0) scale(0.4) rotate(0deg)", opacity: 1 },
          { transform: `translate(${dx}px,${dy}px) scale(1) rotate(90deg)`, opacity: 0.9, offset: 0.4 },
          { transform: `translate(${dx * 1.6}px,${dy * 1.8}px) scale(0) rotate(160deg)`, opacity: 0 },
        ],
        { duration: 750 + Math.random() * 250, easing: "ease-out" },
      );
      anim.onfinish = () => el.remove();
      anim.oncancel = () => el.remove();
    };

    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return; // 드래그 중일 때만 반짝이 생성
      const now = performance.now();
      const dist = Math.hypot(e.clientX - last.current.x, e.clientY - last.current.y);
      if (now - last.current.t < 28 && dist < 16) return;
      last.current = { x: e.clientX, y: e.clientY, t: now };
      spawn(e.clientX, e.clientY);
    };
    const onDown = () => { dragging.current = true; };
    const onUp = () => { dragging.current = false; };

    window.addEventListener("mousedown", onDown, { passive: true });
    window.addEventListener("mouseup", onUp, { passive: true });
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return null;
}

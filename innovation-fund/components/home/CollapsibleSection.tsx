"use client";
import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

// 홈 섹션 접기/펼치기 래퍼 — 기본은 접힘. 제목 클릭으로 토글.
// URL 해시(#id)로 진입하면 자동으로 펼치고 해당 위치로 스크롤한다. (상단바 '자격증 목록' 메뉴 등)
export default function CollapsibleSection({
  id, title, sub, defaultOpen = false, children,
}: {
  id?: string;
  title: ReactNode;
  sub?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (!id) return;
    const check = () => {
      if (window.location.hash === `#${id}`) {
        setOpen(true);
        // 펼친 뒤 위치로 스크롤 (렌더 후)
        setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
      }
    };
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, [id]);

  return (
    <section id={id} style={{ scrollMarginTop: 90 }}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full text-left group" aria-expanded={open}>
        <h2 className="text-2xl font-bold text-gray-800 mb-1 flex items-center gap-2 flex-wrap">
          {title}
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400 group-hover:text-indigo-500 transition-colors">
            <ChevronDown className={`w-5 h-5 transition-transform ${open ? "rotate-180" : ""}`} />
            {open ? "접기" : "펼치기"}
          </span>
        </h2>
        {sub && <p className="text-sm text-gray-500">{sub}</p>}
      </button>
      {open && <div className="mt-4">{children}</div>}
    </section>
  );
}

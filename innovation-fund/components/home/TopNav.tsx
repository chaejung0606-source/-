"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { APPLICATION_TYPE_LABELS, PICK_TYPES_PRE, PICK_TYPES_FUND } from "@/types";

interface SubItem { label: string; href: string; }
interface Menu { label: string; href?: string; items?: SubItem[]; }

// 홈 상단바 메뉴 — 상위목록 클릭 시 해당 섹션 페이지(/menu/*)로, 커서 올리면 하위목록.
const MENUS: Menu[] = [
  { label: "지원신청", href: "/menu/pre", items: PICK_TYPES_PRE.map((t) => ({ label: APPLICATION_TYPE_LABELS[t], href: `/apply?type=${t}&mode=pre` })) },
  { label: "지원금신청", href: "/menu/fund", items: PICK_TYPES_FUND.map((t) => ({ label: APPLICATION_TYPE_LABELS[t], href: `/apply?type=${t}` })) },
  // 자격증 목록 — 독립 페이지 (공간대여와 동일한 방식)
  { label: "자격증 목록", href: "/certificates" },
  { label: "공간대여", href: "/space-rental" },
];

export default function TopNav() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <nav className="flex-1 min-w-0">
      <div>
        <ul className="flex flex-wrap items-center justify-center gap-0.5 sm:gap-1.5">
          {MENUS.map((m) => (
            <li
              key={m.label}
              className="relative"
              onMouseEnter={() => setOpen(m.label)}
              onMouseLeave={() => setOpen((o) => (o === m.label ? null : o))}
            >
              {!m.items ? (
                <Link href={m.href!} className="flex items-center gap-1 px-3 py-2.5 text-sm font-semibold text-gray-700 hover:text-indigo-600 transition-colors">
                  {m.label}
                </Link>
              ) : (
                <>
                  {/* 상위목록 클릭 → 섹션 페이지, 커서 올림 → 하위목록 */}
                  <Link
                    href={m.href!}
                    onClick={() => setOpen(null)}
                    className="flex items-center gap-1 px-3 py-2.5 text-sm font-semibold text-gray-700 hover:text-indigo-600 transition-colors"
                    aria-expanded={open === m.label}
                  >
                    {m.label}
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open === m.label ? "rotate-180" : ""}`} />
                  </Link>
                  {open === m.label && (
                    <div className="absolute left-0 top-full z-50 min-w-[190px] rounded-xl border border-gray-200 bg-white shadow-xl py-1.5">
                      {m.items.map((s) => (
                        <Link
                          key={s.href}
                          href={s.href}
                          onClick={() => setOpen(null)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 whitespace-nowrap"
                        >
                          {s.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

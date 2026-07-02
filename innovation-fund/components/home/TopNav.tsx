"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { APPLICATION_TYPE_LABELS, PICK_TYPES_PRE, PICK_TYPES_FUND } from "@/types";

interface SubItem { label: string; href: string; }
interface Menu { label: string; href?: string; items?: SubItem[]; }

// 홈 상단바 메뉴 — 지원신청/지원금신청/소학회는 하위 목록, 공간대여는 바로가기.
const MENUS: Menu[] = [
  { label: "지원신청", items: PICK_TYPES_PRE.map((t) => ({ label: APPLICATION_TYPE_LABELS[t], href: `/apply?type=${t}&mode=pre` })) },
  { label: "지원금신청", items: PICK_TYPES_FUND.map((t) => ({ label: APPLICATION_TYPE_LABELS[t], href: `/apply?type=${t}` })) },
  // 소학회는 독립 메뉴 — 하위로 지원신청/지원금신청
  { label: "소학회", items: [
    { label: "지원신청", href: "/apply?type=club&mode=pre" },
    { label: "지원금신청", href: "/apply?type=club" },
  ] },
  { label: "공간대여", href: "/space-rental" },
];

export default function TopNav() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <nav className="border-t border-white/40 bg-white/40 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4">
        <ul className="flex flex-wrap items-center gap-1 sm:gap-2">
          {MENUS.map((m) => (
            <li
              key={m.label}
              className="relative"
              onMouseEnter={() => setOpen(m.label)}
              onMouseLeave={() => setOpen((o) => (o === m.label ? null : o))}
            >
              {m.href && !m.items ? (
                <Link href={m.href} className="flex items-center gap-1 px-3 py-2.5 text-sm font-semibold text-gray-700 hover:text-indigo-600 transition-colors">
                  {m.label}
                </Link>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setOpen((o) => (o === m.label ? null : m.label))}
                    className="flex items-center gap-1 px-3 py-2.5 text-sm font-semibold text-gray-700 hover:text-indigo-600 transition-colors"
                    aria-expanded={open === m.label}
                  >
                    {m.label}
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open === m.label ? "rotate-180" : ""}`} />
                  </button>
                  {open === m.label && m.items && (
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

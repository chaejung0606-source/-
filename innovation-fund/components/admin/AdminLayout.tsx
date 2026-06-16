"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Shield, LayoutDashboard, FileText, Settings, Home, Menu, X } from "lucide-react";

const NAV = [
  { href: "/admin/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/admin/applications", label: "신청 목록", icon: FileText },
  { href: "/admin/settings", label: "내보내기 설정", icon: Settings },
  { href: "/", label: "메인 사이트", icon: Home },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);

  const SidebarContent = () => (
    <>
      <div className="flex items-center gap-2.5 px-3 py-2 mb-6">
        <div className="glass-pill w-10 h-10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-[#4f8cff]" />
        </div>
        <div>
          <div className="text-[11px] text-gray-400 leading-none mb-0.5">혁신융합대학사업단</div>
          <div className="font-bold text-sm holo-text">혁신인재지원금</div>
        </div>
      </div>
      <nav className="space-y-1.5">
        {NAV.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setDrawerOpen(false)}
              className={`sidebar-item ${isActive(item.href) ? "active" : ""}`}
            >
              <Icon className="w-[18px] h-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <div className="min-h-screen flex">
      {/* 데스크톱 사이드바 */}
      <aside className="sidebar hidden lg:flex flex-col w-[260px] flex-shrink-0 p-4 sticky top-0 h-screen">
        <SidebarContent />
      </aside>

      {/* 모바일 드로어 */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="modal-backdrop absolute inset-0" onClick={() => setDrawerOpen(false)} />
          <aside className="sidebar relative flex flex-col w-[260px] p-4 h-full">
            <button onClick={() => setDrawerOpen(false)} className="absolute top-4 right-4 text-gray-400">
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* 메인 영역 */}
      <div className="flex-1 min-w-0">
        {/* 헤더 */}
        <header className="glass-header sticky top-0 z-40 h-[64px] flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setDrawerOpen(true)} className="lg:hidden text-gray-600">
              <Menu className="w-6 h-6" />
            </button>
            <span className="font-bold text-gray-800">관리자 시스템</span>
          </div>
        </header>

        <main className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8">{children}</main>
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Home as HomeIcon } from "lucide-react";
import { DEFAULT_GUIDE, type GuideSection } from "@/lib/guide";
import ApplyGuideDynamic from "@/components/home/ApplyGuideDynamic";

// 신청자 이용안내 — 사이드바 '이용안내'에서 플랫폼 작은 창(iframe)으로 열리고, 직접 접속(/guide)도 가능.
// 내용은 관리자 페이지(사이트 설정 → 이용안내)에서 편집. 미설정 시 코드 기본값 표시.
export default function GuidePage() {
  const [sections, setSections] = useState<GuideSection[]>(DEFAULT_GUIDE.sections);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/guide")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d?.sections) && d.sections.length) setSections(d.sections); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        .guide-body { font-size: 14px; line-height: 1.7; color: #1f2937; }
        .guide-body p { margin: 6px 0; }
        .guide-body ul, .guide-body ol { margin: 6px 0; padding-left: 20px; }
        .guide-body li { margin: 3px 0; }
        .guide-body b { color: #111827; }
        .guide-body table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 13px; }
        .guide-body td, .guide-body th { border: 1px solid #e5e7eb; padding: 6px 8px; }
      `}</style>

      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-gray-800">
          <BookOpen className="w-5 h-5 text-indigo-500" /> 이용안내
        </div>
        <Link href="/" className="text-xs text-gray-500 hover:text-indigo-600 inline-flex items-center gap-1">
          <HomeIcon className="w-3.5 h-3.5" /> 홈
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5">
        {/* 신청 방법 — 유형별 상세 (현재 프로그램·신청폼에서 실시간 자동 생성) */}
        <section id="apply-guide" className="scroll-mt-16 mb-8">
          <h2 className="text-lg font-extrabold text-gray-900 mb-1">🧭 신청 방법 — 유형별 상세 안내</h2>
          <p className="text-[13px] text-gray-500 mb-3">무엇을 어디서 클릭하고, 무엇을 작성하며, 어떤 서류를 내야 하는지 안내합니다.</p>
          <ApplyGuideDynamic />
        </section>

        {loading ? (
          <p className="text-sm text-gray-400 py-10 text-center">불러오는 중...</p>
        ) : sections.length === 0 ? (
          <p className="text-sm text-gray-400 py-10 text-center">등록된 이용안내가 없습니다.</p>
        ) : (
          <>
            {/* 목차 */}
            {sections.length > 1 && (
              <nav className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 mb-5">
                <div className="text-xs font-semibold text-gray-500 mb-1.5">목차</div>
                <ul className="space-y-0.5">
                  <li><a href="#apply-guide" className="text-sm text-indigo-600 hover:underline">🧭 신청 방법 — 유형별 상세 안내</a></li>
                  {sections.map((s) => (
                    <li key={s.id}>
                      <a href={`#${s.id}`} className="text-sm text-indigo-600 hover:underline">{s.title}</a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}

            <div className="space-y-6">
              {sections.map((s) => (
                <section key={s.id} id={s.id} className="scroll-mt-16">
                  <h2 className="text-base font-bold text-gray-900 mb-2 pb-1.5 border-b border-gray-100">{s.title}</h2>
                  <div className="guide-body" dangerouslySetInnerHTML={{ __html: s.html }} />
                </section>
              ))}
            </div>
          </>
        )}
        <p className="text-[11px] text-gray-400 text-center mt-8">
          강원대학교 데이터보안·활용 혁신융합대학사업단 · 이용안내
          <br />플랫폼 {process.env.NEXT_PUBLIC_BUILD_VERSION || ""} · 업데이트 {process.env.NEXT_PUBLIC_BUILD_DATE || ""} 기준 (신청 방법 안내는 현재 신청폼 기준 실시간 표시)
        </p>
      </main>
    </div>
  );
}

"use client";
import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Home as HomeIcon, ChevronRight, Info } from "lucide-react";
import type { ApplicationType } from "@/types";
import { APPLICATION_TYPE_LABELS, PICK_TYPES_PRE, PICK_TYPES_FUND } from "@/types";
import TopNav from "@/components/home/TopNav";
import TypeCriteria from "@/components/home/TypeCriteria";

const ICONS: Record<ApplicationType, string> = {
  program: "📋", staff: "👥", grade: "🎓", contest: "🏆", certificate: "📜", labor: "🛠️", etc: "🗂️", activity: "🎒", club: "🧑‍💻",
};

type SectionKey = "pre" | "fund" | "club";
interface SectionCfg {
  title: string; emoji: string; desc: string;
  types: ApplicationType[];
  hrefFor: (t: ApplicationType) => string;
  applyLabel: string;
}
const SECTIONS: Record<SectionKey, SectionCfg> = {
  pre: {
    title: "지원신청", emoji: "📝", desc: "활동 시작 전, 참여할 지원 종류를 선택해 신청합니다.",
    types: PICK_TYPES_PRE, hrefFor: (t) => `/apply?type=${t}&mode=pre`, applyLabel: "지원하기",
  },
  fund: {
    title: "지원금신청", emoji: "💸", desc: "활동 후, 신청할 지원금 종류를 선택해 신청합니다.",
    types: PICK_TYPES_FUND, hrefFor: (t) => `/apply?type=${t}`, applyLabel: "지원금 신청하기",
  },
  club: {
    title: "소학회", emoji: "🧑‍💻", desc: "첨단 ICT 분야(보안·클라우드·블록체인 등) 소학회(동아리) 활동을 지원합니다.",
    types: ["club"], hrefFor: (t) => `/apply?type=${t}`, applyLabel: "지원금신청",
  },
};

export default function MenuSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = use(params);
  const cfg = SECTIONS[section as SectionKey];
  if (!cfg) return notFound();
  const isClub = section === "club";

  return (
    <div className="min-h-screen">
      <header className="glass-header sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 flex items-center justify-center shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/sdu-shield.png" alt="SDU 사업단 로고" className="w-full h-full object-contain" />
            </div>
            <div className="font-bold text-sm sm:text-lg leading-tight holo-text truncate">학생 지원금 신청 플랫폼</div>
          </Link>
          <TopNav />
          <Link href="/" className="glass-pill px-4 h-10 flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-indigo-600 shrink-0"><HomeIcon className="w-4 h-4" /> 홈</Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-indigo-500 hover:text-indigo-700 mb-4"><ArrowLeft className="w-4 h-4" /> 홈으로</Link>
        <div className="mb-6">
          {/* 이모지는 holo-text(그라데이션 텍스트) 밖에 두어 상자처럼 보이는 문제 방지 */}
          <h1 className="text-3xl font-extrabold mb-1 flex items-center gap-2">
            <span aria-hidden="true">{cfg.emoji}</span>
            <span className="holo-text">{cfg.title}</span>
          </h1>
          <p className="text-gray-600">{cfg.desc}</p>
        </div>

        {/* 유형별: 신청 기능 + 신청기준 안내(독립 칸) */}
        <div className="space-y-6">
          {cfg.types.map((t) => (
            <div key={t} className="card">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="text-3xl shrink-0">{ICONS[t]}</div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-lg text-gray-800">{isClub ? "첨단 ICT 소학회" : APPLICATION_TYPE_LABELS[t]}</h3>
                    {isClub && <p className="text-sm text-gray-600 mt-0.5">소학회별 최소 6명 · 회장 혁신인재지원금(월 24만원) · 운영비 최대 200만원/학기</p>}
                  </div>
                </div>
                {isClub ? (
                  <div className="flex gap-2 shrink-0">
                    <Link href="/apply?type=club&mode=pre" className="btn-secondary justify-center text-sm">지원신청</Link>
                    <Link href="/apply?type=club" className="btn-primary justify-center text-sm">지원금신청</Link>
                  </div>
                ) : (
                  <Link href={cfg.hrefFor(t)} className={`${section === "fund" ? "btn-primary" : "btn-secondary"} justify-center shrink-0`}>
                    {cfg.applyLabel} <ChevronRight className="w-4 h-4" />
                  </Link>
                )}
              </div>

              {/* 신청기준 안내 — 신청 버튼 아래 독립 칸에 바로 표시 */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-bold text-indigo-600 mb-2 flex items-center gap-1"><Info className="w-3.5 h-3.5" /> 신청기준 안내</p>
                <TypeCriteria type={t} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

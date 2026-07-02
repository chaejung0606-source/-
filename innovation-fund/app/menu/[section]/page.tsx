"use client";
import { use, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Home as HomeIcon, ChevronRight, Info } from "lucide-react";
import type { ApplicationType } from "@/types";
import { APPLICATION_TYPE_LABELS, PICK_TYPES_PRE, PICK_TYPES_FUND } from "@/types";
import TopNav from "@/components/home/TopNav";
import FundTypeModal from "@/components/home/FundTypeModal";

const ICONS: Record<ApplicationType, string> = {
  program: "📋", staff: "👥", grade: "🎓", contest: "🏆", certificate: "📜", labor: "🛠️", activity: "🎒", club: "🧑‍💻",
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
    types: ["club"], hrefFor: (t) => `/apply?type=${t}`, applyLabel: "신청하기",
  },
};

export default function MenuSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = use(params);
  const cfg = SECTIONS[section as SectionKey];
  const [modalType, setModalType] = useState<ApplicationType | null>(null);
  if (!cfg) return notFound();

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
          <h1 className="text-3xl font-extrabold holo-text mb-1 flex items-center gap-2"><span>{cfg.emoji}</span> {cfg.title}</h1>
          <p className="text-gray-600">{cfg.desc}</p>
        </div>

        {/* 하위목록 + 신청 기능 + 신청기준 안내 */}
        {section === "club" ? (
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="card flex flex-col">
              <div className="text-3xl mb-3">🧑‍💻</div>
              <h3 className="font-bold text-lg text-gray-800 mb-2">첨단 ICT 소학회</h3>
              <div className="mb-5 flex-1"><p className="text-sm text-gray-600">소학회별 최소 6명 · 회장 혁신인재지원금(월 24만원) · 운영비 최대 200만원/학기</p></div>
              <div className="grid grid-cols-2 gap-2">
                <Link href="/apply?type=club&mode=pre" className="btn-secondary w-full justify-center text-sm">지원신청</Link>
                <Link href="/apply?type=club" className="btn-primary w-full justify-center text-sm">지원금신청</Link>
              </div>
              <button onClick={() => setModalType("club")} className="mt-2 text-xs text-indigo-500 hover:text-indigo-700 inline-flex items-center justify-center gap-1"><Info className="w-3.5 h-3.5" /> 신청기준 안내 보기</button>
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {cfg.types.map((t) => (
              <div key={t} className="card flex flex-col">
                <div className="text-3xl mb-3">{ICONS[t]}</div>
                <h3 className="font-bold text-lg text-gray-800 mb-2">{APPLICATION_TYPE_LABELS[t]}</h3>
                <div className="mb-5 flex-1">
                  <button onClick={() => setModalType(t)} className="text-sm text-indigo-500 hover:text-indigo-700 inline-flex items-center gap-1"><Info className="w-3.5 h-3.5" /> 신청기준 안내 보기</button>
                </div>
                <Link href={cfg.hrefFor(t)} className={`${section === "fund" ? "btn-primary" : "btn-secondary"} w-full justify-center`}>
                  {cfg.applyLabel} <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        )}

        <p className="text-sm text-gray-500 mt-6">※ ‘신청기준 안내 보기’를 누르면 각 유형의 세부 지급 기준과 신청 가능한 프로그램을 확인할 수 있습니다.</p>
      </div>

      <FundTypeModal type={modalType} onClose={() => setModalType(null)} />
    </div>
  );
}

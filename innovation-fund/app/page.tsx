"use client";
import { useState } from "react";
import Link from "next/link";
import { Shield, FileText, Award, BookOpen, ChevronRight, CheckCircle, AlertCircle, MessageCircle, Globe, GraduationCap, Mail, Phone, MapPin } from "lucide-react";
import type { ApplicationType, FundCategory } from "@/types";
import { APPLICATION_TYPE_LABELS, FUND_CATEGORY_LABELS, CATEGORY_TYPES } from "@/types";
import FundTypeModal from "@/components/home/FundTypeModal";

const typeMeta: Record<ApplicationType, { icon: string; desc: string; note?: string }> = {
  labor: { icon: "🛠️", desc: "사업단 프로그램 근로학생 참여 — 근무상황부 기준 지급", note: "학부 15,000원/시간 · 대학원 20,000원/시간 (월 40시간 이내)" },
  program: { icon: "📋", desc: "사업단 승인 교과·비교과, 현장실습, 인턴십, 학회 참석 등" },
  staff: { icon: "👥", desc: "사업단 프로그램 진행 보조 업무 수행 학생", note: "대학생 15,000원/시간 · 대학원생 20,000원/시간" },
  grade: { icon: "🎓", desc: "마이크로디그리(30만원) · 부전공(100만원) · 복수전공(150만원)", note: "평점 평균 3.0 이상" },
  contest: { icon: "🏆", desc: "사업단 분야 관련 경진대회 입상자", note: "A규모·B규모 / 개인·팀 별 차등 지급" },
  certificate: { icon: "📜", desc: "미래융합가상학과 학생 대상 자격증 취득 지원", note: "난이도 상(70만원) · 중(40만원) · 하(10만원)" },
  activity: { icon: "🎒", desc: "학생 자치·동아리 활동, 학술 행사·학회 참가 등 지원" },
};

const categorySubtitle: Record<FundCategory, string> = {
  labor: "근무상황부를 증빙으로 지급하는 근로장학금",
  innovation: "우수 학생의 성장을 지원하는 5개 유형",
  activity: "학생 활동을 지원하는 새로운 지원금",
};
const CATEGORY_ORDER: FundCategory[] = ["labor", "innovation", "activity"];

const steps = ["모집 공고 및 안내", "신청 및 접수", "검토 및 심의", "대상 확정 및 통보", "지원금 지급"];

const eligibleList = [
  "강원대학교 재학생",
  "대학원생",
  "대학원 수료생(수료 후 2년 이내)",
  "자격증 지원금은 미래융합가상학과 학생에 한함",
];

const ineligibleList = [
  "휴학생·졸업생·졸업유예생",
  "학기 미등록자",
  "징계 처분 중인 자",
  "허위 신청자·지원조건 미이행자",
  "사업 목적과 무관한 활동 신청자",
];

export default function Home() {
  const [modalType, setModalType] = useState<ApplicationType | null>(null);

  return (
    <div className="min-h-screen">
      {/* 헤더 */}
      <header className="glass-header sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="glass-pill w-11 h-11 flex items-center justify-center">
              <Shield className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-gray-500 hidden sm:block">강원대학교 데이터보안·활용 혁신융합대학사업단</div>
              <div className="font-bold text-sm sm:text-lg leading-tight holo-text truncate">지원금 신청 플랫폼</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-xs sm:text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors whitespace-nowrap">로그인</Link>
            <Link href="/admin/login" className="text-xs sm:text-sm font-medium text-indigo-500 hover:text-indigo-700 transition-colors whitespace-nowrap flex-shrink-0">
              관리자 <span className="hidden sm:inline">로그인</span> →
            </Link>
          </div>
        </div>
      </header>

      {/* 히어로 */}
      <section className="py-20 px-4 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-5 holo-text leading-tight">혁신융합대학 지원금 신청</h1>
          <p className="handwriting text-gray-700 text-3xl sm:text-4xl mb-10 leading-snug">
            강원대학교 데이터보안·활용 혁신융합대학 사업단이 우수 학생의 성장을 지원합니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {CATEGORY_ORDER.map((c) => (
              <Link key={c} href={`/apply?category=${c}`} className="btn-primary inline-flex items-center justify-center gap-2 text-base px-8 py-3.5">
                {FUND_CATEGORY_LABELS[c]} 신청 <ChevronRight className="w-4 h-4" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-12 space-y-12">
        {/* 운영 절차 */}
        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-500" /> 운영 절차
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            {steps.map((step, i) => (
              <div key={i} className="flex-1 card flex flex-col items-center py-5">
                <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-white text-sm mb-3" style={{ background: "linear-gradient(135deg, #5eead4, #60a5fa, #a78bfa)", boxShadow: "0 4px 14px rgba(96,165,250,0.4)" }}>
                  {i + 1}
                </div>
                <div className="text-center text-sm font-semibold text-gray-700">{step}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 카테고리별 유형 분석 */}
        {CATEGORY_ORDER.map((cat) => (
          <section key={cat}>
            <h2 className="text-2xl font-bold text-gray-800 mb-1 flex items-center gap-2">
              <Award className="w-6 h-6 text-indigo-500" /> {FUND_CATEGORY_LABELS[cat]}
            </h2>
            <p className="text-sm text-gray-500 mb-5">{categorySubtitle[cat]} · 유형을 클릭하면 자세한 내용을 볼 수 있습니다.</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {CATEGORY_TYPES[cat].map((type) => {
                const m = typeMeta[type];
                return (
                  <button
                    key={type}
                    onClick={() => setModalType(type)}
                    className="card text-left hover:-translate-y-1 transition-transform duration-300 cursor-pointer"
                  >
                    <div className="text-3xl mb-3">{m.icon}</div>
                    <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-1">{APPLICATION_TYPE_LABELS[type]} <ChevronRight className="w-4 h-4 text-gray-300" /></h3>
                    <p className="text-sm text-gray-600 mb-3">{m.desc}</p>
                    {m.note && (
                      <p className="text-xs font-semibold text-sky-600 px-3 py-1.5 rounded-xl" style={{ background: "rgba(96,165,250,0.12)" }}>{m.note}</p>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        {/* 지급 대상 / 제한 */}
        <div className="grid sm:grid-cols-2 gap-6">
          <section className="card border-l-4 border-l-green-500">
            <h2 className="section-title flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" /> 지급 대상
            </h2>
            <ul className="space-y-2">
              {eligibleList.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="card border-l-4 border-l-red-400">
            <h2 className="section-title flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" /> 지급 제한
            </h2>
            <ul className="space-y-2">
              {ineligibleList.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" /> {item}
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* 신청 버튼 */}
        <div className="text-center py-6 flex flex-col sm:flex-row gap-3 justify-center">
          {CATEGORY_ORDER.map((c) => (
            <Link key={c} href={`/apply?category=${c}`} className="btn-primary text-base px-8 py-3.5">{FUND_CATEGORY_LABELS[c]} 신청하기</Link>
          ))}
        </div>
      </div>

      {/* 푸터 (엔드바) */}
      <footer className="glass-header py-8 pb-32 sm:pb-8 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm">
          <p className="font-bold holo-text mb-3 inline-block">강원대학교 데이터보안·활용 혁신융합대학사업단</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-gray-500">
            <a href="mailto:sducoss@kangwon.ac.kr" className="flex items-center gap-1.5 hover:text-[#4f8cff]">
              <Mail className="w-4 h-4" /> sducoss@kangwon.ac.kr
            </a>
            <a href="tel:033-250-7879" className="flex items-center gap-1.5 hover:text-[#4f8cff]">
              <Phone className="w-4 h-4" /> 033-250-7879
            </a>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" /> 강원대학교 한빛관 1층 105호
            </span>
          </div>
        </div>
      </footer>

      {/* 바로가기 플로팅 바 — 데스크톱: 우측 세로 / 모바일: 하단 가로 */}
      <aside className="fixed z-50 flex gap-2.5
        bottom-3 left-1/2 -translate-x-1/2 flex-row
        sm:bottom-auto sm:left-auto sm:translate-x-0 sm:right-5 sm:top-1/2 sm:-translate-y-1/2 sm:flex-col sm:gap-3">
        {[
          { href: "https://sducoss.ac.kr/ko/index", label: "사업단\n홈페이지", icon: Globe, color: "#4f8cff" },
          { href: "https://lms.sducoss.ac.kr/login.php", label: "LMS\n사이트", icon: BookOpen, color: "#2dd4bf" },
          { href: "https://iruri.kangwon.ac.kr", label: "이루리\n로그인", icon: GraduationCap, color: "#a78bfa" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              title={item.label.replace("\n", " ")}
              className="glass-pill w-[72px] h-[72px] flex flex-col items-center justify-center gap-1 hover:scale-105 transition-transform"
            >
              <Icon className="w-7 h-7" style={{ color: item.color }} />
              <span className="text-[10px] font-semibold text-gray-700 leading-tight text-center whitespace-pre-line">{item.label}</span>
            </a>
          );
        })}
        {/* 카카오톡 문의하기 */}
        <a
          href="http://pf.kakao.com/_YnXnn/chat"
          target="_blank"
          rel="noopener noreferrer"
          title="카카오톡으로 문의하기"
          className="w-[72px] h-[72px] flex flex-col items-center justify-center gap-1 rounded-3xl font-bold text-[#3c1e1e] hover:scale-105 transition-transform"
          style={{ background: "#FEE500", boxShadow: "0 12px 28px rgba(0,0,0,0.18)" }}
        >
          <MessageCircle className="w-7 h-7" />
          <span className="text-[10px] leading-tight text-center">카톡<br />문의</span>
        </a>
      </aside>

      <FundTypeModal type={modalType} onClose={() => setModalType(null)} />
    </div>
  );
}

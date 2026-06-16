"use client";
import Link from "next/link";
import { Shield, FileText, Users, Award, BookOpen, ChevronRight, CheckCircle, AlertCircle } from "lucide-react";

const fundTypes = [
  {
    id: "program",
    title: "프로그램 참여지원비",
    desc: "사업단 승인 교과·비교과, 현장실습, 인턴십, 학회 참석 등",
    icon: "📋",
  },
  {
    id: "staff",
    title: "진행요원비",
    desc: "사업단 프로그램 진행 보조 업무 수행 학생",
    icon: "👥",
    note: "대학생 15,000원/시간 · 대학원생 20,000원/시간",
  },
  {
    id: "grade",
    title: "성적 우수 지원금",
    desc: "마이크로디그리(30만원) · 부전공(100만원) · 복수전공(150만원)",
    icon: "🎓",
    note: "평점 평균 3.0 이상",
  },
  {
    id: "contest",
    title: "경진대회 입상 우수성과 지원금",
    desc: "사업단 분야 관련 경진대회 입상자",
    icon: "🏆",
    note: "A규모·B규모 / 개인·팀 별 차등 지급",
  },
  {
    id: "certificate",
    title: "자격증 취득 우수성과 지원금",
    desc: "미래융합가상학과 학생 대상 자격증 취득 지원",
    icon: "📜",
    note: "난이도 상(70만원) · 중(40만원) · 하(10만원)",
  },
];

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
              <div className="font-bold text-sm sm:text-lg leading-tight holo-text truncate">혁신인재지원금 신청 플랫폼</div>
            </div>
          </div>
          <Link href="/admin/login" className="text-xs sm:text-sm font-medium text-indigo-500 hover:text-indigo-700 transition-colors whitespace-nowrap flex-shrink-0">
            관리자 <span className="hidden sm:inline">로그인</span> →
          </Link>
        </div>
      </header>

      {/* 히어로 */}
      <section className="py-20 px-4 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-5 holo-text leading-tight">혁신인재지원금 신청</h1>
          <p className="text-gray-600 text-lg mb-10">
            강원대학교 혁신융합대학 사업단이 우수 학생의 성장을 지원합니다.
          </p>
          <Link
            href="/apply"
            className="btn-primary inline-flex items-center gap-2 text-lg px-10 py-4"
          >
            지금 신청하기 <ChevronRight className="w-5 h-5" />
          </Link>
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
                <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-white text-sm mb-3" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899)", boxShadow: "0 4px 14px rgba(139,92,246,0.4)" }}>
                  {i + 1}
                </div>
                <div className="text-center text-sm font-semibold text-gray-700">{step}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 지원금 유형 */}
        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Award className="w-6 h-6 text-indigo-500" /> 지원금 유형
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {fundTypes.map((type) => (
              <div key={type.id} className="card hover:-translate-y-1 transition-transform duration-300">
                <div className="text-3xl mb-3">{type.icon}</div>
                <h3 className="font-bold text-gray-800 mb-2">{type.title}</h3>
                <p className="text-sm text-gray-600 mb-3">{type.desc}</p>
                {type.note && (
                  <p className="text-xs font-semibold text-indigo-600 px-3 py-1.5 rounded-xl" style={{ background: "rgba(139,92,246,0.1)" }}>{type.note}</p>
                )}
              </div>
            ))}
          </div>
        </section>

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
        <div className="text-center py-6">
          <Link href="/apply" className="btn-primary text-base px-10 py-3.5">
            혁신인재지원금 신청하기
          </Link>
          <p className="text-sm text-gray-500 mt-3">신청 전 지급 기준을 반드시 확인해주세요.</p>
        </div>
      </div>

      {/* 푸터 */}
      <footer className="glass-header py-8 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm">
          <p className="font-bold holo-text mb-1 inline-block">강원대학교 데이터보안·활용 혁신융합대학사업단</p>
          <p className="text-gray-500">문의사항이 있으시면 사업단 사무실로 연락해주세요.</p>
        </div>
      </footer>
    </div>
  );
}

"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { FileText, Award, BookOpen, ChevronRight, CheckCircle, AlertCircle, MessageCircle, Globe, GraduationCap, Mail, Phone, MapPin, User, Home as HomeIcon, LogOut, Link2, Shield } from "lucide-react";
import type { ApplicationType } from "@/types";
import { APPLICATION_TYPE_LABELS, categoryOfType, PICK_TYPES_FUND, PICK_TYPES_PRE } from "@/types";
import { fetchSiteConfig, DEFAULT_SITE_CONFIG, type SiteConfig } from "@/lib/site-config";
import { fetchPrograms, filterActiveByType, type Program, type ApplyPhase } from "@/lib/programs";
import { fetchTypePeriods, isTypeOpen, periodLabel, PERIOD_TYPES, type TypePeriods } from "@/lib/type-periods";
import FundTypeModal from "@/components/home/FundTypeModal";
import DraggableWindow from "@/components/admin/DraggableWindow";
import FooterWalkers from "@/components/home/FooterWalkers";
import HeroClouds from "@/components/home/HeroClouds";
import CertList from "@/components/home/CertList";
import { supabase } from "@/lib/supabase";
import { logout } from "@/lib/auth";

const SIDEBAR_ICONS: Record<string, typeof Globe> = { Globe, BookOpen, GraduationCap, MessageCircle, Mail, Phone, Award, FileText };
const FOOTER_ICONS: Record<string, typeof Globe> = { Mail, Phone, MapPin, Globe, Link2, MessageCircle, GraduationCap, BookOpen };


// 유형 분석 카드 (클릭 시 세부내용 모달)
const typeMeta: Record<ApplicationType, { icon: string; desc: string; note?: string }> = {
  labor: { icon: "🛠️", desc: "사업단 프로그램 근로학생 참여 — 근무상황부 기준 지급" },
  program: { icon: "📋", desc: "사업단 승인 교과·비교과, 현장실습, 인턴십, 학회 참석 등" },
  staff: { icon: "👥", desc: "사업단 프로그램 진행 보조 업무 수행 학생" },
  grade: { icon: "🎓", desc: "마이크로디그리(30만원) · 부전공(100만원) · 복수전공(150만원)", note: "평점 평균 3.0 이상" },
  contest: { icon: "🏆", desc: "사업단 분야 관련 경진대회 입상자", note: "A규모·B규모 / 개인·팀 별 차등 지급" },
  certificate: { icon: "📜", desc: "미래융합가상학과 학생 대상 자격증 취득 지원", note: "난이도 상(70만원) · 중(40만원) · 하(10만원)" },
  activity: { icon: "🎒", desc: "학생 자치·동아리 활동, 학술 행사·학회 참가 등 지원" },
  club: { icon: "🧑‍💻", desc: "첨단 ICT 분야(보안·클라우드·블록체인 등) 소학회(동아리) 활동 지원", note: "소학회별 최소 6명 · 회장 혁신인재지원금" },
};

const ALL_TYPES: ApplicationType[] = ["labor", "program", "staff", "grade", "contest", "certificate"];

const steps = ["모집 공고 및 안내", "신청 및 접수", "검토 및 심의", "대상 확정 및 통보", "지원금 지급"];

const eligibleList = [
  "강원대학교 재학생(학부)",
  "대학원생은 근로장학금에 한하여 지원 가능",
  "자격증 지원금은 미래융합가상학과 학생에 한함",
];

const ineligibleList = [
  "대학원생(근로장학금 제외) · 대학원 수료생 · 연구과정 참여학생",
  "휴학생·졸업생·졸업유예생",
  "학기 미등록자",
  "징계 처분 중인 자",
  "허위 신청자·지원조건 미이행자",
  "사업 목적과 무관한 활동 신청자",
];

// 외부 링크(구글 드라이브·문서 등)를 iframe에 넣어도 막히지 않도록 임베드용 주소로 변환
function toEmbedSrc(href: string): string {
  try {
    const u = new URL(href, typeof window !== "undefined" ? window.location.origin : "https://x");
    const host = u.hostname;
    // 구글 드라이브 파일: /file/d/ID/view → /file/d/ID/preview
    if (host.includes("drive.google.com")) {
      const m = u.pathname.match(/\/file\/d\/([^/]+)/);
      if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
      const id = u.searchParams.get("id");
      if (id) return `https://drive.google.com/file/d/${id}/preview`;
    }
    // 구글 문서/슬라이드/시트: /edit → /preview (임베드 허용)
    if (host.includes("docs.google.com")) {
      return href.replace(/\/edit.*$/, "/preview").replace(/\/pub(\?|$)/, "/embed$1");
    }
    return href;
  } catch {
    return href;
  }
}

export default function Home() {
  const [modalType, setModalType] = useState<ApplicationType | null>(null);
  // 사이드바 첨부파일을 크기조절·이동 가능한 작은 창으로 미리보기
  const [fileWin, setFileWin] = useState<{ title: string; href: string; openHref: string; isImage: boolean } | null>(null);
  const [site, setSite] = useState<SiteConfig>(DEFAULT_SITE_CONFIG);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => { fetchSiteConfig().then(setSite); }, []);
  useEffect(() => { fetch("/api/admin/status").then((r) => r.json()).then((d) => setIsAdmin(!!d.admin)).catch(() => {}); }, []);

  // 신청 가능 분야 동적 계산 — 현재 신청 가능한(활성 기간 내) 프로그램/유형만 표시.
  // 관리자가 프로그램을 추가·삭제하면 다음 방문 시 자동 반영된다.
  const [programs, setPrograms] = useState<Program[]>([]);
  useEffect(() => { fetchPrograms().then(setPrograms).catch(() => {}); }, []);
  // 성과형(성적·경진대회·자격증) 학기별 신청기한
  const [typePeriods, setTypePeriods] = useState<TypePeriods>({});
  useEffect(() => { fetchTypePeriods().then(setTypePeriods).catch(() => {}); }, []);
  // 유형별 안내: 프로그램 기반(근로·참여지원비·진행요원비)은 활성 프로그램명, 그 외(성적·경진·자격증)는 설명
  const typeInfo = (type: ApplicationType, mode: ApplyPhase): string => {
    if (type === "labor" || type === "program" || type === "staff") {
      const names = filterActiveByType(programs, type, categoryOfType(type), undefined, mode).map((p) => p.name);
      return names.length ? names.join(" · ") : "현재 모집(신청 가능) 중인 프로그램이 없습니다 — 모집 시기는 공지를 확인하세요";
    }
    // 성과형: 신청기한 표시 (미설정이면 상시)
    if ((PERIOD_TYPES as readonly string[]).includes(type)) {
      const lbl = periodLabel(typePeriods[type]);
      return lbl ? `신청기간 ${lbl}${isTypeOpen(typePeriods[type]) ? "" : " (현재 신청 불가)"}` : "상시 신청 가능";
    }
    return typeMeta[type].note || typeMeta[type].desc;
  };

  // 홈 팝업 공지 (여러 개·기간·닫기 옵션)
  type Popup = { id: string; enabled: boolean; title: string; content: string; startDate?: string; endDate?: string };
  const [popupQueue, setPopupQueue] = useState<Popup[]>([]);
  useEffect(() => {
    fetch("/api/popup", { cache: "no-store" }).then((r) => r.json()).then((d) => {
      const today = new Date().toISOString().slice(0, 10);
      const list: Popup[] = Array.isArray(d?.popups) ? d.popups : [];
      const active = list.filter((p) => {
        if (!p.enabled || !(p.title || p.content)) return false;
        if (p.startDate && today < p.startDate) return false;
        if (p.endDate && today > p.endDate) return false;
        let dismiss = "";
        try { dismiss = localStorage.getItem(`popupDismiss:${p.id}`) || ""; } catch { /* noop */ }
        if (dismiss === "never" || dismiss === today) return false;
        return true;
      });
      setPopupQueue(active);
    }).catch(() => {});
  }, []);
  const closePopup = (id: string, mode: "close" | "today" | "never") => {
    if (mode !== "close") {
      try {
        const v = mode === "never" ? "never" : new Date().toISOString().slice(0, 10);
        localStorage.setItem(`popupDismiss:${id}`, v);
      } catch { /* noop */ }
    }
    setPopupQueue((q) => q.filter((p) => p.id !== id));
  };
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setLoggedIn(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setLoggedIn(!!session?.user));
    return () => sub.subscription.unsubscribe();
  }, []);
  const doLogout = async () => { await logout(); setLoggedIn(false); };
  const adminLogout = async () => { try { await fetch("/api/admin/logout", { method: "POST" }); } catch {} setIsAdmin(false); };

  // 엔드바 이메일 복사
  const [copiedEmail, setCopiedEmail] = useState<string>("");
  const copyEmail = async (email: string) => {
    try { await navigator.clipboard.writeText(email); }
    catch {
      const ta = document.createElement("textarea");
      ta.value = email; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch {}
      document.body.removeChild(ta);
    }
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(""), 1800);
  };

  return (
    <div className="min-h-screen">
      {/* 팝업 공지 (한 번에 하나씩 표시) */}
      {popupQueue.length > 0 && (() => {
        const popup = popupQueue[0];
        return (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="modal-backdrop absolute inset-0" onClick={() => closePopup(popup.id, "close")} />
            <div className="modal relative w-full max-w-md p-6">
              <button onClick={() => closePopup(popup.id, "close")} className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
              {popupQueue.length > 1 && <span className="text-[11px] text-gray-400">공지 1 / {popupQueue.length}</span>}
              {popup.title && <h2 className="text-lg font-bold holo-text mb-3 pr-6">{popup.title}</h2>}
              <p className="text-sm text-gray-700 whitespace-pre-line">{popup.content}</p>
              <button onClick={() => closePopup(popup.id, "close")} className="btn-primary w-full mt-5">확인</button>
              <div className="flex items-center justify-between mt-3 text-xs">
                <button onClick={() => closePopup(popup.id, "today")} className="text-gray-500 hover:text-gray-700 underline">오늘 하루만 보기</button>
                <button onClick={() => closePopup(popup.id, "never")} className="text-gray-500 hover:text-gray-700 underline">다시 보지 않기</button>
                <button onClick={() => closePopup(popup.id, "close")} className="text-gray-500 hover:text-gray-700 underline">닫기</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 헤더 (상단바) */}
      <header className="glass-header sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 flex items-center justify-center shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/sdu-shield.png" alt="SDU 사업단 로고" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-gray-500 hidden sm:block">강원대학교 데이터보안·활용 혁신융합대학사업단</div>
              <div className="font-bold text-sm sm:text-lg leading-tight holo-text truncate">학생 지원금 신청 플랫폼</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <Link href="/admin/applications" className="glass-pill px-4 h-10 flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
                  <Shield className="w-4 h-4" /> 관리자 페이지
                </Link>
                <button onClick={adminLogout} className="glass-pill px-4 h-10 flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-red-500 transition-colors">
                  <LogOut className="w-4 h-4" /> 로그아웃
                </button>
              </>
            )}
            {loggedIn ? (
              <>
                <Link href="/mypage" className="glass-pill px-4 h-10 flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
                  <User className="w-4 h-4" /> 마이페이지
                </Link>
                <button onClick={doLogout} className="glass-pill px-4 h-10 flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-red-500 transition-colors">
                  <LogOut className="w-4 h-4" /> 로그아웃
                </button>
              </>
            ) : !isAdmin ? (
              <>
                <Link href="/login" className="glass-pill px-4 h-10 flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors">
                  <User className="w-4 h-4" /> 로그인
                </Link>
                <Link href="/" className="glass-pill px-4 h-10 flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors">
                  <HomeIcon className="w-4 h-4" /> 홈
                </Link>
              </>
            ) : null}
          </div>
        </div>
      </header>

      {/* 히어로 */}
      <section className="py-20 px-4 relative overflow-hidden">
        <HeroClouds />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="bubble-text text-5xl sm:text-7xl lg:text-8xl mb-5 holo-text leading-tight tracking-tight">학생 지원금 신청 플랫폼</h1>
          <p className="text-gray-600 text-lg mb-2">
            강원대학교 데이터보안·활용 혁신융합대학사업단이 우수 학생의 성장을 지원합니다.
          </p>
          <p className="text-sm text-gray-500">신청 전 지급 기준을 반드시 확인해주세요.</p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 pb-28 space-y-12">
        {/* 본문 상단 신청 카드 — 지원신청 / 지원금 신청 각각 유형별 개별 카드 */}
        <section className="space-y-6">
          {/* 1행: 지원신청 (활동 전) */}
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-1 flex items-center gap-2">
              <span className="text-xl">📝</span> 지원신청
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-3">
              {PICK_TYPES_PRE.map((t) => (
                <div key={t} className="card flex flex-col">
                  <div className="text-3xl mb-3">{typeMeta[t].icon}</div>
                  <h3 className="font-bold text-lg text-gray-800 mb-2">{APPLICATION_TYPE_LABELS[t]}</h3>
                  <div className="mb-5 flex-1">
                    <p className="text-sm text-gray-600">신청 가능 분야: {typeInfo(t, "pre")}</p>
                  </div>
                  <Link href={`/apply?type=${t}&mode=pre`} className="btn-secondary w-full justify-center">
                    지원하기 <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* 2행: 지원금 신청 (활동 후) */}
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-1 flex items-center gap-2">
              <span className="text-xl">💸</span> 지원금 신청
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-3">
              {PICK_TYPES_FUND.map((t) => (
                <div key={t} className="card flex flex-col">
                  <div className="text-3xl mb-3">{typeMeta[t].icon}</div>
                  <h3 className="font-bold text-lg text-gray-800 mb-2">{APPLICATION_TYPE_LABELS[t]}</h3>
                  <div className="mb-5 flex-1 space-y-2">
                    {(t === "labor" || t === "program" || t === "staff") ? (
                      <p className="text-sm text-gray-600">신청 가능 분야: {typeInfo(t, "fund")}</p>
                    ) : (
                      <p className="text-sm text-gray-600">{typeMeta[t].note || typeMeta[t].desc}</p>
                    )}
                    {/* 성과형(성적·경진대회·자격증) 학기별 신청기한 — 관리자 설정값 실시간 반영 */}
                    {(PERIOD_TYPES as readonly string[]).includes(t) && (
                      periodLabel(typePeriods[t]) ? (
                        <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${isTypeOpen(typePeriods[t]) ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                          🗓️ 신청기간 {periodLabel(typePeriods[t])}{isTypeOpen(typePeriods[t]) ? " · 신청 가능" : " · 신청 불가"}
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">🗓️ 상시 신청 가능</div>
                      )
                    )}
                  </div>
                  <Link href={`/apply?type=${t}`} className="btn-primary w-full justify-center">
                    지원금 신청하기 <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* 3행: 공간대여 신청 (지원금과 별개) */}
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-1 flex items-center gap-2">
              <span className="text-xl">🏫</span> 공간대여 신청
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-3">
              <div className="card flex flex-col">
                <div className="text-3xl mb-3">🏫</div>
                <h3 className="font-bold text-lg text-gray-800 mb-2">공간대여 신청</h3>
                <div className="mb-5 flex-1">
                  <p className="text-sm text-gray-600">세미나실·실습실 등 사업단 공간을 대여 신청합니다. 이미 예약된 장소·시간은 신청할 수 없습니다.</p>
                </div>
                <Link href="/space-rental" className="btn-primary w-full justify-center">
                  공간대여 신청하기 <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

          <p className="text-base sm:text-lg font-semibold text-red-600">
            신청 가능한 프로그램은 아래 ‘유형별 지급 기준 세부내용’을 확인해주세요.
          </p>
        </section>

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

        {/* 지원금 유형 안내 (클릭 시 세부내용 모달) */}
        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-1 flex items-center gap-2">
            <Award className="w-6 h-6 text-indigo-500" /> 유형별 지급 기준
          </h2>
          <p className="text-sm text-gray-500 mb-6">유형을 클릭하면 자세한 내용과 신청 가능한 프로그램을 볼 수 있습니다.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ALL_TYPES.map((type) => {
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

        {/* 자격증 목록 (독립 섹션) */}
        <CertList />

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
      </div>

      {/* 푸터 (엔드바) */}
      <footer className="glass-header py-8 pb-32 sm:pb-8 mt-24 relative">
        <FooterWalkers />
        <div className="max-w-6xl mx-auto px-4 text-sm">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            {/* 좌측: 기관 정보 (왼쪽 정렬) */}
            <div className="text-left">
              <p className="font-bold holo-text mb-3">{site.footer.organization}</p>
              <div className="flex flex-col items-start gap-2 text-gray-500">
                {site.footer.items.map((it) => {
                  const Icon = FOOTER_ICONS[it.iconName] || Globe;
                  if (it.type === "email") {
                    return (
                      <button key={it.id} type="button" onClick={() => copyEmail(it.value)} title="클릭하면 복사됩니다"
                        className="flex items-center gap-1.5 hover:text-[#4f8cff] transition-colors">
                        {copiedEmail === it.value ? (<><CheckCircle className="w-4 h-4 text-green-500" /> <span className="text-green-600">복사됨!</span></>)
                          : (<><Icon className="w-4 h-4" /> {it.label}</>)}
                      </button>
                    );
                  }
                  const href = it.type === "phone" ? `tel:${it.value}`
                    : it.type === "address" ? `https://map.naver.com/p/search/${encodeURIComponent(it.value)}`
                    : it.value;
                  const external = it.type !== "phone";
                  return (
                    <a key={it.id} href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      className="flex items-center gap-1.5 hover:text-[#4f8cff] transition-colors">
                      <Icon className="w-4 h-4" /> {it.label}
                    </a>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <Link href="/privacy" className="text-xs text-gray-500 hover:text-indigo-500 font-medium">개인정보 처리방침</Link>
                <span className="text-gray-300">|</span>
                <Link href="/admin/login" className="text-xs text-gray-400 hover:text-indigo-500">관리자 로그인</Link>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {site.footer.version ?? DEFAULT_SITE_CONFIG.footer.version} · 최종 업데이트: {site.footer.updateDate ?? DEFAULT_SITE_CONFIG.footer.updateDate}
              </p>
            </div>

            {/* 우측: 사업단 가로형 로고 (오른쪽 정렬) */}
            <div className="flex sm:justify-end shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/sdu-wordmark.png" alt="SDU 데이터보안활용 혁신융합대학 사업단" className="w-full max-w-[360px] h-auto object-contain" />
            </div>
          </div>
        </div>
      </footer>

      {/* 바로가기 플로팅 바 — 데스크톱: 우측 세로 / 모바일: 하단 가로 */}
      <aside className="fixed z-50 flex gap-2.5
        bottom-3 left-1/2 -translate-x-1/2 flex-row
        sm:bottom-auto sm:left-auto sm:translate-x-0 sm:right-5 sm:top-1/2 sm:-translate-y-1/2 sm:flex-col sm:gap-3">
        {site.sidebarLinks.map((item) => {
          const Icon = SIDEBAR_ICONS[item.iconName] || Globe;
          if (item.isKakao) {
            return (
              <a key={item.id} href={item.href} target="_blank" rel="noopener noreferrer" title={item.label.replace("\n", " ")}
                className="w-[72px] h-[72px] flex flex-col items-center justify-center gap-1 rounded-3xl font-bold text-[#3c1e1e] hover:scale-105 transition-transform"
                style={{ background: item.color || "#FEE500", boxShadow: "0 12px 28px rgba(0,0,0,0.18)" }}>
                <Icon className="w-7 h-7" />
                <span className="text-[10px] leading-tight text-center whitespace-pre-line">{item.label}</span>
              </a>
            );
          }
          // 업로드 파일 또는 '작은 창으로 보기' 설정 항목은 새 탭 대신 이동·크기조절 가능한 작은 창으로 미리보기
          const href = item.href || "";
          const isFile = !!item.fileName || href.includes("/api/site-file") || /\.(pdf|png|jpe?g|webp|gif)(\?|#|$)/i.test(href);
          const isEmbeddable = /drive\.google\.com|docs\.google\.com/i.test(href); // 구글 드라이브·문서는 임베드 가능 → 자동으로 작은 창
          if (isFile || item.inWindow || isEmbeddable) {
            const isImage = /\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(item.fileName || href);
            return (
              <button key={item.id} type="button" title={item.label.replace("\n", " ")}
                onClick={() => setFileWin({ title: (item.fileName || item.label).replace("\n", " "), href: isImage ? item.href : toEmbedSrc(item.href), openHref: item.href, isImage })}
                className="glass-pill w-[72px] h-[72px] flex flex-col items-center justify-center gap-1 hover:scale-105 transition-transform">
                <Icon className="w-7 h-7" style={{ color: item.color }} />
                <span className="text-[10px] font-semibold text-gray-700 leading-tight text-center whitespace-pre-line">{item.label}</span>
              </button>
            );
          }
          return (
            <a key={item.id} href={item.href} target="_blank" rel="noopener noreferrer" title={item.label.replace("\n", " ")}
              className="glass-pill w-[72px] h-[72px] flex flex-col items-center justify-center gap-1 hover:scale-105 transition-transform">
              <Icon className="w-7 h-7" style={{ color: item.color }} />
              <span className="text-[10px] font-semibold text-gray-700 leading-tight text-center whitespace-pre-line">{item.label}</span>
            </a>
          );
        })}
      </aside>

      {fileWin && (
        <DraggableWindow title={fileWin.title} onClose={() => setFileWin(null)} initial={{ x: 120, y: 90, w: 560, h: 640 }}>
          {fileWin.isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fileWin.href} alt={fileWin.title} className="max-w-full max-h-full object-contain" />
          ) : (
            <iframe src={fileWin.href} title={fileWin.title} className="w-full h-full bg-white" style={{ border: "none" }} />
          )}
          <a href={fileWin.openHref} target="_blank" rel="noopener noreferrer" className="absolute bottom-2 right-3 text-[11px] text-indigo-600 underline bg-white/80 rounded px-1.5 py-0.5">새 탭에서 열기 ↗</a>
        </DraggableWindow>
      )}

      <FundTypeModal type={modalType} onClose={() => setModalType(null)} />
    </div>
  );
}

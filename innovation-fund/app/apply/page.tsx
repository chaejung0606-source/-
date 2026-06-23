"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shield, ArrowLeft, LogOut, Home as HomeIcon } from "lucide-react";
import type { ApplicationType, FundCategory, ApplicationPhase } from "@/types";
import { APPLICATION_TYPE_LABELS, FUND_CATEGORY_LABELS, CATEGORY_TYPES, APPLICATION_PHASE_LABELS, PRE_CATEGORY_TYPE } from "@/types";
import { currentUser, logout } from "@/lib/auth";
import ApplyForm from "@/components/apply/ApplyForm";

const typeDescriptions: Record<ApplicationType, string> = {
  program: "사업단 승인 교과·비교과, 현장실습, 인턴십, 학회 참석 등에 참여하는 학생",
  staff: "사업단 프로그램 운영 보조 업무를 수행하는 진행요원",
  grade: "마이크로디그리, 부전공, 복수전공 이수 우수 학생 (평점 3.0 이상)",
  contest: "사업단 분야와 관련된 경진대회에서 입상한 학생",
  certificate: "미래융합가상학과 학생 중 자격증을 취득한 학생",
  labor: "사업단 프로그램에 근로학생으로 참여 (근무상황부 기준 지급)",
  activity: "학생 자치·동아리 활동, 학술 행사·학회 참가 등 지원",
};

const typeIcons: Record<ApplicationType, string> = {
  program: "📋", staff: "👥", grade: "🎓", contest: "🏆", certificate: "📜", labor: "🛠️", activity: "🎒",
};

const categoryIcons: Record<FundCategory, string> = { labor: "🛠️", innovation: "🚀", activity: "🎒" };
const categoryDesc: Record<FundCategory, string> = {
  labor: "근무상황부 기준 근로장학금 신청",
  innovation: "프로그램·진행요원·성적·경진대회·자격증 등 5개 유형",
  activity: "학생 자치·동아리·학술 행사 등 학생 활동 지원",
};
const CATEGORY_ORDER: FundCategory[] = ["labor", "innovation", "activity"];

function ApplyInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [ready, setReady] = useState(false);
  const [userName, setUserName] = useState("");
  const mode: ApplicationPhase = params.get("mode") === "pre" ? "pre" : "fund";
  const initCategory = (() => { const c = params.get("category"); return c && (c in CATEGORY_TYPES) ? (c as FundCategory) : null; })();
  const initType = (() => { const t = params.get("type"); return t && (t in APPLICATION_TYPE_LABELS) ? (t as ApplicationType) : null; })();
  const [category, setCategory] = useState<FundCategory | null>(initCategory);
  const [selectedType, setSelectedType] = useState<ApplicationType | null>(initType);

  // 로그인 게이트
  useEffect(() => {
    (async () => {
      const u = await currentUser();
      if (!u) { router.replace("/login?next=/apply"); return; }
      setUserName(u.name);
      setReady(true);
    })();
  }, [router]);

  // 단일 유형 카테고리는 바로 폼으로 / 지원신청(pre)은 카테고리별 참여 유형으로 직행
  useEffect(() => {
    if (!category) return;
    if (mode === "pre") setSelectedType(PRE_CATEGORY_TYPE[category]);
    else if (CATEGORY_TYPES[category].length === 1) setSelectedType(CATEGORY_TYPES[category][0]);
  }, [category, mode]);

  if (!ready) return <div className="min-h-screen flex items-center justify-center text-gray-400">확인 중...</div>;

  const doLogout = async () => { await logout(); router.replace("/login?next=/apply"); };

  return (
    <div className="min-h-screen">
      <header className="glass-header sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-indigo-500 hover:text-indigo-700"><ArrowLeft className="w-5 h-5" /></Link>
          <Shield className="w-6 h-6 text-indigo-600" />
          <span className="font-bold holo-text">{APPLICATION_PHASE_LABELS[mode]}</span>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="text-gray-500 hidden sm:inline mr-1">{userName}님</span>
            <Link href="/" className="glass-pill px-3 h-9 flex items-center gap-1.5 text-gray-700 hover:text-indigo-600"><HomeIcon className="w-4 h-4" /> 홈</Link>
            <button onClick={doLogout} className="glass-pill px-3 h-9 flex items-center gap-1.5 text-gray-700 hover:text-red-500"><LogOut className="w-4 h-4" /> 로그아웃</button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {selectedType ? (
          <ApplyForm
            applicationType={selectedType}
            mode={mode}
            onBack={() => {
              // 지원신청(pre)·단일유형은 카테고리 선택으로, 혁신인재지원금(지원금)은 유형 선택으로
              if (mode === "fund" && category && CATEGORY_TYPES[category].length > 1) setSelectedType(null);
              else { setSelectedType(null); setCategory(null); }
            }}
          />
        ) : !category ? (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-extrabold holo-text mb-2">{APPLICATION_PHASE_LABELS[mode]} — 종류 선택</h1>
              <p className="text-gray-600">{mode === "pre" ? "활동 시작 전 참여를 신청할 종류를 선택해주세요." : "신청할 지원금 종류를 선택해주세요."}</p>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {CATEGORY_ORDER.map((c) => (
                <button key={c} onClick={() => setCategory(c)} className="card text-left hover:-translate-y-1 transition-transform duration-300 cursor-pointer">
                  <div className="text-3xl mb-2">{categoryIcons[c]}</div>
                  <h3 className="font-bold text-gray-800 mb-1">{FUND_CATEGORY_LABELS[c]}</h3>
                  <p className="text-sm text-gray-500">{categoryDesc[c]}</p>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <button onClick={() => setCategory(null)} className="inline-flex items-center gap-1.5 text-sm text-indigo-500 hover:text-indigo-700 mb-4"><ArrowLeft className="w-4 h-4" /> 종류 다시 선택</button>
            <div className="mb-6">
              <h1 className="text-2xl font-extrabold holo-text mb-1">{FUND_CATEGORY_LABELS[category]} — 신청 유형 선택</h1>
              <p className="text-gray-600">해당하는 유형을 선택해주세요.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {CATEGORY_TYPES[category].map((type) => (
                <button key={type} onClick={() => setSelectedType(type)} className="card text-left hover:-translate-y-1 transition-transform duration-300 cursor-pointer">
                  <div className="text-2xl mb-2">{typeIcons[type]}</div>
                  <h3 className="font-bold text-gray-800 mb-1">{APPLICATION_TYPE_LABELS[type]}</h3>
                  <p className="text-sm text-gray-500">{typeDescriptions[type]}</p>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ApplyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">로딩 중...</div>}>
      <ApplyInner />
    </Suspense>
  );
}

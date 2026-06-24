"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shield, ArrowLeft, LogOut, Home as HomeIcon, FileText, ChevronRight, Plus, User } from "lucide-react";
import type { ApplicationType, FundCategory, ApplicationPhase, Application } from "@/types";
import { APPLICATION_TYPE_LABELS, FUND_CATEGORY_LABELS, CATEGORY_TYPES, APPLICATION_PHASE_LABELS, PRE_CATEGORY_TYPE, categoryOfType } from "@/types";
import { currentUser, logout } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { fromRow } from "@/lib/app-mapper";
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
const CATEGORY_ORDER: FundCategory[] = ["labor", "innovation"];

function ApplyInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [ready, setReady] = useState(false);
  const [userName, setUserName] = useState("");
  const mode: ApplicationPhase = params.get("mode") === "pre" ? "pre" : "fund";
  const fromId = params.get("from");
  const draftId = params.get("draft");
  const initCategory = (() => { const c = params.get("category"); return c && (c in CATEGORY_TYPES) ? (c as FundCategory) : null; })();
  const initType = (() => { const t = params.get("type"); return t && (t in APPLICATION_TYPE_LABELS) ? (t as ApplicationType) : null; })();
  const [category, setCategory] = useState<FundCategory | null>(initCategory);
  const [selectedType, setSelectedType] = useState<ApplicationType | null>(initType);

  // 지원신청 → 지원금 신청 연계 (중복 항목 자동입력)
  const [prefill, setPrefill] = useState<Application | null>(null);
  const [preApps, setPreApps] = useState<Application[]>([]);
  const [preChecked, setPreChecked] = useState(false);
  const [skipPre, setSkipPre] = useState(false);

  // 지원금 신청 차단(지원신청 승인 필요) 안내
  const [blocked, setBlocked] = useState(false);
  const requiresPre = (t: ApplicationType) => (["labor", "program", "activity"] as ApplicationType[]).includes(t);
  const BLOCK_MSG = "지원금 신청 불가\n\n사유: 먼저 ‘지원신청’을 하고 관리자 승인을 받아야 이 지원금을 신청할 수 있습니다.\n승인된 지원신청 내역이 없습니다.";
  useEffect(() => { setBlocked(false); }, [category, mode]);
  useEffect(() => { if (blocked) window.alert(BLOCK_MSG); }, [blocked]);

  // 임시저장 이어쓰기
  const [draftApp, setDraftApp] = useState<Application | null>(null);
  useEffect(() => {
    if (!draftId) return;
    (async () => {
      const { data } = await supabase.from("applications").select("*").eq("id", draftId).maybeSingle();
      if (data) {
        const app = fromRow(data);
        setDraftApp(app);
        setCategory(categoryOfType(app.applicationType));
        setSelectedType(app.applicationType);
        setPreChecked(true);
      }
    })();
  }, [draftId]);

  // 로그인 게이트 (신청자 로그인 / 관리자는 화면 확인용으로 접근)
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    (async () => {
      const u = await currentUser();
      if (u) { setUserName(u.name); setReady(true); return; }
      const status = await fetch("/api/admin/status").then((r) => r.json()).catch(() => ({ admin: false }));
      if (status.admin) { setIsAdmin(true); setUserName("관리자"); setReady(true); return; }
      router.replace("/login?next=/apply");
    })();
  }, [router]);

  // 마이페이지의 "지원금 신청" 버튼 등에서 특정 지원신청 내역으로 진입
  useEffect(() => {
    if (!fromId) return;
    (async () => {
      const { data } = await supabase.from("applications").select("*").eq("id", fromId).maybeSingle();
      if (data) {
        const app = fromRow(data);
        // 지원신청(pre) 건은 관리자 승인된 경우에만 지원금 신청 가능
        if (app.applicationPhase === "pre" && app.reviewStatus !== "approved") {
          alert(app.reviewStatus === "rejected"
            ? `지원금 신청 불가\n\n사유: ${app.adminMemo || "지원신청이 반려되었습니다. 자세한 사항은 사업단에 문의해주세요."}`
            : "아직 지원신청이 승인되지 않았습니다. 관리자 승인 후 지원금 신청이 가능합니다.");
          router.replace("/mypage");
          return;
        }
        setPrefill(app);
        setCategory(categoryOfType(app.applicationType));
        setSelectedType(app.applicationType);
        setPreChecked(true);
      }
    })();
  }, [fromId]);

  // 지원금 신청 + 분야 선택 시, 해당 분야의 지원신청 내역 조회
  useEffect(() => {
    if (mode !== "fund" || !category || fromId || draftId) return;
    setPreChecked(false);
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setPreChecked(true); return; }
      const { data } = await supabase.from("applications").select("*")
        .eq("applicant_id", user.id).eq("application_phase", "pre")
        .order("created_at", { ascending: false });
      // 관리자가 승인한 지원신청만 지원금 신청 대상으로 노출
      const apps = (data || []).map(fromRow).filter((a) => categoryOfType(a.applicationType) === category && !a.canceled && a.reviewStatus === "approved");
      setPreApps(apps);
      setPreChecked(true);
    })();
  }, [mode, category, fromId]);

  // 단일 유형 카테고리는 바로 폼으로 / 지원신청(pre)은 카테고리별 참여 유형으로 직행
  // (지원금 신청은 지원신청 내역 확인 후, 내역이 없거나 '새로 작성' 선택 시에만 진행)
  useEffect(() => {
    if (!category) return;
    if (mode === "pre") { setSelectedType(PRE_CATEGORY_TYPE[category]); return; }
    if (!preChecked) return;
    if (preApps.length > 0 && !skipPre) return;
    if (CATEGORY_TYPES[category].length === 1) {
      const only = CATEGORY_TYPES[category][0];
      // 지원신청 승인이 필요한 유형인데 승인 내역이 없으면 차단
      if (requiresPre(only) && preApps.length === 0) { setBlocked(true); return; }
      setSelectedType(only);
    }
  }, [category, mode, preChecked, preApps.length, skipPre]);

  // ?type= 로 바로 진입한 경우 카테고리 유추(지원신청 승인 확인용)
  useEffect(() => { if (selectedType && !category) setCategory(categoryOfType(selectedType)); }, [selectedType, category]);

  // 일반 가드: 지원금 신청 + 승인 필요 유형 + 승인 내역 없음 → 차단(모든 진입 경로 공통)
  useEffect(() => {
    if (mode !== "fund" || !selectedType || prefill || draftApp || !preChecked) return;
    if (requiresPre(selectedType) && preApps.length === 0) { setSelectedType(null); setBlocked(true); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedType, prefill, draftApp, preChecked, preApps.length]);

  const fmtDate = (s: string) => (s ? new Date(s).toLocaleDateString("ko-KR") : "");
  const choosePre = (app: Application) => { setPrefill(app); setSelectedType(app.applicationType); };
  // 승인 확인이 끝나기 전 폼을 잠깐 보여주지 않도록 대기 여부
  const awaitingPreCheck = mode === "fund" && !!selectedType && requiresPre(selectedType) && !prefill && !draftApp && !preChecked;
  const showPrePicker = mode === "fund" && !!category && !selectedType && preChecked && preApps.length > 0 && !skipPre;

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
            {isAdmin ? (
              <Link href="/admin" className="glass-pill px-3 h-9 flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700"><Shield className="w-4 h-4" /> 관리자 페이지</Link>
            ) : (
              <Link href="/mypage" className="glass-pill px-3 h-9 flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700"><User className="w-4 h-4" /> 마이페이지</Link>
            )}
            <Link href="/" className="glass-pill px-3 h-9 flex items-center gap-1.5 text-gray-700 hover:text-indigo-600"><HomeIcon className="w-4 h-4" /> 홈</Link>
            {!isAdmin && <button onClick={doLogout} className="glass-pill px-3 h-9 flex items-center gap-1.5 text-gray-700 hover:text-red-500"><LogOut className="w-4 h-4" /> 로그아웃</button>}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {blocked ? (
          <>
            <button onClick={() => { setBlocked(false); setCategory(null); }} className="inline-flex items-center gap-1.5 text-sm text-indigo-500 hover:text-indigo-700 mb-4"><ArrowLeft className="w-4 h-4" /> 종류 다시 선택</button>
            <div className="card text-center py-12">
              <div className="text-4xl mb-3">🔒</div>
              <h1 className="text-xl font-extrabold text-gray-800 mb-2">지원신청 승인 후 신청 가능</h1>
              <p className="text-gray-600 mb-1">이 지원금은 먼저 <strong>지원신청</strong>을 하고 관리자 <strong>승인</strong>을 받아야 신청할 수 있습니다.</p>
              <p className="text-sm text-gray-500 mb-6">승인된 지원신청 내역이 없습니다.</p>
              <div className="flex gap-2 justify-center flex-wrap">
                <button onClick={() => router.push(`/apply?mode=pre&category=${category}`)} className="btn-primary">지원신청 하러 가기</button>
                <Link href="/mypage" className="btn-secondary">마이페이지에서 확인</Link>
              </div>
            </div>
          </>
        ) : awaitingPreCheck ? (
          <div className="text-center py-20 text-gray-400">지원신청 승인 여부 확인 중...</div>
        ) : selectedType ? (
          <ApplyForm
            applicationType={selectedType}
            mode={mode}
            prefill={prefill}
            draft={draftApp}
            isAdmin={isAdmin}
            onBack={() => {
              setPrefill(null);
              // 지원신청(pre)서 작성 중 뒤로가기는 곧장 홈으로(종류 선택을 다시 거치지 않도록)
              if (mode === "pre") { router.push("/"); return; }
              // 혁신인재지원금(지원금)은 유형 선택으로, 그 외는 종류 선택으로
              if (category && CATEGORY_TYPES[category].length > 1 && skipPre) setSelectedType(null);
              else { setSelectedType(null); setCategory(null); setSkipPre(false); }
            }}
          />
        ) : showPrePicker ? (
          <>
            <button onClick={() => { setCategory(null); setSkipPre(false); }} className="inline-flex items-center gap-1.5 text-sm text-indigo-500 hover:text-indigo-700 mb-4"><ArrowLeft className="w-4 h-4" /> 분야 다시 선택</button>
            <div className="mb-6">
              <h1 className="text-2xl font-extrabold holo-text mb-1">{FUND_CATEGORY_LABELS[category!]} — 지원신청 내역에서 선택</h1>
              <p className="text-gray-600">이전에 지원신청한 내역을 선택하면 중복되는 내용이 자동으로 입력됩니다. 새로 작성할 수도 있습니다.</p>
            </div>
            <div className="space-y-3">
              {preApps.map((app) => {
                const pname = app.programDetail?.programName || app.laborDetail?.programName || app.activityDetail?.activityName || "(이름 없음)";
                return (
                  <button key={app.id} onClick={() => choosePre(app)} className="card w-full text-left hover:-translate-y-0.5 transition-transform duration-300 cursor-pointer flex items-center gap-4">
                    <div className="text-2xl shrink-0">📝</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="badge bg-indigo-100 text-indigo-700">지원신청</span>
                        <span className="font-bold text-gray-800">{APPLICATION_TYPE_LABELS[app.applicationType]}</span>
                      </div>
                      <p className="text-sm text-gray-700 mt-1 truncate">{pname}</p>
                      <p className="text-xs text-gray-400 mt-0.5">신청일 {fmtDate(app.createdAt)} · 접수번호 {app.receiptNumber || "-"}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
                  </button>
                );
              })}
              <button onClick={() => setSkipPre(true)} className="w-full btn-secondary justify-center flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> 지원신청 내역 없이 새로 작성
              </button>
            </div>
          </>
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
            <button onClick={() => { setCategory(null); setSkipPre(false); }} className="inline-flex items-center gap-1.5 text-sm text-indigo-500 hover:text-indigo-700 mb-4"><ArrowLeft className="w-4 h-4" /> 종류 다시 선택</button>
            <div className="mb-6">
              <h1 className="text-2xl font-extrabold holo-text mb-1">{FUND_CATEGORY_LABELS[category]} — 신청 유형 선택</h1>
              <p className="text-gray-600">해당하는 유형을 선택해주세요.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {CATEGORY_TYPES[category].map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    // 지원신청 승인이 필요한 유형인데 승인 내역이 없으면 차단(알림)
                    if (mode === "fund" && requiresPre(type) && preApps.length === 0) { setBlocked(true); return; }
                    setSelectedType(type);
                  }}
                  className="card text-left hover:-translate-y-1 transition-transform duration-300 cursor-pointer"
                >
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

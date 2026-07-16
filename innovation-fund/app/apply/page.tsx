"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shield, ArrowLeft, LogOut, Home as HomeIcon, FileText, ChevronRight, Plus, User } from "lucide-react";
import type { ApplicationType, FundCategory, ApplicationPhase, Application } from "@/types";
import { APPLICATION_TYPE_LABELS, FUND_CATEGORY_LABELS, CATEGORY_TYPES, APPLICATION_PHASE_LABELS, PRE_CATEGORY_TYPE, categoryOfType, PICK_TYPES_FUND, PICK_TYPES_PRE } from "@/types";
import { currentUser, logout } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { fromRow } from "@/lib/app-mapper";
import ApplyForm from "@/components/apply/ApplyForm";
import SchemaApplyForm from "@/components/apply/SchemaApplyForm";
import { fetchPrograms, isProgramActive, programMatchesType, audienceOf, type Program } from "@/lib/programs";
import type { FormSchema } from "@/lib/form-schema";

const typeDescriptions: Record<ApplicationType, string> = {
  program: "사업단 승인 교과·비교과, 현장실습, 인턴십, 학회 참석 등에 참여하는 학생",
  staff: "사업단 프로그램 운영 보조 업무를 수행하는 진행요원",
  grade: "마이크로디그리, 부전공, 복수전공 이수 우수 학생 (평점 3.0 이상)",
  contest: "사업단 분야와 관련된 경진대회에서 입상한 학생",
  certificate: "미래융합가상학과 학생 중 자격증을 취득한 학생",
  labor: "사업단 프로그램에 근로학생으로 참여 (근무상황부 기준 지급)",
  activity: "학생 자치·동아리 활동, 학술 행사·학회 참가 등 지원",
  club: "첨단 ICT 분야(보안·클라우드·블록체인 등) 소학회(동아리) 활동 지원",
};

const typeIcons: Record<ApplicationType, string> = {
  program: "📋", staff: "👥", grade: "🎓", contest: "🏆", certificate: "📜", labor: "🛠️", activity: "🎒", club: "🧑‍💻",
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
  // 소학회 등 직접 진입(?type=club) 시 카테고리 자동 설정 — 관리자 폼(스키마) 매칭에 사용
  const [category, setCategory] = useState<FundCategory | null>(initCategory ?? (initType === "club" ? "activity" : null));
  const [selectedType, setSelectedType] = useState<ApplicationType | null>(initType);

  // 관리자 폼 빌더(스키마) 연동: 프로그램별 신청 폼이 설정돼 있으면 그 폼으로 신청
  const [programs, setPrograms] = useState<Program[]>([]);
  const [programForms, setProgramForms] = useState<Record<string, { pre?: FormSchema; fund?: FormSchema }>>({});
  const [schemaProgramId, setSchemaProgramId] = useState<string | null>(null);
  useEffect(() => {
    fetchPrograms().then(setPrograms).catch(() => {});
    fetch("/api/admin/program-forms").then((r) => r.json()).then((d) => setProgramForms(d || {})).catch(() => {});
  }, []);
  // 스키마(관리자 폼) 기반 신청 적용 대상: 근로장학금 전체 + 혁신인재지원금의 프로그램 참여지원비(program)·진행요원비(staff)
  // (성적/경진대회/자격증은 기존 고정 양식 유지)
  const schemaTypeOk = category === "labor" || (category === "innovation" && (selectedType === "program" || selectedType === "staff")) || selectedType === "club";
  const schemaPrograms = (schemaTypeOk && category ? programs.filter((p) => p.category === category && programMatchesType(p, selectedType || "") && isProgramActive(p, undefined, mode) && (mode === "pre" ? programForms[p.id]?.pre : programForms[p.id]?.fund)) : []);
  const schemaProgram = schemaPrograms.find((p) => p.id === schemaProgramId);
  const activeSchema: FormSchema | undefined = schemaProgram ? (mode === "pre" ? programForms[schemaProgram.id]?.pre : programForms[schemaProgram.id]?.fund) : undefined;

  // 지원신청 → 지원금 신청 연계 (중복 항목 자동입력)
  const [prefill, setPrefill] = useState<Application | null>(null);
  const [preApps, setPreApps] = useState<Application[]>([]);
  const [preChecked, setPreChecked] = useState(false);
  const [skipPre, setSkipPre] = useState(false);

  // 지원금 신청 자격은 프로그램별 ‘신청대상’으로 판정한다(지원신청 승인 전제 없음).
  const requiresPre = (t: ApplicationType) => (["labor", "program", "activity"] as ApplicationType[]).includes(t);

  // 임시저장 이어쓰기
  const [draftApp, setDraftApp] = useState<Application | null>(null);
  useEffect(() => {
    if (!draftId) return;
    (async () => {
      const { data } = await supabase.from("applications").select("*").eq("id", draftId).maybeSingle();
      if (data) {
        const app = fromRow(data);
        // 취소(삭제)된 임시저장은 이어서 작성 불가 — 잘못된/오래된 링크 방어
        if (app.canceled) { alert("취소되어 더 이상 이어서 작성할 수 없는 신청입니다."); router.replace("/mypage"); return; }
        setDraftApp(app);
        setCategory(categoryOfType(app.applicationType));
        setSelectedType(app.applicationType);
        setPreChecked(true);
      }
    })();
  }, [draftId]);

  // 스키마(관리자 폼) 기반 임시저장이면 해당 프로그램 폼으로 이어서 작성
  useEffect(() => {
    if (!draftApp) return;
    const pid = (draftApp.programDetail as { programId?: string } | undefined)?.programId;
    if (!pid) return;
    const hasSchema = draftApp.applicationPhase === "pre" ? programForms[pid]?.pre : programForms[pid]?.fund;
    if (hasSchema) setSchemaProgramId(pid);
  }, [draftApp, programForms]);

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

  // 관리자 대리 신청: ?adminFor=<신청자uid> → 그 학생 정보로 프로그램 참여지원비 신청 작성
  const adminFor = params.get("adminFor");
  const [adminUser, setAdminUser] = useState<{ studentId: string; name: string; campus?: string; department: string; phone: string; email: string; university?: string; bankName?: string; accountNumber?: string; accountHolder?: string } | null>(null);
  useEffect(() => {
    if (!adminFor || !isAdmin) return;
    setCategory("innovation"); setSelectedType("program"); setPreChecked(true);
    fetch(`/api/admin/student-profile?id=${encodeURIComponent(adminFor)}`)
      .then((r) => r.json())
      .then((d) => { if (d.profile) setAdminUser(d.profile); else { alert("대상 신청자 정보를 불러오지 못했습니다."); router.replace("/admin/applicants"); } })
      .catch(() => {});
  }, [adminFor, isAdmin, router]);

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
    // 지원신청(pre): 유형을 직접 고른 경우(예: 진행요원비) 그 유형을 유지, 미지정 시에만 카테고리 기본 유형으로
    if (mode === "pre") { if (!selectedType) setSelectedType(PRE_CATEGORY_TYPE[category]); return; }
    // 임시저장 이어쓰기·지원신청 연계 진입은 이미 자격이 확정된 건이므로 차단 판정 생략
    if (draftApp || prefill) return;
    if (!preChecked) return;
    if (preApps.length > 0 && !skipPre) return;
    if (CATEGORY_TYPES[category].length === 1) {
      const only = CATEGORY_TYPES[category][0];
      // 신청 자격은 프로그램별 ‘신청대상’으로 판정한다(지원신청 승인 전제 제거).
      setSelectedType(only);
    }
  }, [category, mode, selectedType, preChecked, preApps.length, skipPre, isAdmin, draftApp, prefill]);

  // ?type= 로 바로 진입한 경우 카테고리 유추
  useEffect(() => { if (selectedType && !category) setCategory(categoryOfType(selectedType)); }, [selectedType, category]);

  const fmtDate = (s: string) => (s ? new Date(s).toLocaleDateString("ko-KR") : "");
  const choosePre = (app: Application) => { setPrefill(app); setSelectedType(app.applicationType); };
  // 승인 확인이 끝나기 전 폼을 잠깐 보여주지 않도록 대기 여부
  const awaitingPreCheck = mode === "fund" && !!selectedType && requiresPre(selectedType) && !prefill && !draftApp && !preChecked;
  const showPrePicker = mode === "fund" && !!category && !selectedType && preChecked && preApps.length > 0 && !skipPre;

  // 상단바 메뉴(섹션 페이지)에서 ?type=로 바로 진입한 경우: '이전'은 종류 선택 그리드가 아니라
  // 원래의 섹션 페이지(지원신청/지원금신청/소학회)로 돌아가도록 한다.
  const cameFromSection = !!initType && !fromId && !draftId && !adminFor;
  const sectionRoute = `/menu/${initType === "club" ? "club" : mode === "pre" ? "pre" : "fund"}`;

  if (!ready) return <div className="min-h-screen flex items-center justify-center text-gray-400">확인 중...</div>;

  const doLogout = async () => { await logout(); router.replace("/login?next=/apply"); };

  return (
    <div className="min-h-screen">
      <header className="glass-header sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-indigo-500 hover:text-indigo-700"><ArrowLeft className="w-5 h-5" /></Link>
          <div className="w-9 h-9 flex items-center justify-center shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/sdu-shield.png" alt="SDU 사업단 로고" className="w-full h-full object-contain" />
          </div>
          <span className="font-bold holo-text">{APPLICATION_PHASE_LABELS[mode]}</span>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="text-gray-500 hidden sm:inline mr-1">{userName}님</span>
            {isAdmin ? (
              <Link href="/admin/applications" className="glass-pill px-3 h-9 flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700"><Shield className="w-4 h-4" /> 관리자 페이지</Link>
            ) : (
              <Link href="/mypage" className="glass-pill px-3 h-9 flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700"><User className="w-4 h-4" /> 마이페이지</Link>
            )}
            <Link href="/" className="glass-pill px-3 h-9 flex items-center gap-1.5 text-gray-700 hover:text-indigo-600"><HomeIcon className="w-4 h-4" /> 홈</Link>
            {!isAdmin && <button onClick={doLogout} className="glass-pill px-3 h-9 flex items-center gap-1.5 text-gray-700 hover:text-red-500"><LogOut className="w-4 h-4" /> 로그아웃</button>}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {awaitingPreCheck ? (
          <div className="text-center py-20 text-gray-400">신청 정보 확인 중...</div>
        ) : selectedType && activeSchema && schemaProgram ? (
          <SchemaApplyForm
            schema={activeSchema}
            isAdmin={isAdmin}
            adminApplicantId={adminFor && adminUser ? adminFor : null}
            adminUser={adminUser}
            type={selectedType}
            mode={mode}
            programId={schemaProgram.id}
            programName={schemaProgram.name}
            audience={audienceOf(schemaProgram, mode)}
            draft={draftApp}
            onBack={() => setSchemaProgramId(null)}
          />
        ) : selectedType && schemaPrograms.length > 0 && !draftApp && !prefill ? (
          <>
            <button onClick={() => { if (cameFromSection) { router.push(sectionRoute); return; } setSelectedType(null); if (CATEGORY_TYPES[category!]?.length <= 1) { setCategory(null); } }} className="inline-flex items-center gap-1.5 text-sm text-indigo-500 hover:text-indigo-700 mb-4"><ArrowLeft className="w-4 h-4" /> 이전</button>
            <div className="mb-6">
              <h1 className="text-2xl font-extrabold holo-text mb-1">{APPLICATION_TYPE_LABELS[selectedType]} — 신청 정보</h1>
              <p className="text-gray-600">신청할 프로그램을 선택하면 관리자가 설정한 해당 프로그램의 신청서 양식으로 작성합니다.</p>
            </div>
            <div className="card max-w-lg">
              <label className="label">프로그램명 <span className="text-red-500">*</span></label>
              <select className="input-field" value={schemaProgramId || ""} onChange={(e) => setSchemaProgramId(e.target.value || null)}>
                <option value="">프로그램을 선택하세요</option>
                {schemaPrograms.map((p) => (
                  <option key={p.id} value={p.id}>{p.name || "(이름 없음)"}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-2">선택한 프로그램의 신청서 양식이 아래에 표시됩니다.</p>
            </div>
          </>
        ) : selectedType ? (
          <ApplyForm
            applicationType={selectedType}
            mode={mode}
            prefill={prefill}
            draft={draftApp}
            isAdmin={isAdmin}
            adminApplicantId={adminFor && adminUser ? adminFor : null}
            adminUser={adminUser}
            onBack={() => {
              setPrefill(null);
              // 상단바 메뉴에서 바로 진입한 경우: 원래의 섹션 페이지로 복귀
              if (cameFromSection) { router.push(sectionRoute); return; }
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
        ) : !category || !selectedType ? (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-extrabold holo-text mb-2">{APPLICATION_PHASE_LABELS[mode]} — 종류 선택</h1>
              <p className="text-gray-600">{mode === "pre" ? "활동 시작 전 참여를 신청할 종류를 선택해주세요." : "신청할 지원금 종류를 선택해주세요."}</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(mode === "pre" ? PICK_TYPES_PRE : PICK_TYPES_FUND).map((t) => (
                <button
                  key={t}
                  onClick={() => { setCategory(categoryOfType(t)); setSelectedType(t); }}
                  className="card text-left hover:-translate-y-1 transition-transform duration-300 cursor-pointer"
                >
                  <div className="text-3xl mb-2">{typeIcons[t]}</div>
                  <h3 className="font-bold text-gray-800 mb-1">{APPLICATION_TYPE_LABELS[t]}</h3>
                  <p className="text-sm text-gray-500">{typeDescriptions[t]}</p>
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
                  onClick={() => { setSelectedType(type); }}
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

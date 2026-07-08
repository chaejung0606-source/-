"use client";
import { useEffect, useState } from "react";
import { Save, Plus, Trash2, CalendarClock, Check, Ban, X, ClipboardList, ClipboardCheck, MapPin, CalendarDays, FilePlus, PencilLine, FileText, Download, ChevronDown, ChevronUp, Search } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import DraggableWindow from "@/components/admin/DraggableWindow";
import SpaceCalendar from "@/components/home/SpaceCalendar";
import SchemaForm from "@/components/apply/SchemaForm";
import { type FormSchema, defaultSpaceRentalForm, emptySchema } from "@/lib/form-schema";
import { REPEAT_LABELS, expandOccurrences, type RentalSpace, type RentalRequest, type RentalStatus, type RentalFile, type RentalRepeat } from "@/lib/space-rental";

const STATUS_META: Record<RentalStatus, { label: string; badge: string }> = {
  pending: { label: "대기", badge: "bg-amber-100 text-amber-700" },
  approved: { label: "승인", badge: "bg-emerald-100 text-emerald-700" },
  supplement: { label: "보완요청", badge: "bg-orange-100 text-orange-700" },
  rejected: { label: "반려", badge: "bg-rose-100 text-rose-700" },
};

type Tab = "requests" | "results" | "spaces" | "form" | "calendar";

export default function SpaceRentalAdminPage() {
  const [tab, setTab] = useState<Tab>("requests");
  const [spaces, setSpaces] = useState<RentalSpace[]>([]);
  const [calendarId, setCalendarId] = useState("");
  const [approveWebhook, setApproveWebhook] = useState("");
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [spaceForm, setSpaceForm] = useState<FormSchema | null>(null);
  const [resultForm, setResultForm] = useState<FormSchema | null>(null);
  const [formKind, setFormKind] = useState<"apply" | "result">("apply");
  const [formSaved, setFormSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savedMsg, setSavedMsg] = useState("");

  const [applyOpen, setApplyOpen] = useState(false);
  // 제출 서류·사진 미리보기 (이동·크기조절 가능한 창)
  const [fileWin, setFileWin] = useState<{ name: string; url: string } | null>(null);
  // 검색: 접수번호·대여공간(텍스트) + 일자
  const [query, setQuery] = useState("");
  const [dateQuery, setDateQuery] = useState("");

  const load = () => {
    fetch("/api/admin/space-rental").then((r) => r.json()).then((d) => {
      setSpaces(Array.isArray(d.spaces) ? d.spaces : []);
      setCalendarId(d.calendarId || "");
      setApproveWebhook(d.approveWebhook || "");
      setRequests(Array.isArray(d.requests) ? d.requests : []);
      setSpaceForm(d.form && typeof d.form === "object" ? d.form : null);
      setResultForm(d.resultForm && typeof d.resultForm === "object" ? d.resultForm : null);
    }).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  // 공간대여 폼 저장 (신청폼 or 이용결과폼)
  const saveForm = async () => {
    const body = formKind === "apply" ? { form: spaceForm || emptySchema() } : { resultForm: resultForm || emptySchema() };
    const res = await fetch("/api/admin/space-rental", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const j = await res.json().catch(() => ({ ok: false }));
    if (j.ok) { setFormSaved(true); setTimeout(() => setFormSaved(false), 2500); }
    else alert("저장 실패: " + (j.error || res.status));
  };
  const curForm = formKind === "apply" ? spaceForm : resultForm;
  const setCurForm = (s: FormSchema) => (formKind === "apply" ? setSpaceForm(s) : setResultForm(s));

  const addSpace = () => setSpaces((s) => [...s, { id: "sp-" + Math.random().toString(36).slice(2, 9), name: "" }]);
  const setSpace = (i: number, patch: Partial<RentalSpace>) => setSpaces((s) => s.map((x, idx) => idx === i ? { ...x, ...patch } : x));
  const removeSpace = (i: number) => setSpaces((s) => s.filter((_, idx) => idx !== i));

  const [uploading, setUploading] = useState<number | null>(null);
  const uploadPhoto = async (i: number, file: File) => {
    setUploading(i);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/site-upload", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({ ok: false }));
      if (!j.ok) { alert("사진 업로드 실패: " + (j.error || res.status)); return; }
      // 여러 장 추가 — 기존 사진 배열에 append
      setSpaces((s) => s.map((x, idx) => idx === i ? { ...x, photos: [...(x.photos || []), `/api/site-file?path=${encodeURIComponent(j.path)}`] } : x));
    } finally { setUploading(null); }
  };
  const removePhoto = (i: number, pi: number) => setSpaces((s) => s.map((x, idx) => idx === i ? { ...x, photos: (x.photos || []).filter((_, k) => k !== pi) } : x));

  // 웹훅 연결 테스트 — 구글 캘린더에 [웹훅 테스트] 이벤트가 생기는지 확인
  const testWebhook = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/admin/space-rental", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "testWebhook", approveWebhook: approveWebhook.trim() }),
      });
      const j = await res.json().catch(() => ({ ok: false }));
      if (j.ok) alert("✅ 웹훅 연결 성공!\n구글 캘린더에 '[웹훅 테스트]' 이벤트(내일 10~11시)가 생성되었습니다. 확인 후 삭제하세요." + (j.eventId ? `\n(eventId: ${j.eventId})` : "") + "\n\n⚠️ 테스트는 입력칸의 URL로 실행됩니다. 승인·일정 저장에 적용하려면 반드시 [저장] 버튼을 눌러주세요.");
      else alert("❌ 웹훅 연결 실패\n\n오류: " + (j.error || `HTTP ${res.status}`) + (j.raw ? `\n\n응답: ${j.raw}` : "") + "\n\n확인: ① URL 저장 여부 ② Apps Script 최신 코드 재배포 ③ 배포 액세스 '모든 사용자' ④ 캘린더 '일정 변경' 권한");
    } finally { setTesting(false); }
  };

  const saveConfig = async () => {
    const clean = spaces.map((s) => ({ ...s, name: s.name.trim() })).filter((s) => s.name);
    const res = await fetch("/api/admin/space-rental", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spaces: clean, calendarId: calendarId.trim(), approveWebhook: approveWebhook.trim() }),
    });
    const j = await res.json().catch(() => ({ ok: false }));
    if (j.ok) { setSpaces(clean); setSavedMsg("저장되었습니다."); setTimeout(() => setSavedMsg(""), 2500); }
    else alert("저장 실패: " + (j.error || res.status));
  };

  // 상태 변경(승인 시 서버가 구글시트·캘린더 반영) + 보완요청 메모
  const updateStatus = async (id: string, status: RentalStatus, adminMemo?: string) => {
    setRequests((rs) => rs.map((r) => r.id === id ? { ...r, status, adminMemo: adminMemo ?? r.adminMemo } : r));
    const res = await fetch("/api/admin/space-rental", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status, adminMemo }),
    });
    const j = await res.json().catch(() => ({ ok: false }));
    if (status === "approved") {
      if (j.calendarReflected) alert("승인되어 구글 캘린더·시트에 반영을 요청했습니다.");
      else if (j.webhookError) alert("승인되었으나 구글 캘린더 반영에 실패했습니다.\n\n오류: " + j.webhookError + "\n\n플랫폼 캘린더에는 즉시 반영됩니다. (Apps Script 재배포·권한·웹훅 URL을 확인하세요)");
      else alert("승인되었습니다. (캘린더 자동 반영 웹훅 미설정 — 수동 등록 필요)\n플랫폼 캘린더에는 즉시 반영됩니다.");
    }
  };
  const removeRequest = async (id: string) => {
    if (!confirm("이 신청을 삭제하시겠습니까?")) return;
    setRequests((rs) => rs.filter((r) => r.id !== id));
    await fetch("/api/admin/space-rental", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }).catch(() => {});
  };

  // 대여 일정(관리자 직접 입력) 저장 → 플랫폼 캘린더 즉시, 구글 캘린더·시트는 승인·웹훅 설정 시 반영
  const saveSchedule = async (id: string, edit: Partial<Omit<RentalRequest, "repeat">> & { repeat?: RentalRepeat | null }, force = false): Promise<boolean> => {
    const res = await fetch("/api/admin/space-rental", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, edit, force }),
    });
    const j = await res.json().catch(() => ({ ok: false }));
    // 일정 겹침 → 관리자에게 알리고, 확인 시에만 강제 저장
    if (res.status === 409 && j.conflict) {
      if (confirm(`⚠️ ${j.error || "일정이 겹칩니다"}\n\n겹치는 예약: ${j.conflict}\n\n그래도 저장하시겠습니까? (같은 공간·시간에 두 예약이 공존하게 됩니다)`)) {
        return saveSchedule(id, edit, true);
      }
      return false;
    }
    if (!j.ok) { alert("저장 실패: " + (j.error || res.status)); return false; }
    setRequests((rs) => rs.map((r) => r.id === id ? { ...r, ...edit, endDate: edit.endDate || undefined, repeat: edit.repeat || undefined } as RentalRequest : r));
    if (j.calendarReflected) alert("일정이 저장되어 구글 캘린더·시트에 반영을 요청했습니다.\n플랫폼 캘린더에도 반영됩니다.");
    else if (j.webhookError) alert("일정이 저장되었으나 구글 캘린더 반영에 실패했습니다.\n\n오류: " + j.webhookError + "\n\n플랫폼 캘린더에는 반영됩니다.");
    else alert("일정이 저장되었습니다. 플랫폼 캘린더에 반영됩니다.\n(구글 캘린더 반영은 승인 및 웹훅 설정 시 동작)");
    return true;
  };


  if (loading) return <AdminLayout><div className="text-center py-20 text-gray-400">로딩 중...</div></AdminLayout>;

  // 검색 필터 (반복 회차 포함 해당 일에 대여가 있는 건)
  const matchesSearch = (r: RentalRequest) => {
    const t = query.trim().toLowerCase();
    const okText = !t || (r.receiptNo || "").toLowerCase().includes(t) || (r.spaceName || "").toLowerCase().includes(t);
    const okDate = !dateQuery || (/^\d{4}-\d{2}-\d{2}$/.test(r.date)
      && expandOccurrences(r.date, r.endDate, r.repeat).some((o) => o.date <= dateQuery && dateQuery <= (o.endDate || o.date)));
    return okText && okDate;
  };
  const visibleRequests = requests.filter(matchesSearch);

  // 이용결과 제출내역: 승인된 건 전체(제출 여부 무관) + 승인 전이라도 이미 제출된 건
  const resultRequests = requests.filter((r) => r.status === "approved" || r.usageResult);
  const visibleResults = resultRequests.filter(matchesSearch);
  const searchBar = (
    <div className="flex flex-wrap items-center gap-2 mt-3">
      <div className="relative flex-1 min-w-[220px]">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input className="input-field !min-h-[40px] !pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="접수번호·대여공간 검색 (예: SR-2026-003, 전산실)" />
      </div>
      <input type="date" className="input-field !min-h-[40px]" value={dateQuery} onChange={(e) => setDateQuery(e.target.value)} title="해당 일자에 대여가 있는 건" />
      {(query || dateQuery) && (
        <button onClick={() => { setQuery(""); setDateQuery(""); }} className="text-xs text-gray-400 hover:text-gray-600 underline">초기화</button>
      )}
    </div>
  );
  const TABS: { key: Tab; label: string; icon: typeof ClipboardList }[] = [
    { key: "requests", label: "공간대여 신청목록", icon: ClipboardList },
    { key: "results", label: "이용결과 제출내역", icon: ClipboardCheck },
    { key: "spaces", label: "대여가능공간", icon: MapPin },
    { key: "form", label: "공간대여 신청폼", icon: FileText },
    { key: "calendar", label: "공간대여 캘린더", icon: CalendarDays },
  ];

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-gray-800 mb-1 flex items-center gap-2"><CalendarClock className="w-6 h-6 text-indigo-500" /> 공간대여</h1>
      <p className="text-gray-500 text-sm mb-4">신청 관리·대여 공간 설정·예약 캘린더를 확인합니다.</p>

      {/* 섹션 탭 */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-2xl text-sm font-semibold transition flex items-center gap-1.5 ${tab === t.key ? "bg-indigo-500 text-white" : "bg-white/60 text-gray-600 hover:text-indigo-600"}`}>
              <Icon className="w-4 h-4" /> {t.label}{t.key === "requests" ? ` (${requests.length})` : t.key === "results" ? ` (${resultRequests.length})` : ""}
            </button>
          );
        })}
      </div>

      {/* ── 공간대여 신청목록 — 목록에서 바로 서류 확인·일정 입력·심사(승인/반려/보완/삭제) ── */}
      {tab === "requests" && (
        <div className="space-y-3">
          <div className="card">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-bold text-gray-800">공간대여 신청목록 <span className="text-sm text-gray-400 font-normal">({visibleRequests.length}{visibleRequests.length !== requests.length ? ` / ${requests.length}` : ""})</span></h2>
              <button onClick={() => setApplyOpen(true)} className="btn-primary text-sm flex items-center gap-1.5"><FilePlus className="w-4 h-4" /> 직접 신청</button>
            </div>
            {searchBar}
          </div>
          {visibleRequests.length === 0 ? (
            <div className="card"><p className="text-sm text-gray-400 py-3">{requests.length === 0 ? "접수된 공간대여 신청이 없습니다." : "검색 결과가 없습니다."}</p></div>
          ) : visibleRequests.map((r) => (
            <RequestCard key={r.id} r={r} spaces={spaces}
              onStatus={updateStatus} onDelete={removeRequest} onSaveSchedule={saveSchedule}
              onPreview={(f) => setFileWin(f)} />
          ))}
        </div>
      )}

      {/* ── 이용결과 제출내역 — 승인된 건 표시. 관리자 직접 등록·숨김·사진 PDF·미리보기 ── */}
      {tab === "results" && (
        <div className="space-y-3">
          <div className="card">
            <h2 className="font-bold text-gray-800">이용결과 제출내역 <span className="text-sm text-gray-400 font-normal">({visibleResults.length}{visibleResults.length !== resultRequests.length ? ` / ${resultRequests.length}` : ""})</span></h2>
            <p className="text-[11px] text-gray-400 mt-1">신청목록에서 <strong>승인된 건</strong>이 표시됩니다. 신청자가 제출하거나 관리자가 직접 등록할 수 있고, [신청자 목록 숨김]을 켜면 신청자 이용결과 제출 화면에 노출되지 않습니다.</p>
            {searchBar}
          </div>
          {visibleResults.length === 0 ? (
            <div className="card"><p className="text-sm text-gray-400 py-3">{resultRequests.length === 0 ? "승인된 공간대여 건이 없습니다." : "검색 결과가 없습니다."}</p></div>
          ) : visibleResults
            .slice()
            .sort((a, b) => (b.usageResult?.submittedAt || b.createdAt || "").localeCompare(a.usageResult?.submittedAt || a.createdAt || ""))
            .map((r) => (
              <ResultCard key={r.id} r={r} onPreview={(f) => setFileWin(f)}
                onToggleHide={async (hide) => {
                  const res = await fetch("/api/admin/space-rental", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: r.id, hideFromResults: hide }) });
                  const j = await res.json().catch(() => ({ ok: false }));
                  if (!j.ok) { alert("저장 실패: " + (j.error || res.status)); return; }
                  setRequests((rs) => rs.map((x) => x.id === r.id ? { ...x, hideFromResults: hide || undefined } : x));
                }}
                onRegistered={load}
                onDeleteFile={async (f) => {
                  const res = await fetch("/api/admin/space-rental", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: r.id, removeResultFile: f.url }) });
                  const j = await res.json().catch(() => ({ ok: false }));
                  if (!j.ok) { alert("삭제 실패: " + (j.error || res.status)); return; }
                  setRequests((rs) => rs.map((x) => x.id === r.id && x.usageResult ? { ...x, usageResult: { ...x.usageResult, files: (x.usageResult.files || []).filter((y) => y.url !== f.url) } } : x));
                }} />
            ))}
        </div>
      )}

      {/* ── 대여가능공간 ── */}
      {tab === "spaces" && (
        <div className="card">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="font-bold text-gray-800">대여 가능 공간</h2>
            <div className="flex items-center gap-2">
              {savedMsg && <span className="text-green-600 text-sm font-medium">✓ {savedMsg}</span>}
              <button onClick={addSpace} className="btn-secondary text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> 공간 추가</button>
              <button onClick={saveConfig} className="btn-primary text-sm flex items-center gap-1.5"><Save className="w-4 h-4" /> 저장</button>
            </div>
          </div>
          {spaces.length === 0 ? (
            <p className="text-sm text-gray-400 py-3">등록된 공간이 없습니다. ‘공간 추가’로 대여 가능한 공간을 등록해주세요.</p>
          ) : (
            <div className="space-y-3">
              {spaces.map((s, i) => (
                <div key={s.id} className="rounded-xl border border-gray-200 p-3">
                  <div className="flex items-center gap-2">
                    <input className="input-field flex-1" value={s.name} onChange={(e) => setSpace(i, { name: e.target.value })} placeholder="공간명 (예: 데이터라이브러리 · 사이버 워룸)" />
                    <input type="number" min={0} className="input-field w-28" value={s.capacity ?? ""} onChange={(e) => setSpace(i, { capacity: e.target.value === "" ? undefined : Number(e.target.value) })} placeholder="수용인원" />
                    <button onClick={() => removeSpace(i)} className="text-gray-400 hover:text-rose-500" title="공간 삭제"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  {/* 장소 사진 (여러 장) */}
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    {(s.photos || []).map((p, pi) => (
                      <div key={pi} className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p} alt="" className="w-14 h-14 rounded-lg object-cover border border-gray-200" />
                        <button onClick={() => removePhoto(i, pi)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-gray-200 text-rose-500 text-xs flex items-center justify-center shadow" title="사진 삭제">✕</button>
                      </div>
                    ))}
                    <label className="w-14 h-14 rounded-lg border border-dashed border-gray-300 text-gray-400 hover:border-indigo-300 hover:text-indigo-500 cursor-pointer flex items-center justify-center text-xs text-center">
                      {uploading === i ? "…" : "+ 사진"}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(i, f); e.target.value = ""; }} />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-gray-400 mt-2">※ 신청자에게는 <strong>공간명·수용 인원·사진(여러 장)만</strong> 표시됩니다. 신청자가 장소를 클릭하면 사진을 볼 수 있습니다. (서암관·의생명대 도서실은 대여 공간에서 제외)</p>
          <div className="mt-4 pt-3 border-t border-gray-100 space-y-3">
            <div>
              <label className="label">구글 캘린더 ID (공개 캘린더 · 예약 현황 표시·충돌 검사)</label>
              <input className="input-field font-mono text-xs" value={calendarId} onChange={(e) => setCalendarId(e.target.value)} placeholder="xxxxx@group.calendar.google.com" />
            </div>
            <div>
              <label className="label">승인 시 구글시트·캘린더 자동 반영 웹훅 URL (구글 Apps Script)</label>
              <div className="flex items-center gap-2">
                <input className="input-field font-mono text-xs flex-1" value={approveWebhook} onChange={(e) => setApproveWebhook(e.target.value)} placeholder="https://script.google.com/macros/s/.../exec" />
                <button onClick={testWebhook} disabled={testing} className="btn-secondary text-sm whitespace-nowrap disabled:opacity-60">{testing ? "테스트 중..." : "연결 테스트"}</button>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">신청을 <strong>승인</strong>하면 이 웹훅으로 상세 정보를 보내 구글시트·캘린더에 자동 반영합니다. <strong>연결 테스트</strong>로 구글 캘린더에 [웹훅 테스트] 이벤트가 생기는지 먼저 확인하세요. (미설정 시 수동 등록 — 플랫폼 캘린더에는 즉시 반영)</p>
            </div>
          </div>
        </div>
      )}

      {/* ── 공간대여 캘린더 ── */}
      {/* ── 공간대여 신청폼 (신청폼 / 이용결과폼 편집) ── */}
      {tab === "form" && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="flex gap-2">
                {([["apply", "신청 폼"], ["result", "이용결과 폼"]] as const).map(([k, lbl]) => (
                  <button key={k} onClick={() => setFormKind(k)} className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition ${formKind === k ? "bg-indigo-500 text-white border-indigo-500" : "bg-white/70 border-gray-200 text-gray-600"}`}>{lbl}</button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {formSaved && <span className="text-green-600 text-sm font-medium">✓ 저장됨</span>}
                {formKind === "apply" && <button onClick={() => { if (!spaceForm || window.confirm("현재 신청 폼을 기본 폼(장소·일시·연락처·개인정보동의 포함)으로 덮어씁니다. 계속할까요?")) setSpaceForm(defaultSpaceRentalForm()); }} className="btn-secondary text-sm">기본 폼 불러오기</button>}
                <button onClick={saveForm} className="btn-primary text-sm flex items-center gap-1.5"><Save className="w-4 h-4" /> 저장</button>
              </div>
            </div>
            {formKind === "apply" ? (
              <p className="text-[11px] text-gray-400 mt-2">공간대여 <strong>신청 화면</strong>에 표시할 폼입니다. 신청자는 이 폼으로 서류를 제출하고, <strong>대여 일정은 관리자가 신청목록에서 직접 입력</strong>해 캘린더에 반영합니다. 파일(서류 제출)·개인정보 동의 항목도 추가·수정할 수 있습니다.</p>
            ) : (
              <p className="text-[11px] text-gray-400 mt-2"><strong>이용결과 제출</strong> 화면에 표시할 폼입니다. 폼을 만들면 기본 항목(이용자 명단·서명, 이용 사진, 비고) 대신 <strong>이 폼만</strong> 표시되며, 답변은 구글시트에 함께 기록됩니다.</p>
            )}
          </div>
          <div className="card">
            <SchemaForm editable schema={curForm || emptySchema()} accent="#6366f1" onChange={setCurForm} />
            <p className="text-[11px] text-gray-400 mt-3">수정한 뒤 위 <strong>‘저장’</strong>을 누르면 반영됩니다.</p>
          </div>
        </div>
      )}

      {tab === "calendar" && <SpaceCalendar />}

      {/* 제출 서류·사진 미리보기 창 (이동·크기조절 가능, 목록 조작 유지) */}
      {fileWin && (
        <DraggableWindow title={fileWin.name} onClose={() => setFileWin(null)}>
          {/\.(png|jpe?g|gif|webp)(\?|$)/i.test(fileWin.name) || fileWin.url.startsWith("data:image") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fileWin.url} alt={fileWin.name} className="max-w-full max-h-full object-contain" />
          ) : /\.pdf(\?|$)/i.test(fileWin.name) ? (
            <iframe src={fileWin.url} title={fileWin.name} className="w-full h-full bg-white" style={{ border: "none" }} />
          ) : (
            <div className="text-center text-sm text-gray-500 space-y-3 p-6">
              <FileText className="w-10 h-10 mx-auto text-indigo-300" />
              <p>이 형식(HWP·오피스 문서 등)은 브라우저 미리보기를 지원하지 않습니다.<br />다운로드하여 확인해주세요.</p>
              <a href={fileWin.url} download={fileWin.name} className="btn-primary text-sm inline-flex items-center gap-1.5"><Download className="w-4 h-4" /> {fileWin.name} 다운로드</a>
            </div>
          )}
        </DraggableWindow>
      )}

      {/* 관리자 직접 신청 모달 */}
      {applyOpen && (
        <AdminApplyModal spaces={spaces} onClose={() => setApplyOpen(false)} onDone={() => { setApplyOpen(false); load(); }} />
      )}
    </AdminLayout>
  );
}

// 제출 서류 칩 — 클릭 시 미리보기 창, 아이콘으로 다운로드
function FileChips({ files, onPreview, onDelete }: { files: RentalFile[]; onPreview: (f: { name: string; url: string }) => void; onDelete?: (f: RentalFile) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {files.map((f, i) => (
        <span key={i} className="inline-flex items-center gap-1 rounded-lg border border-indigo-100 bg-indigo-50/60 pl-2 pr-1 py-1 text-xs">
          <button type="button" onClick={() => onPreview({ name: f.name, url: f.url })} title="클릭하면 미리보기 창이 열립니다"
            className="text-indigo-700 font-medium hover:underline max-w-[220px] truncate">
            📄 {f.label ? `${f.label} · ` : ""}{f.name}
          </button>
          <a href={f.url} download={f.name} title="다운로드" className="text-gray-400 hover:text-indigo-600 p-0.5"><Download className="w-3.5 h-3.5" /></a>
          {onDelete && (
            <button type="button" title="서류 삭제" onClick={() => { if (confirm(`'${f.name}' 서류를 삭제하시겠습니까?`)) onDelete(f); }}
              className="text-gray-300 hover:text-rose-500 p-0.5"><Trash2 className="w-3.5 h-3.5" /></button>
          )}
        </span>
      ))}
    </div>
  );
}

// 신청 1건 카드 — 목록에서 바로 서류 확인·대여 일정 직접 입력·심사(승인/보완/반려/삭제)
function RequestCard({ r, spaces, onStatus, onDelete, onSaveSchedule, onPreview }: {
  r: RentalRequest;
  spaces: RentalSpace[];
  onStatus: (id: string, status: RentalStatus, memo?: string) => void;
  onDelete: (id: string) => void;
  onSaveSchedule: (id: string, edit: Partial<RentalRequest>) => Promise<boolean>;
  onPreview: (f: { name: string; url: string }) => void;
}) {
  const [sch, setSch] = useState({
    spaceId: r.spaceId || "", spaceName: r.spaceName || "",
    date: r.date || "", endDate: r.endDate || "", start: r.start || "", end: r.end || "",
    purpose: r.purpose || "",
    repeatFreq: (r.repeat?.freq || "") as "" | "weekly" | "monthly",
    repeatUntil: r.repeat?.until || "",
  });
  const [allDay, setAllDay] = useState(r.start === "00:00" && r.end === "23:59");
  const [memo, setMemo] = useState(r.adminMemo || "");
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false); // 기본 접힘(간단히 보기) — 펼쳐서 상세 확인
  const hasSchedule = /^\d{4}-\d{2}-\d{2}$/.test(r.date) && /^\d{2}:\d{2}$/.test(r.start) && /^\d{2}:\d{2}$/.test(r.end) && !!r.spaceName;
  // 간단히 보기 제목: 공간 · 일시 · 신청자 — 파악할 정보가 없으면 접수번호만 표시
  const schedText = /^\d{4}-\d{2}-\d{2}$/.test(r.date) && r.start
    ? `${r.date}${r.endDate && r.endDate !== r.date ? `~${r.endDate}` : ""} ${r.start}~${r.end}` : "";
  const titleParts = [r.spaceName, schedText, r.applicantName].filter(Boolean);

  const save = async () => {
    const start = allDay ? "00:00" : sch.start;
    const end = allDay ? "23:59" : sch.end;
    if (!sch.spaceId && !sch.spaceName) return alert("대여 공간을 선택해주세요.");
    if (!sch.date || !start || !end) return alert("사용일과 시간을 입력해주세요.");
    if (sch.endDate && sch.endDate < sch.date) return alert("종료일이 시작일보다 빠를 수 없습니다.");
    if (sch.repeatFreq && !sch.repeatUntil) return alert("반복 종료일을 선택해주세요.");
    if (sch.repeatFreq && sch.repeatUntil <= sch.date) return alert("반복 종료일이 시작일보다 늦어야 합니다.");
    setSaving(true);
    try {
      await onSaveSchedule(r.id, {
        spaceId: sch.spaceId, spaceName: sch.spaceName, date: sch.date, endDate: sch.endDate || "", start, end, purpose: sch.purpose,
        repeat: sch.repeatFreq ? { freq: sch.repeatFreq, until: sch.repeatUntil } : null,
      });
    } finally { setSaving(false); }
  };

  return (
    <div className="card space-y-3">
      {/* 간단히 보기(기본): 접수번호 + 요약 제목 — 클릭하면 펼침 */}
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2 flex-wrap text-left">
        <span className="badge bg-gray-100 text-gray-700 font-mono">{r.receiptNo || "번호 미부여"}</span>
        <span className={`badge ${STATUS_META[r.status].badge}`}>{STATUS_META[r.status].label}</span>
        {titleParts.length > 0 ? (
          <span className="font-bold text-gray-800 truncate max-w-[60%]">{titleParts.join(" · ")}</span>
        ) : null}
        {r.repeat && <span className="badge bg-violet-100 text-violet-700">{REPEAT_LABELS[r.repeat.freq]} 반복</span>}
        {r.usageResult && <span className="badge bg-emerald-100 text-emerald-700">이용결과 제출됨</span>}
        <span className="ml-auto flex items-center gap-2 text-[11px] text-gray-400">
          접수 {r.createdAt ? new Date(r.createdAt).toLocaleString("ko-KR") : "-"}
          {open ? <ChevronUp className="w-4 h-4 text-indigo-500" /> : <ChevronDown className="w-4 h-4 text-indigo-500" />}
        </span>
      </button>

      {open && (<>
      {/* 신청자 정보 */}
      <div className="flex items-center gap-2 flex-wrap text-sm">
        <span className="font-bold text-gray-800">{r.applicantName || "(이름 없음)"}</span>
        {r.studentId && <span className="text-xs text-gray-500">{r.studentId}</span>}
        {r.phone && <span className="text-xs text-gray-500">{r.phone}</span>}
        {r.email && <span className="text-xs text-gray-400">{r.email}</span>}
        {r.repeat && <span className="badge bg-violet-100 text-violet-700">{REPEAT_LABELS[r.repeat.freq]} 반복 ~{r.repeat.until}</span>}
      </div>

      {/* 제출 서류 — 다운로드·미리보기 */}
      {(r.files && r.files.length > 0) && (
        <div>
          <p className="text-[11px] font-semibold text-gray-500 mb-1">제출 서류 (클릭: 미리보기 · 아이콘: 다운로드)</p>
          <FileChips files={r.files} onPreview={onPreview} />
        </div>
      )}

      {/* 신청자 답변 */}
      {(r.answers && r.answers.length > 0) && (
        <div className="rounded-xl bg-gray-50/70 border border-gray-100 p-3 text-sm space-y-1">
          {r.answers.map((a) => (
            <div key={a.id} className="flex gap-3"><span className="w-32 shrink-0 text-gray-500">{a.label || a.id}</span><span className="text-gray-800 break-words whitespace-pre-line">{a.value || "-"}</span></div>
          ))}
        </div>
      )}
      {r.headcount > 0 && <p className="text-sm text-gray-600">인원 {r.headcount}명</p>}

      {/* 대여 일정 — 관리자 직접 입력 → 캘린더 반영 */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 space-y-2">
        <p className="text-[11px] font-semibold text-indigo-700">대여 일정 (관리자 직접 입력 · 저장 시 공간대여 캘린더 반영){!hasSchedule && <span className="ml-1 text-rose-500">— 미입력</span>}</p>
        <div className="grid sm:grid-cols-6 gap-2 items-end">
          <div className="sm:col-span-2">
            <label className="label !text-xs">대여 공간</label>
            <select className="input-field !min-h-[40px]" value={sch.spaceId}
              onChange={(e) => { const s = spaces.find((x) => x.id === e.target.value); setSch((p) => ({ ...p, spaceId: e.target.value, spaceName: s ? s.name : p.spaceName })); }}>
              {!spaces.some((s) => s.id === sch.spaceId) && <option value={sch.spaceId}>{sch.spaceName || "공간 선택"}</option>}
              {spaces.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div><label className="label !text-xs">시작일</label><input type="date" className="input-field !min-h-[40px]" value={sch.date} onChange={(e) => setSch((p) => ({ ...p, date: e.target.value }))} /></div>
          <div><label className="label !text-xs">종료일(선택)</label><input type="date" className="input-field !min-h-[40px]" value={sch.endDate} min={sch.date || undefined} onChange={(e) => setSch((p) => ({ ...p, endDate: e.target.value }))} /></div>
          <div><label className="label !text-xs">시작</label><input type="time" className="input-field !min-h-[40px]" value={allDay ? "00:00" : sch.start} disabled={allDay} onChange={(e) => setSch((p) => ({ ...p, start: e.target.value }))} /></div>
          <div><label className="label !text-xs">종료</label><input type="time" className="input-field !min-h-[40px]" value={allDay ? "23:59" : sch.end} disabled={allDay} onChange={(e) => setSch((p) => ({ ...p, end: e.target.value }))} /></div>
        </div>
        <div className="grid sm:grid-cols-6 gap-2 items-end">
          <div>
            <label className="label !text-xs">반복</label>
            <select className="input-field !min-h-[40px] !text-sm" value={sch.repeatFreq}
              onChange={(e) => setSch((p) => ({ ...p, repeatFreq: e.target.value as "" | "weekly" | "monthly" }))}>
              <option value="">반복 없음</option>
              <option value="weekly">매주 (같은 요일)</option>
              <option value="monthly">매월 (같은 일)</option>
            </select>
          </div>
          <div>
            <label className="label !text-xs">반복 종료일</label>
            <input type="date" className="input-field !min-h-[40px] !text-sm" value={sch.repeatUntil} min={sch.date || undefined}
              disabled={!sch.repeatFreq} onChange={(e) => setSch((p) => ({ ...p, repeatUntil: e.target.value }))} />
          </div>
          <div className="sm:col-span-4">
            <label className="label !text-xs">사용 목적 (캘린더에 함께 표시)</label>
            <input className="input-field !min-h-[40px] !text-sm" value={sch.purpose} onChange={(e) => setSch((p) => ({ ...p, purpose: e.target.value }))} placeholder="예: AWS Promphton 행사" />
          </div>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
            <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} /> 종일 (00:00~23:59)
          </label>
          <button onClick={save} disabled={saving} className="btn-secondary text-sm flex items-center gap-1 disabled:opacity-60"><Save className="w-4 h-4" /> {saving ? "저장 중..." : "일정 저장 (캘린더 반영)"}</button>
        </div>
      </div>

      {/* 메모 + 심사 버튼 — 목록에서 바로 처리 */}
      <div className="flex flex-wrap items-center gap-2">
        <input className="input-field flex-1 min-w-[220px] !min-h-[40px]" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="관리자 메모 / 보완요청 사유" />
        <button onClick={() => onStatus(r.id, "approved", memo)} className="btn-primary text-sm flex items-center gap-1"><Check className="w-4 h-4" /> 승인</button>
        <button onClick={() => onStatus(r.id, "supplement", memo)} className="text-sm px-3 py-2 rounded-xl font-semibold text-orange-700 bg-orange-100 hover:bg-orange-200 flex items-center gap-1"><PencilLine className="w-4 h-4" /> 보완요청</button>
        <button onClick={() => onStatus(r.id, "rejected", memo)} className="text-sm px-3 py-2 rounded-xl font-semibold text-rose-700 bg-rose-100 hover:bg-rose-200 flex items-center gap-1"><Ban className="w-4 h-4" /> 반려</button>
        <button onClick={() => onDelete(r.id)} className="btn-secondary text-sm text-gray-500 flex items-center gap-1"><Trash2 className="w-4 h-4" /> 삭제</button>
      </div>
      <p className="text-[11px] text-gray-400">승인하면 플랫폼 캘린더에 즉시 반영되고, 웹훅이 설정된 경우 구글시트·캘린더에도 자동 등록됩니다. 일정 변경 시 ‘일정 저장’을 눌러주세요.</p>
      </>)}
    </div>
  );
}

// 이용결과 1건 카드 — 승인된 건 기준. 제출 내용 확인 + 관리자 직접 등록 + 신청자 목록 숨김 + 사진 PDF
function ResultCard({ r, onPreview, onToggleHide, onRegistered, onDeleteFile }: {
  r: RentalRequest;
  onPreview: (f: { name: string; url: string }) => void;
  onToggleHide: (hide: boolean) => Promise<void>;
  onRegistered: () => void;
  onDeleteFile: (f: RentalFile) => void;
}) {
  const u = r.usageResult;
  const [regOpen, setRegOpen] = useState(false);
  return (
    <div className="card space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="badge bg-gray-100 text-gray-700 font-mono">{r.receiptNo || "번호 미부여"}</span>
        <span className={`badge ${u ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{u ? "이용결과 제출됨" : "이용결과 미제출"}</span>
        <span className={`badge ${STATUS_META[r.status].badge}`}>{STATUS_META[r.status].label}</span>
        <span className="font-bold text-gray-800">{r.applicantName || "(이름 없음)"}</span>
        {r.studentId && <span className="text-xs text-gray-500">{r.studentId}</span>}
        {r.phone && <span className="text-xs text-gray-500">{r.phone}</span>}
        <span className="text-xs text-gray-500">{r.spaceName}{r.date ? ` · ${r.date} ${r.start}~${r.endDate && r.endDate !== r.date ? `${r.endDate} ` : ""}${r.end}` : ""}</span>
        {r.repeat && <span className="badge bg-violet-100 text-violet-700">{REPEAT_LABELS[r.repeat.freq]} 반복 ~{r.repeat.until}</span>}
        {u?.submittedAt && <span className="ml-auto text-[11px] text-gray-400">제출 {new Date(u.submittedAt).toLocaleString("ko-KR")}</span>}
      </div>

      {/* 관리 버튼: 사진 PDF · 직접 등록 · 신청자 목록 숨김 */}
      <div className="flex flex-wrap items-center gap-2">
        {u && u.photos.length > 0 && (
          <button onClick={() => window.open(`/admin/space-rental/print?id=${r.id}`, "_blank", "noopener")}
            className="btn-secondary text-sm flex items-center gap-1"><FileText className="w-4 h-4" /> 이용 사진 PDF</button>
        )}
        <button onClick={() => setRegOpen((v) => !v)} className="btn-secondary text-sm flex items-center gap-1">
          <PencilLine className="w-4 h-4" /> {u ? "관리자 직접 수정 등록" : "관리자 직접 등록"}
        </button>
        <label className="ml-auto flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer rounded-lg border border-gray-200 px-2.5 py-1.5">
          <input type="checkbox" checked={!!r.hideFromResults} onChange={(e) => onToggleHide(e.target.checked)} className="w-4 h-4 accent-indigo-600" />
          신청자 목록에서 숨김
        </label>
      </div>

      {/* 관리자 직접 등록 폼 (제출된 내용을 덮어씀) */}
      {regOpen && <AdminResultForm requestId={r.id} onDone={() => { setRegOpen(false); onRegistered(); }} />}

      {u && u.users.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-gray-500 mb-1">이용자 명단 및 서명 ({u.users.length}명)</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {u.users.map((x, i) => (
              <div key={i} className="rounded-lg border border-gray-200 bg-white p-2">
                <div className="text-xs font-medium text-gray-800 mb-1">{x.name}</div>
                {x.signature
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={x.signature} alt={`${x.name} 서명`} className="h-10 border border-gray-100 rounded bg-white" />
                  : <span className="text-[11px] text-gray-400">서명 없음</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {u && u.photos.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-gray-500 mb-1">이용 사진 ({u.photos.length}장 · 클릭: 미리보기)</p>
          <div className="flex flex-wrap gap-2">
            {u.photos.map((p, i) => (
              <button key={i} type="button" onClick={() => onPreview({ name: `이용 사진 ${i + 1}.jpg`, url: p })} className="rounded-lg overflow-hidden border border-gray-200 hover:ring-2 hover:ring-indigo-300">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p} alt="" className="w-20 h-20 object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {u && u.files && u.files.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-gray-500 mb-1">제출 서류 (클릭: 미리보기 · 아이콘: 다운로드/삭제)</p>
          <FileChips files={u.files} onPreview={onPreview} onDelete={onDeleteFile} />
        </div>
      )}

      {u && u.answers && u.answers.length > 0 && (
        <div className="rounded-xl bg-gray-50/70 border border-gray-100 p-3 text-sm space-y-1">
          {u.answers.map((a) => (
            <div key={a.id} className="flex gap-3"><span className="w-32 shrink-0 text-gray-500">{a.label || a.id}</span><span className="text-gray-800 break-words whitespace-pre-line">{a.value || "-"}</span></div>
          ))}
        </div>
      )}
      {u?.memo && <p className="text-xs text-gray-600 whitespace-pre-line">비고: {u.memo}</p>}
    </div>
  );
}

// 관리자 직접 이용결과 등록 — 이용 사진·비고만 입력. 신청자가 제출한 명단·답변·서류는 보존된다.
function AdminResultForm({ requestId, onDone }: { requestId: string; onDone: () => void }) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const uploadPhoto = async (files: File[]) => {
    setUploading(true);
    try {
      for (const file of files) {
        const fd = new FormData(); fd.append("file", file);
        const res = await fetch("/api/space-rental/upload", { method: "POST", body: fd });
        const j = await res.json().catch(() => ({ ok: false }));
        if (!j.ok) { alert(`'${file.name}' 업로드 실패: ` + (j.error || res.status)); continue; }
        setPhotos((p) => [...p, j.url]);
      }
    } finally { setUploading(false); }
  };

  const submit = async () => {
    if (photos.length === 0 && !memo.trim()) return alert("이용 사진·비고 중 하나 이상 입력해주세요.");
    setBusy(true);
    try {
      // users/answers/files는 보내지 않음 → 서버가 기존 제출 값을 보존
      const res = await fetch("/api/space-rental", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submitResult", requestId, photos, memo: memo.trim() ? `${memo.trim()} (관리자 직접 등록)` : "(관리자 직접 등록)" }),
      });
      const j = await res.json().catch(() => ({ ok: false }));
      if (!j.ok) { alert("등록 실패: " + (j.error || res.status)); return; }
      alert("이용결과가 등록되었습니다.");
      onDone();
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 space-y-2.5">
      <p className="text-[11px] font-semibold text-indigo-700">관리자 직접 등록 — 이용 사진·비고를 등록합니다 (신청자가 제출한 명단·답변·서류는 유지)</p>
      <div>
        <label className="label !text-xs">공간 이용 사진</label>
        <div className="flex items-center gap-2 flex-wrap">
          {photos.map((p, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p} alt="" className="w-14 h-14 rounded-lg object-cover border border-gray-200" />
              <button onClick={() => setPhotos((ps) => ps.filter((_, k) => k !== i))} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-gray-200 text-rose-500 text-xs flex items-center justify-center shadow">✕</button>
            </div>
          ))}
          <label className="w-14 h-14 rounded-lg border border-dashed border-gray-300 text-gray-400 hover:border-indigo-300 hover:text-indigo-500 cursor-pointer flex items-center justify-center text-xs text-center">
            {uploading ? "…" : "+ 사진"}
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { uploadPhoto(Array.from(e.target.files || [])); e.target.value = ""; }} />
          </label>
        </div>
      </div>
      <div>
        <label className="label !text-xs">비고</label>
        <input className="input-field !min-h-[38px] !text-sm" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="특이사항" />
      </div>
      <div className="flex justify-end">
        <button onClick={submit} disabled={busy} className="btn-primary text-sm disabled:opacity-60">{busy ? "등록 중..." : "이용결과 등록"}</button>
      </div>
    </div>
  );
}

// 관리자가 직접 공간대여를 신청 (공개 신청 API 재사용)
function AdminApplyModal({ spaces, onClose, onDone }: { spaces: RentalSpace[]; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ spaceId: "", date: "", endDate: "", start: "", end: "", applicantName: "", studentId: "", phone: "", email: "", headcount: "", purpose: "" });
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const [allDay, setAllDay] = useState(false);
  const [repeatFreq, setRepeatFreq] = useState<"" | "weekly" | "monthly">("");
  const [repeatUntil, setRepeatUntil] = useState("");
  const [busy, setBusy] = useState(false);
  const start = allDay ? "00:00" : f.start;
  const end = allDay ? "23:59" : f.end;
  const endDate = f.endDate || f.date; // 종료일 미입력 시 시작일과 동일(하루)

  const submit = async () => {
    if (!f.spaceId || !f.date || !start || !end) return alert("공간·사용일·시간을 입력해주세요.");
    if (endDate < f.date) return alert("종료일이 시작일보다 빠를 수 없습니다.");
    if (!f.applicantName.trim() || !f.studentId.trim()) return alert("신청자 이름·학번/소속을 입력해주세요.");
    if (repeatFreq && !repeatUntil) return alert("반복 종료일을 선택해주세요.");
    if (repeatFreq && repeatUntil <= f.date) return alert("반복 종료일이 시작일보다 늦어야 합니다.");
    setBusy(true);
    try {
      const res = await fetch("/api/space-rental", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, date: f.date, endDate, start, end, headcount: Number(f.headcount) || 0, repeat: repeatFreq ? { freq: repeatFreq, until: repeatUntil } : undefined }),
      });
      const j = await res.json().catch(() => ({ ok: false }));
      if (!j.ok) { alert("신청 실패: " + (j.error || res.status) + (j.conflict ? `\n(${j.conflict})` : "")); return; }
      alert("공간대여 신청이 접수되었습니다. 목록에서 승인해주세요.");
      onDone();
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="modal-backdrop absolute inset-0" onClick={onClose} />
      <div className="modal relative w-full max-w-lg max-h-[88vh] overflow-y-auto p-6">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        <h2 className="text-lg font-bold text-gray-800 mb-4 pr-8">공간대여 직접 신청</h2>
        <div className="space-y-3">
          <div>
            <label className="label">대여 공간 <span className="text-red-500">*</span></label>
            <select className="input-field" value={f.spaceId} onChange={(e) => set("spaceId", e.target.value)}>
              <option value="">공간을 선택하세요</option>
              {spaces.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">시작일 <span className="text-red-500">*</span></label><input type="date" className="input-field" value={f.date} onChange={(e) => set("date", e.target.value)} /></div>
            <div><label className="label">종료일 <span className="text-[11px] font-normal text-gray-400">(하루면 비움/동일)</span></label><input type="date" className="input-field" value={f.endDate} min={f.date || undefined} onChange={(e) => set("endDate", e.target.value)} /></div>
            <div><label className="label">시작 시간 <span className="text-red-500">*</span></label><input type="time" className="input-field" value={f.start} disabled={allDay} onChange={(e) => set("start", e.target.value)} /></div>
            <div><label className="label">종료 시간 <span className="text-red-500">*</span></label><input type="time" className="input-field" value={f.end} disabled={allDay} onChange={(e) => set("end", e.target.value)} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer -mt-1">
            <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} /> 종일 (00:00~23:59)
          </label>
          {/* 반복 대여 — 매주(같은 요일)/매월(같은 일), 반복 종료일까지 회차 생성 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">반복</label>
              <select className="input-field" value={repeatFreq} onChange={(e) => setRepeatFreq(e.target.value as "" | "weekly" | "monthly")}>
                <option value="">반복 없음</option>
                <option value="weekly">매주 (같은 요일)</option>
                <option value="monthly">매월 (같은 일)</option>
              </select>
            </div>
            <div>
              <label className="label">반복 종료일</label>
              <input type="date" className="input-field" value={repeatUntil} min={f.date || undefined} disabled={!repeatFreq} onChange={(e) => setRepeatUntil(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">신청자 이름 <span className="text-red-500">*</span></label><input className="input-field" value={f.applicantName} onChange={(e) => set("applicantName", e.target.value)} /></div>
            <div><label className="label">학번/소속 <span className="text-red-500">*</span></label><input className="input-field" value={f.studentId} onChange={(e) => set("studentId", e.target.value)} /></div>
            <div><label className="label">연락처</label><input className="input-field" value={f.phone} onChange={(e) => set("phone", e.target.value)} /></div>
            <div><label className="label">사용 인원</label><input type="number" min={0} className="input-field" value={f.headcount} onChange={(e) => set("headcount", e.target.value)} /></div>
          </div>
          <div><label className="label">사용 목적</label><textarea className="input-field h-20 resize-none" value={f.purpose} onChange={(e) => set("purpose", e.target.value)} /></div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="btn-secondary text-sm">취소</button>
          <button onClick={submit} disabled={busy} className="btn-primary text-sm disabled:opacity-60">{busy ? "신청 중..." : "신청 접수"}</button>
        </div>
      </div>
    </div>
  );
}

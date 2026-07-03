"use client";
import { useEffect, useState } from "react";
import { Save, Plus, Trash2, CalendarClock, Check, Ban, X, ClipboardList, MapPin, CalendarDays, FilePlus, PencilLine, FileText } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import SpaceCalendar from "@/components/home/SpaceCalendar";
import SchemaForm from "@/components/apply/SchemaForm";
import { type FormSchema, defaultSpaceRentalForm, emptySchema } from "@/lib/form-schema";
import type { RentalSpace, RentalRequest, RentalStatus } from "@/lib/space-rental";

const STATUS_META: Record<RentalStatus, { label: string; badge: string }> = {
  pending: { label: "대기", badge: "bg-amber-100 text-amber-700" },
  approved: { label: "승인", badge: "bg-emerald-100 text-emerald-700" },
  supplement: { label: "보완요청", badge: "bg-orange-100 text-orange-700" },
  rejected: { label: "반려", badge: "bg-rose-100 text-rose-700" },
};

type Tab = "requests" | "spaces" | "form" | "calendar";

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

  const [detail, setDetail] = useState<RentalRequest | null>(null);
  const [memo, setMemo] = useState("");
  const [edit, setEdit] = useState<Partial<RentalRequest>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);

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
      if (j.ok) alert("✅ 웹훅 연결 성공!\n구글 캘린더에 '[웹훅 테스트]' 이벤트(내일 10~11시)가 생성되었습니다. 확인 후 삭제하세요." + (j.eventId ? `\n(eventId: ${j.eventId})` : ""));
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
    setDetail((d) => d && d.id === id ? { ...d, status, adminMemo: adminMemo ?? d.adminMemo } : d);
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
    setDetail(null);
    await fetch("/api/admin/space-rental", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }).catch(() => {});
  };

  const openDetail = (r: RentalRequest) => {
    setDetail(r); setMemo(r.adminMemo || "");
    setEdit({ spaceId: r.spaceId, spaceName: r.spaceName, date: r.date, start: r.start, end: r.end, applicantName: r.applicantName, studentId: r.studentId, phone: r.phone, email: r.email, headcount: r.headcount, purpose: r.purpose });
  };
  const setE = (patch: Partial<RentalRequest>) => setEdit((p) => ({ ...p, ...patch }));

  // 신청 내용 편집 저장 → 구글 캘린더·시트·플랫폼 캘린더 반영
  const saveEdit = async () => {
    if (!detail) return;
    setSavingEdit(true);
    try {
      const res = await fetch("/api/admin/space-rental", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: detail.id, edit }),
      });
      const j = await res.json().catch(() => ({ ok: false }));
      if (!j.ok) { alert("수정 실패: " + (j.error || res.status)); return; }
      setRequests((rs) => rs.map((r) => r.id === detail.id ? { ...r, ...edit } as RentalRequest : r));
      setDetail((d) => d ? { ...d, ...edit } as RentalRequest : d);
      if (j.calendarReflected) alert("수정되어 구글 캘린더·시트에 반영을 요청했습니다.\n플랫폼 캘린더에도 반영됩니다.");
      else if (j.webhookError) alert("수정되었으나 구글 캘린더 반영에 실패했습니다.\n\n오류: " + j.webhookError + "\n\n플랫폼 캘린더에는 반영됩니다.");
      else alert("수정되었습니다. 플랫폼 캘린더에 반영됩니다.\n(구글 캘린더 반영은 승인 및 웹훅 설정 시 동작)");
    } finally { setSavingEdit(false); }
  };


  if (loading) return <AdminLayout><div className="text-center py-20 text-gray-400">로딩 중...</div></AdminLayout>;

  const TABS: { key: Tab; label: string; icon: typeof ClipboardList }[] = [
    { key: "requests", label: "공간대여 신청목록", icon: ClipboardList },
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
              <Icon className="w-4 h-4" /> {t.label}{t.key === "requests" ? ` (${requests.length})` : ""}
            </button>
          );
        })}
      </div>

      {/* ── 공간대여 신청목록 ── */}
      {tab === "requests" && (
        <div className="card">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="font-bold text-gray-800">공간대여 신청목록 <span className="text-sm text-gray-400 font-normal">({requests.length})</span></h2>
            <button onClick={() => setApplyOpen(true)} className="btn-primary text-sm flex items-center gap-1.5"><FilePlus className="w-4 h-4" /> 직접 신청</button>
          </div>
          {requests.length === 0 ? (
            <p className="text-sm text-gray-400 py-3">접수된 공간대여 신청이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-glass text-sm">
                <thead><tr>
                  <th className="whitespace-nowrap">상태</th>
                  <th className="whitespace-nowrap">공간</th>
                  <th className="whitespace-nowrap">일시</th>
                  <th className="whitespace-nowrap">신청자</th>
                  <th className="whitespace-nowrap">인원</th>
                  <th className="text-center whitespace-nowrap">상세/관리</th>
                </tr></thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id}>
                      <td><span className={`badge ${STATUS_META[r.status].badge}`}>{STATUS_META[r.status].label}</span></td>
                      <td className="font-medium whitespace-nowrap">{r.spaceName}</td>
                      <td className="whitespace-nowrap">{r.date} {r.start}~{r.endDate && r.endDate !== r.date ? `${r.endDate} ` : ""}{r.end}</td>
                      <td className="whitespace-nowrap">{r.applicantName} <span className="text-gray-400 text-xs">{r.studentId}</span></td>
                      <td className="text-center">{r.headcount || "-"}</td>
                      <td className="text-center whitespace-nowrap">
                        <button onClick={() => openDetail(r)} className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 inline-flex items-center gap-1"><PencilLine className="w-3.5 h-3.5" /> 상세·심사</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
              <p className="text-[11px] text-gray-400 mt-2">공간대여 <strong>신청 화면</strong>에 표시할 폼입니다. 각 항목 오른쪽의 <strong>📅 예약 연결</strong>에서 <strong>대여 장소·사용일·사용 시간·연락처</strong>를 지정하면 구글 캘린더·시트·플랫폼 캘린더에 반영됩니다. 개인정보 동의 항목도 추가·수정할 수 있습니다.</p>
            ) : (
              <p className="text-[11px] text-gray-400 mt-2"><strong>이용결과 제출</strong> 화면에 표시할 추가 설문입니다. 기본 항목(이용자 명단·서명, 이용 사진, 비고)에 더해 여기서 만든 질문이 함께 표시되며, 답변은 구글시트에 함께 기록됩니다.</p>
            )}
          </div>
          <div className="card">
            <SchemaForm editable showBookingRoles={formKind === "apply"} schema={curForm || emptySchema()} accent="#6366f1" onChange={setCurForm} />
            <p className="text-[11px] text-gray-400 mt-3">수정한 뒤 위 <strong>‘저장’</strong>을 누르면 반영됩니다.</p>
          </div>
        </div>
      )}

      {tab === "calendar" && <SpaceCalendar />}

      {/* 신청 상세·심사 모달 */}
      {detail && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="modal-backdrop absolute inset-0" onClick={() => setDetail(null)} />
          <div className="modal relative w-full max-w-lg max-h-[88vh] overflow-y-auto p-6">
            <button onClick={() => setDetail(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
            <div className="flex items-center gap-2 mb-3 pr-8">
              <h2 className="text-lg font-bold text-gray-800">공간대여 신청 상세</h2>
              <span className={`badge ${STATUS_META[detail.status].badge}`}>{STATUS_META[detail.status].label}</span>
            </div>
            {/* 신청 내용 편집 — 수정 시 구글 캘린더·시트·플랫폼 캘린더에 반영 */}
            <div className="rounded-xl border border-gray-100 p-3 space-y-3">
              <div>
                <label className="label">대여 공간</label>
                <select className="input-field" value={edit.spaceId || ""} onChange={(e) => { const s = spaces.find((x) => x.id === e.target.value); setE({ spaceId: e.target.value, spaceName: s ? s.name : edit.spaceName }); }}>
                  {!spaces.some((s) => s.id === edit.spaceId) && <option value={edit.spaceId || ""}>{edit.spaceName || "(캘린더 등록)"}</option>}
                  {spaces.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><label className="label">사용일</label><input type="date" className="input-field" value={edit.date || ""} onChange={(e) => setE({ date: e.target.value })} /></div>
                <div><label className="label">시작</label><input type="time" className="input-field" value={edit.start || ""} onChange={(e) => setE({ start: e.target.value })} /></div>
                <div><label className="label">종료</label><input type="time" className="input-field" value={edit.end || ""} onChange={(e) => setE({ end: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="label">신청자</label><input className="input-field" value={edit.applicantName || ""} onChange={(e) => setE({ applicantName: e.target.value })} /></div>
                <div><label className="label">학번/소속</label><input className="input-field" value={edit.studentId || ""} onChange={(e) => setE({ studentId: e.target.value })} /></div>
                <div><label className="label">연락처</label><input className="input-field" value={edit.phone || ""} onChange={(e) => setE({ phone: e.target.value })} /></div>
                <div><label className="label">이메일</label><input className="input-field" value={edit.email || ""} onChange={(e) => setE({ email: e.target.value })} /></div>
                <div><label className="label">사용 인원</label><input type="number" min={0} className="input-field" value={edit.headcount ?? ""} onChange={(e) => setE({ headcount: e.target.value === "" ? 0 : Number(e.target.value) })} /></div>
              </div>
              <div><label className="label">사용 목적</label><textarea className="input-field h-16 resize-none" value={edit.purpose || ""} onChange={(e) => setE({ purpose: e.target.value })} /></div>
              <div className="flex justify-end">
                <button onClick={saveEdit} disabled={savingEdit} className="btn-secondary text-sm flex items-center gap-1 disabled:opacity-60"><Save className="w-4 h-4" /> {savingEdit ? "저장 중..." : "수정 저장 (캘린더·시트 반영)"}</button>
              </div>
              {(detail.answers && detail.answers.length > 0) && (
                <div className="pt-2 border-t border-gray-100 text-sm space-y-1">
                  <p className="text-[11px] font-semibold text-gray-500">신청자 추가 설문</p>
                  {detail.answers.map((a) => (
                    <div key={a.id} className="flex gap-3"><span className="w-28 shrink-0 text-gray-500">{a.label || a.id}</span><span className="text-gray-800 break-words whitespace-pre-line">{a.value || "-"}</span></div>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-gray-400">접수일시: {detail.createdAt ? new Date(detail.createdAt).toLocaleString("ko-KR") : "-"}</p>
            </div>

            {/* 보완요청 메모 */}
            <div className="mt-4">
              <label className="label">관리자 메모 / 보완요청 사유</label>
              <textarea className="input-field h-20 resize-none" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="보완요청 시 신청자에게 안내할 사유를 적어주세요." />
            </div>

            {/* 이용결과 제출 내용 (신청자가 사용 후 제출) */}
            {detail.usageResult && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                <p className="text-sm font-bold text-emerald-800 mb-2 flex items-center gap-1"><ClipboardList className="w-4 h-4" /> 이용결과 (제출 {detail.usageResult.submittedAt ? new Date(detail.usageResult.submittedAt).toLocaleString("ko-KR") : ""})</p>
                {detail.usageResult.users.length > 0 && (
                  <div className="mb-2">
                    <p className="text-[11px] font-semibold text-gray-500 mb-1">이용자 명단 및 서명</p>
                    <div className="grid grid-cols-2 gap-2">
                      {detail.usageResult.users.map((u, i) => (
                        <div key={i} className="rounded-lg border border-gray-200 bg-white p-2">
                          <div className="text-xs font-medium text-gray-800 mb-1">{u.name}</div>
                          {u.signature
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={u.signature} alt={`${u.name} 서명`} className="h-12 border border-gray-100 rounded bg-white" />
                            : <span className="text-[11px] text-gray-400">서명 없음</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {detail.usageResult.photos.length > 0 && (
                  <div className="mb-1">
                    <p className="text-[11px] font-semibold text-gray-500 mb-1">이용 사진</p>
                    <div className="flex flex-wrap gap-2">
                      {detail.usageResult.photos.map((p, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <a key={i} href={p} target="_blank" rel="noopener noreferrer"><img src={p} alt="" className="w-16 h-16 rounded-lg object-cover border border-gray-200" /></a>
                      ))}
                    </div>
                  </div>
                )}
                {(detail.usageResult.answers && detail.usageResult.answers.length > 0) && (
                  <div className="mb-1 text-sm space-y-0.5">
                    {detail.usageResult.answers.map((a) => (
                      <div key={a.id} className="flex gap-3"><span className="w-28 shrink-0 text-gray-500">{a.label || a.id}</span><span className="text-gray-800 break-words whitespace-pre-line">{a.value || "-"}</span></div>
                    ))}
                  </div>
                )}
                {detail.usageResult.memo && <p className="text-xs text-gray-600 mt-1 whitespace-pre-line">비고: {detail.usageResult.memo}</p>}
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 mt-4">
              <button onClick={() => removeRequest(detail.id)} className="btn-secondary text-sm text-gray-500 flex items-center gap-1"><Trash2 className="w-4 h-4" /> 삭제</button>
              <button onClick={() => updateStatus(detail.id, "supplement", memo)} className="text-sm px-3 py-2 rounded-xl font-semibold text-orange-700 bg-orange-100 hover:bg-orange-200 flex items-center gap-1"><PencilLine className="w-4 h-4" /> 보완요청</button>
              <button onClick={() => updateStatus(detail.id, "rejected", memo)} className="text-sm px-3 py-2 rounded-xl font-semibold text-rose-700 bg-rose-100 hover:bg-rose-200 flex items-center gap-1"><Ban className="w-4 h-4" /> 반려</button>
              <button onClick={() => updateStatus(detail.id, "approved", memo)} className="btn-primary text-sm flex items-center gap-1"><Check className="w-4 h-4" /> 승인</button>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">승인하면 플랫폼 캘린더에 즉시 반영되고, 웹훅이 설정된 경우 구글시트·캘린더에도 자동 등록됩니다. 내용을 수정하면 ‘수정 저장’으로 반영하세요.</p>
          </div>
        </div>
      )}

      {/* 관리자 직접 신청 모달 */}
      {applyOpen && (
        <AdminApplyModal spaces={spaces} onClose={() => setApplyOpen(false)} onDone={() => { setApplyOpen(false); load(); }} />
      )}
    </AdminLayout>
  );
}

// 관리자가 직접 공간대여를 신청 (공개 신청 API 재사용)
function AdminApplyModal({ spaces, onClose, onDone }: { spaces: RentalSpace[]; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ spaceId: "", date: "", endDate: "", start: "", end: "", applicantName: "", studentId: "", phone: "", email: "", headcount: "", purpose: "" });
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const [allDay, setAllDay] = useState(false);
  const [busy, setBusy] = useState(false);
  const start = allDay ? "00:00" : f.start;
  const end = allDay ? "23:59" : f.end;
  const endDate = f.endDate || f.date; // 종료일 미입력 시 시작일과 동일(하루)

  const submit = async () => {
    if (!f.spaceId || !f.date || !start || !end) return alert("공간·사용일·시간을 입력해주세요.");
    if (endDate < f.date) return alert("종료일이 시작일보다 빠를 수 없습니다.");
    if (!f.applicantName.trim() || !f.studentId.trim()) return alert("신청자 이름·학번/소속을 입력해주세요.");
    setBusy(true);
    try {
      const res = await fetch("/api/space-rental", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, date: f.date, endDate, start, end, headcount: Number(f.headcount) || 0 }),
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

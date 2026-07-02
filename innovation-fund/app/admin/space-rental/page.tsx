"use client";
import { useEffect, useState } from "react";
import { Save, Plus, Trash2, CalendarClock, Check, Ban, X, ClipboardList, MapPin, CalendarDays, FilePlus, PencilLine } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import SpaceCalendar from "@/components/home/SpaceCalendar";
import type { RentalSpace, RentalRequest, RentalStatus } from "@/lib/space-rental";

const STATUS_META: Record<RentalStatus, { label: string; badge: string }> = {
  pending: { label: "대기", badge: "bg-amber-100 text-amber-700" },
  approved: { label: "승인", badge: "bg-emerald-100 text-emerald-700" },
  supplement: { label: "보완요청", badge: "bg-orange-100 text-orange-700" },
  rejected: { label: "반려", badge: "bg-rose-100 text-rose-700" },
};

type Tab = "requests" | "spaces" | "calendar";

export default function SpaceRentalAdminPage() {
  const [tab, setTab] = useState<Tab>("requests");
  const [spaces, setSpaces] = useState<RentalSpace[]>([]);
  const [calendarId, setCalendarId] = useState("");
  const [approveWebhook, setApproveWebhook] = useState("");
  const [pledge, setPledge] = useState("");
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedMsg, setSavedMsg] = useState("");

  const [detail, setDetail] = useState<RentalRequest | null>(null);
  const [memo, setMemo] = useState("");
  const [applyOpen, setApplyOpen] = useState(false);

  const load = () => {
    fetch("/api/admin/space-rental").then((r) => r.json()).then((d) => {
      setSpaces(Array.isArray(d.spaces) ? d.spaces : []);
      setCalendarId(d.calendarId || "");
      setApproveWebhook(d.approveWebhook || "");
      setPledge(d.pledge || "");
      setRequests(Array.isArray(d.requests) ? d.requests : []);
    }).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

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
      setSpace(i, { photo: `/api/site-file?path=${encodeURIComponent(j.path)}` });
    } finally { setUploading(null); }
  };

  const saveConfig = async () => {
    const clean = spaces.map((s) => ({ ...s, name: s.name.trim() })).filter((s) => s.name);
    const res = await fetch("/api/admin/space-rental", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spaces: clean, calendarId: calendarId.trim(), approveWebhook: approveWebhook.trim(), pledge }),
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
    if (status === "approved") alert(j.calendarReflected ? "승인되어 구글 캘린더·시트에 반영을 요청했습니다." : "승인되었습니다. (캘린더 자동 반영 웹훅 미설정 — 수동 등록 필요)\n플랫폼 캘린더에는 즉시 반영됩니다.");
  };
  const removeRequest = async (id: string) => {
    if (!confirm("이 신청을 삭제하시겠습니까?")) return;
    setRequests((rs) => rs.filter((r) => r.id !== id));
    setDetail(null);
    await fetch("/api/admin/space-rental", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }).catch(() => {});
  };

  const openDetail = (r: RentalRequest) => { setDetail(r); setMemo(r.adminMemo || ""); };

  if (loading) return <AdminLayout><div className="text-center py-20 text-gray-400">로딩 중...</div></AdminLayout>;

  const TABS: { key: Tab; label: string; icon: typeof ClipboardList }[] = [
    { key: "requests", label: "공간대여 신청목록", icon: ClipboardList },
    { key: "spaces", label: "대여가능공간", icon: MapPin },
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
                      <td className="whitespace-nowrap">{r.date} {r.start}~{r.end}</td>
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
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-400 px-1">
                <span className="flex-1">공간명 (신청자에게 표시)</span>
                <span className="w-24">수용 인원(명)</span>
                <span className="w-36">장소 사진</span>
                <span className="w-4" />
              </div>
              {spaces.map((s, i) => (
                <div key={s.id} className="flex items-center gap-2">
                  <input className="input-field flex-1" value={s.name} onChange={(e) => setSpace(i, { name: e.target.value })} placeholder="공간명 (예: 데이터라이브러리 · 사이버 워룸)" />
                  <input type="number" min={0} className="input-field w-24" value={s.capacity ?? ""} onChange={(e) => setSpace(i, { capacity: e.target.value === "" ? undefined : Number(e.target.value) })} placeholder="예: 30" />
                  <div className="w-36 flex items-center gap-1.5">
                    {s.photo && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.photo} alt="" className="w-9 h-9 rounded object-cover border border-gray-200" />
                    )}
                    <label className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-600 hover:border-indigo-300 cursor-pointer whitespace-nowrap">
                      {uploading === i ? "업로드…" : s.photo ? "변경" : "사진 추가"}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(i, f); e.target.value = ""; }} />
                    </label>
                    {s.photo && <button onClick={() => setSpace(i, { photo: undefined })} className="text-gray-300 hover:text-rose-500 text-xs" title="사진 삭제">✕</button>}
                  </div>
                  <button onClick={() => removeSpace(i)} className="text-gray-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-gray-400 mt-2">※ 신청자에게는 <strong>공간명·수용 인원·사진만</strong> 표시됩니다. 신청자가 장소를 클릭하면 사진을 볼 수 있습니다. (서암관·의생명대 도서실은 대여 공간에서 제외)</p>
          <div className="mt-4 pt-3 border-t border-gray-100 space-y-3">
            <div>
              <label className="label">구글 캘린더 ID (공개 캘린더 · 예약 현황 표시·충돌 검사)</label>
              <input className="input-field font-mono text-xs" value={calendarId} onChange={(e) => setCalendarId(e.target.value)} placeholder="xxxxx@group.calendar.google.com" />
            </div>
            <div>
              <label className="label">승인 시 구글시트·캘린더 자동 반영 웹훅 URL (구글 Apps Script)</label>
              <input className="input-field font-mono text-xs" value={approveWebhook} onChange={(e) => setApproveWebhook(e.target.value)} placeholder="https://script.google.com/macros/s/.../exec" />
              <p className="text-[11px] text-gray-400 mt-1">신청을 <strong>승인</strong>하면 이 웹훅으로 상세 정보를 보내 구글시트·캘린더에 자동 반영합니다. (미설정 시 수동 등록 — 플랫폼 캘린더에는 즉시 반영)</p>
            </div>
            <div>
              <label className="label">서약서 문구</label>
              <textarea className="input-field h-24 resize-none" value={pledge} onChange={(e) => setPledge(e.target.value)} placeholder="공간 사용 서약 내용" />
            </div>
          </div>
        </div>
      )}

      {/* ── 공간대여 캘린더 ── */}
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
            {/* 신청자가 작성한 설문 폼 */}
            <div className="rounded-xl border border-gray-100 divide-y divide-gray-50 text-sm">
              {([
                ["대여 공간", detail.spaceName],
                ["사용일", detail.date],
                ["사용 시간", `${detail.start} ~ ${detail.end}`],
                ["신청자", `${detail.applicantName} (${detail.studentId})`],
                ["연락처", detail.phone || "-"],
                ["이메일", detail.email || "-"],
                ["사용 인원", `${detail.headcount || 0}명`],
                ["사용 목적", detail.purpose || "-"],
                ["서약 동의", detail.agree ? "동의함" : "미동의"],
                ["접수일시", detail.createdAt ? new Date(detail.createdAt).toLocaleString("ko-KR") : "-"],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex gap-3 px-3 py-2">
                  <span className="w-24 shrink-0 text-gray-500">{k}</span>
                  <span className="text-gray-800 break-words whitespace-pre-line">{v}</span>
                </div>
              ))}
            </div>

            {/* 보완요청 메모 */}
            <div className="mt-4">
              <label className="label">관리자 메모 / 보완요청 사유</label>
              <textarea className="input-field h-20 resize-none" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="보완요청 시 신청자에게 안내할 사유를 적어주세요." />
            </div>

            <div className="flex flex-wrap justify-end gap-2 mt-4">
              <button onClick={() => removeRequest(detail.id)} className="btn-secondary text-sm text-gray-500 flex items-center gap-1"><Trash2 className="w-4 h-4" /> 삭제</button>
              <button onClick={() => updateStatus(detail.id, "supplement", memo)} className="text-sm px-3 py-2 rounded-xl font-semibold text-orange-700 bg-orange-100 hover:bg-orange-200 flex items-center gap-1"><PencilLine className="w-4 h-4" /> 보완요청</button>
              <button onClick={() => updateStatus(detail.id, "rejected", memo)} className="text-sm px-3 py-2 rounded-xl font-semibold text-rose-700 bg-rose-100 hover:bg-rose-200 flex items-center gap-1"><Ban className="w-4 h-4" /> 반려</button>
              <button onClick={() => updateStatus(detail.id, "approved", memo)} className="btn-primary text-sm flex items-center gap-1"><Check className="w-4 h-4" /> 승인</button>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">승인하면 플랫폼 캘린더에 즉시 반영되고, 웹훅이 설정된 경우 구글시트·캘린더에도 자동 등록됩니다.</p>
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
  const [f, setF] = useState({ spaceId: "", date: "", start: "", end: "", applicantName: "", studentId: "", phone: "", email: "", headcount: "", purpose: "" });
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!f.spaceId || !f.date || !f.start || !f.end) return alert("공간·사용일·시간을 입력해주세요.");
    if (!f.applicantName.trim() || !f.studentId.trim()) return alert("신청자 이름·학번/소속을 입력해주세요.");
    setBusy(true);
    try {
      const res = await fetch("/api/space-rental", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, headcount: Number(f.headcount) || 0, agree: true }),
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
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label">사용일 <span className="text-red-500">*</span></label><input type="date" className="input-field" value={f.date} onChange={(e) => set("date", e.target.value)} /></div>
            <div><label className="label">시작 <span className="text-red-500">*</span></label><input type="time" className="input-field" value={f.start} onChange={(e) => set("start", e.target.value)} /></div>
            <div><label className="label">종료 <span className="text-red-500">*</span></label><input type="time" className="input-field" value={f.end} onChange={(e) => set("end", e.target.value)} /></div>
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

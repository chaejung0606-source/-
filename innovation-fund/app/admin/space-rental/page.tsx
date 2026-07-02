"use client";
import { useEffect, useState } from "react";
import { Save, Plus, Trash2, CalendarClock, Check, Ban } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import type { RentalSpace, RentalRequest, RentalStatus } from "@/lib/space-rental";

const STATUS_META: Record<RentalStatus, { label: string; badge: string }> = {
  pending: { label: "대기", badge: "bg-amber-100 text-amber-700" },
  approved: { label: "승인", badge: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "반려", badge: "bg-rose-100 text-rose-700" },
};

export default function SpaceRentalAdminPage() {
  const [spaces, setSpaces] = useState<RentalSpace[]>([]);
  const [calendarId, setCalendarId] = useState("");
  const [approveWebhook, setApproveWebhook] = useState("");
  const [pledge, setPledge] = useState("");
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedMsg, setSavedMsg] = useState("");

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

  const setStatus = async (id: string, status: RentalStatus) => {
    setRequests((rs) => rs.map((r) => r.id === id ? { ...r, status } : r));
    await fetch("/api/admin/space-rental", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }),
    }).catch(() => {});
  };
  const removeRequest = async (id: string) => {
    if (!confirm("이 신청을 삭제하시겠습니까?")) return;
    setRequests((rs) => rs.filter((r) => r.id !== id));
    await fetch("/api/admin/space-rental", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
    }).catch(() => {});
  };

  if (loading) return <AdminLayout><div className="text-center py-20 text-gray-400">로딩 중...</div></AdminLayout>;

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-gray-800 mb-1 flex items-center gap-2"><CalendarClock className="w-6 h-6 text-indigo-500" /> 공간대여 신청</h1>
      <p className="text-gray-500 text-sm mb-5">대여 가능한 공간을 등록하고 신청 건을 관리합니다. 구글 캘린더(공개)에 이미 예약된 장소·시간은 신청이 자동 차단됩니다.</p>

      {/* 대여 공간 설정 */}
      <div className="card mb-6">
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
              <span className="w-28">수용 인원(명)</span>
              <span className="w-4" />
            </div>
            {spaces.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <input className="input-field flex-1" value={s.name} onChange={(e) => setSpace(i, { name: e.target.value })} placeholder="공간명 (예: 데이터라이브러리 · 사이버 워룸)" />
                <input type="number" min={0} className="input-field w-28" value={s.capacity ?? ""} onChange={(e) => setSpace(i, { capacity: e.target.value === "" ? undefined : Number(e.target.value) })} placeholder="예: 30" />
                <button onClick={() => removeSpace(i)} className="text-gray-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] text-gray-400 mt-2">※ 신청자에게는 <strong>공간명·수용 인원만</strong> 표시됩니다. (서암관·의생명대 도서실은 대여 공간에서 제외)</p>
        <div className="mt-4 pt-3 border-t border-gray-100 space-y-3">
          <div>
            <label className="label">구글 캘린더 ID (공개 캘린더 · 홈/공간대여에 보기 전용으로 표시)</label>
            <input className="input-field font-mono text-xs" value={calendarId} onChange={(e) => setCalendarId(e.target.value)} placeholder="xxxxx@group.calendar.google.com" />
            <p className="text-[11px] text-gray-400 mt-1">이 캘린더의 예약(이벤트 제목/장소에 공간명 포함)과 시간이 겹치면 신청이 차단됩니다.</p>
          </div>
          <div>
            <label className="label">승인 시 캘린더 자동 반영 웹훅 URL (구글 Apps Script)</label>
            <input className="input-field font-mono text-xs" value={approveWebhook} onChange={(e) => setApproveWebhook(e.target.value)} placeholder="https://script.google.com/macros/s/.../exec" />
            <p className="text-[11px] text-gray-400 mt-1">신청을 <strong>승인</strong>하면 이 웹훅으로 이벤트 생성 요청을 보내 위 구글 캘린더에 자동 등록합니다. (미설정 시 자동 반영 없음 — 수동 등록)</p>
          </div>
          <div>
            <label className="label">서약서 문구</label>
            <textarea className="input-field h-24 resize-none" value={pledge} onChange={(e) => setPledge(e.target.value)} placeholder="공간 사용 서약 내용" />
          </div>
        </div>
      </div>

      {/* 신청 목록 */}
      <div className="card">
        <h2 className="font-bold text-gray-800 mb-3">신청 목록 <span className="text-sm text-gray-400 font-normal">({requests.length})</span></h2>
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
                <th className="whitespace-nowrap">목적</th>
                <th className="whitespace-nowrap">연락처</th>
                <th className="text-center whitespace-nowrap">관리</th>
              </tr></thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td><span className={`badge ${STATUS_META[r.status].badge}`}>{STATUS_META[r.status].label}</span></td>
                    <td className="font-medium whitespace-nowrap">{r.spaceName}</td>
                    <td className="whitespace-nowrap">{r.date} {r.start}~{r.end}</td>
                    <td className="whitespace-nowrap">{r.applicantName} <span className="text-gray-400 text-xs">{r.studentId}</span></td>
                    <td className="text-center">{r.headcount || "-"}</td>
                    <td className="max-w-[200px] truncate text-gray-600" title={r.purpose}>{r.purpose || "-"}</td>
                    <td className="whitespace-nowrap text-gray-600">{r.phone || "-"}</td>
                    <td className="text-center whitespace-nowrap">
                      <div className="inline-flex gap-1">
                        <button onClick={() => setStatus(r.id, "approved")} title="승인" className="p-1 rounded hover:bg-emerald-50 text-emerald-600"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setStatus(r.id, "rejected")} title="반려" className="p-1 rounded hover:bg-rose-50 text-rose-600"><Ban className="w-4 h-4" /></button>
                        <button onClick={() => removeRequest(r.id)} title="삭제" className="p-1 rounded hover:bg-gray-100 text-gray-400"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

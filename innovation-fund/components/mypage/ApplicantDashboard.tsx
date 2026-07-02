"use client";
import { useEffect, useState, useCallback } from "react";
import { Bell, ChevronLeft, ChevronRight, ClipboardCheck, Check, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fromRow } from "@/lib/app-mapper";
import type { Application } from "@/types";
import { statusMeta, DEFAULT_STATUS_CONFIG, type StatusConfig } from "@/lib/status-config";
import type { AdminNotification } from "@/lib/notifications";

// 신청자 로그인 시 왼쪽에 뜨는 '조그맣고 간단한' 신청상태 대시보드.
// 현재 신청 현황 요약 + 관리자 요청 건(알림)을 확인/수행할 수 있다.
export default function ApplicantDashboard() {
  const [ready, setReady] = useState(false);
  const [apps, setApps] = useState<Application[]>([]);
  const [notis, setNotis] = useState<AdminNotification[]>([]);
  const [cfg, setCfg] = useState<StatusConfig>(DEFAULT_STATUS_CONFIG);
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) { setReady(false); return; }
    const { data } = await supabase
      .from("applications").select("*").eq("applicant_id", user.id).order("created_at", { ascending: false });
    setApps((data || []).map(fromRow));

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      try {
        const r = await fetch("/api/notifications", { headers: { Authorization: `Bearer ${session.access_token}` } });
        const j = await r.json().catch(() => []);
        setNotis(Array.isArray(j) ? j : []);
      } catch { /* noop */ }
    }
    setReady(true);
  }, []);

  useEffect(() => {
    fetch("/api/admin/status-config").then((r) => r.json()).then(setCfg).catch(() => {});
    load();
  }, [load]);

  const ack = async (id: string, action: "read" | "done" | "undone") => {
    setBusy(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const now = new Date().toISOString();
      // 낙관적 업데이트
      setNotis((ns) => ns.map((n) => n.id === id
        ? { ...n, readAt: n.readAt || now, doneAt: action === "done" ? now : action === "undone" ? null : n.doneAt }
        : n));
      await fetch("/api/notifications/ack", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ id, action }),
      });
    } finally { setBusy(null); }
  };

  // 대시보드가 열린 채 준비되면 미열람 요청 건을 열람 처리 (관리자에게 '읽음' 표시)
  useEffect(() => {
    if (!ready || !open) return;
    notis.filter((n) => !n.readAt).forEach((n) => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.access_token) return;
        fetch("/api/notifications/ack", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ id: n.id, action: "read" }),
        }).catch(() => {});
      });
    });
  }, [ready, open, notis]);

  if (!ready) return null;

  const submitted = apps.filter((a) => !a.isDraft && !a.canceled);
  const drafts = apps.filter((a) => a.isDraft && !a.canceled);
  const supplement = submitted.filter((a) => a.reviewStatus === "supplement").length;
  const approved = submitted.filter((a) => a.reviewStatus === "approved").length;
  const inReview = submitted.filter((a) => !["approved", "rejected"].includes(a.reviewStatus)).length;

  const pending = notis.filter((n) => !n.doneAt);
  const done = notis.filter((n) => n.doneAt);
  const badgeCount = pending.length;

  // 접힘: 작은 종 버튼(요청 건수 배지)
  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); pending.filter((n) => !n.readAt).forEach((n) => ack(n.id, "read")); }}
        className="fixed left-3 bottom-4 z-40 glass-pill h-11 pl-3 pr-3.5 flex items-center gap-2 text-sm font-semibold text-gray-700 shadow-lg hover:text-indigo-600 transition-colors"
        title="내 신청 현황 열기"
      >
        <span className="relative">
          <Bell className="w-5 h-5" />
          {badgeCount > 0 && (
            <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">{badgeCount}</span>
          )}
        </span>
        현황
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </button>
    );
  }

  return (
    <div className="fixed left-3 bottom-4 z-40 w-[248px] max-w-[calc(100vw-1.5rem)]">
      <div className="rounded-2xl border border-gray-200 bg-white/95 backdrop-blur shadow-xl overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white">
          <div className="flex items-center gap-1.5 text-sm font-bold">
            <ClipboardCheck className="w-4 h-4" /> 내 신청 현황
          </div>
          <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white" title="접기">
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          {/* 상태 요약 */}
          <div className="px-3 py-2.5 grid grid-cols-2 gap-1.5 border-b border-gray-100">
            <Stat label="제출" value={submitted.length} tone="bg-gray-100 text-gray-700" />
            <Stat label="검토중" value={inReview} tone="bg-blue-100 text-blue-700" />
            <Stat label="승인" value={approved} tone="bg-emerald-100 text-emerald-700" />
            <Stat label="보완요청" value={supplement} tone={supplement > 0 ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-400"} />
            {drafts.length > 0 && <Stat label="임시저장" value={drafts.length} tone="bg-amber-100 text-amber-700" />}
          </div>

          {/* 관리자 요청 건 */}
          <div className="px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-2">
              <Bell className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-xs font-bold text-gray-700">관리자 요청 건</span>
              {badgeCount > 0 && <span className="ml-auto text-[10px] font-bold text-rose-600 bg-rose-50 rounded-full px-1.5 py-0.5">확인 필요 {badgeCount}</span>}
            </div>

            {notis.length === 0 ? (
              <p className="text-[11px] text-gray-400 py-2 text-center">관리자 요청 건이 없습니다.</p>
            ) : (
              <div className="space-y-1.5">
                {pending.map((n) => (
                  <NotiCard key={n.id} n={n} busy={busy === n.id} onDone={() => ack(n.id, "done")} />
                ))}
                {done.length > 0 && (
                  <details className="mt-1">
                    <summary className="text-[11px] text-gray-400 cursor-pointer select-none py-1">확인 완료 {done.length}건</summary>
                    <div className="space-y-1.5 mt-1">
                      {done.map((n) => (
                        <NotiCard key={n.id} n={n} busy={busy === n.id} onUndo={() => ack(n.id, "undone")} doneView />
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`rounded-lg px-2 py-1.5 flex items-center justify-between ${tone}`}>
      <span className="text-[11px] font-medium">{label}</span>
      <span className="text-sm font-extrabold">{value}</span>
    </div>
  );
}

function NotiCard({ n, busy, onDone, onUndo, doneView }: {
  n: AdminNotification; busy: boolean; onDone?: () => void; onUndo?: () => void; doneView?: boolean;
}) {
  const date = n.createdAt ? new Date(n.createdAt).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }) : "";
  return (
    <div className={`rounded-xl border px-2.5 py-2 ${doneView ? "border-gray-100 bg-gray-50/70 opacity-80" : "border-indigo-100 bg-indigo-50/60"}`}>
      <div className="flex items-start gap-1.5">
        <div className="min-w-0 flex-1">
          {n.title && <div className="text-xs font-bold text-gray-800 break-words">{n.title}</div>}
          {n.body && <div className="text-[11px] text-gray-600 whitespace-pre-line break-words mt-0.5 leading-snug">{n.body}</div>}
          <div className="text-[10px] text-gray-400 mt-1">
            {n.receiptNumber ? `접수 ${n.receiptNumber} · ` : ""}{date}
            {doneView && n.doneAt ? " · ✔ 확인함" : ""}
          </div>
        </div>
      </div>
      {doneView ? (
        <button onClick={onUndo} disabled={busy} className="mt-1.5 w-full text-[11px] text-gray-500 hover:text-indigo-600 border border-gray-200 rounded-lg py-1 flex items-center justify-center gap-1 disabled:opacity-50">
          <X className="w-3 h-3" /> 확인 취소
        </button>
      ) : (
        <button onClick={onDone} disabled={busy} className="mt-1.5 w-full text-[11px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg py-1 flex items-center justify-center gap-1 disabled:opacity-50">
          <Check className="w-3 h-3" /> 확인 완료
        </button>
      )}
    </div>
  );
}

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin, requireExpense } from "@/lib/admin-auth";
import {
  SPACES_KEY, REQUESTS_KEY, CONFIG_KEY, DEFAULT_CALENDAR_ID, DEFAULT_SPACES, DEFAULT_PLEDGE,
  normalizeSpaces, normalizeRequests, type RentalRequest,
} from "@/lib/space-rental";

export const dynamic = "force-dynamic";

interface RentalConfig { calendarId?: string; approveWebhook?: string; pledge?: string; }
async function getConfig(admin: ReturnType<typeof supabaseAdmin>): Promise<RentalConfig> {
  const { data } = await admin.from("app_config").select("value").eq("key", CONFIG_KEY).maybeSingle();
  return (data?.value && typeof data.value === "object") ? data.value as RentalConfig : {};
}

// 승인 시 구글 캘린더에 자동 반영 — 구글 Apps Script 웹훅으로 이벤트 생성 요청(설정된 경우에만)
async function pushToCalendar(webhook: string | undefined, r: RentalRequest): Promise<string | undefined> {
  if (!webhook) return undefined;
  try {
    const res = await fetch(webhook, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        // 캘린더 이벤트
        title: `[공간대여] ${r.spaceName} · ${r.applicantName}`,
        location: r.spaceName,
        date: r.date, start: r.start, end: r.end,
        description: `신청자: ${r.applicantName} (${r.studentId})\n인원: ${r.headcount}명\n목적: ${r.purpose}\n연락처: ${r.phone}`,
        // 구글시트 반영용 상세 필드
        spaceName: r.spaceName, applicantName: r.applicantName, studentId: r.studentId,
        phone: r.phone, email: r.email, headcount: r.headcount, purpose: r.purpose,
        createdAt: r.createdAt,
      }),
    });
    const j = await res.json().catch(() => ({}));
    return j.eventId ? String(j.eventId) : undefined;
  } catch { return undefined; }
}

// 관리자: 장소 목록·설정·접수 신청 조회
export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = supabaseAdmin();
  const [{ data: sp }, { data: rq }] = await Promise.all([
    admin.from("app_config").select("value").eq("key", SPACES_KEY).maybeSingle(),
    admin.from("app_config").select("value").eq("key", REQUESTS_KEY).maybeSingle(),
  ]);
  const cfg = await getConfig(admin);
  const saved = normalizeSpaces(sp?.value);
  return NextResponse.json({
    spaces: saved.length ? saved : DEFAULT_SPACES,
    calendarId: cfg.calendarId || DEFAULT_CALENDAR_ID,
    approveWebhook: cfg.approveWebhook || "",
    pledge: cfg.pledge || DEFAULT_PLEDGE,
    requests: normalizeRequests(rq?.value).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
  });
}

// 관리자: 장소 목록·캘린더/웹훅/서약서 설정 저장
export async function POST(req: NextRequest) {
  if (!(await requireExpense(req))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const admin = supabaseAdmin();
  if (Array.isArray(b.spaces)) {
    const spaces = normalizeSpaces(b.spaces);
    const { error } = await admin.from("app_config").upsert({ key: SPACES_KEY, value: spaces }, { onConflict: "key" });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (b.calendarId != null || b.approveWebhook != null || b.pledge != null) {
    const cur = await getConfig(admin);
    const value: RentalConfig = {
      calendarId: (b.calendarId != null ? String(b.calendarId).trim() : cur.calendarId) || DEFAULT_CALENDAR_ID,
      approveWebhook: b.approveWebhook != null ? String(b.approveWebhook).trim() : cur.approveWebhook,
      pledge: (b.pledge != null ? String(b.pledge) : cur.pledge) || DEFAULT_PLEDGE,
    };
    await admin.from("app_config").upsert({ key: CONFIG_KEY, value }, { onConflict: "key" });
  }
  return NextResponse.json({ ok: true });
}

// 관리자: 신청 상태 변경(승인/반려/메모) — 승인 시 구글 캘린더 자동 반영
export async function PATCH(req: NextRequest) {
  if (!(await requireExpense(req))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const id = String(b.id || "");
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  const admin = supabaseAdmin();
  const { data } = await admin.from("app_config").select("value").eq("key", REQUESTS_KEY).maybeSingle();
  const list = normalizeRequests(data?.value);
  const target = list.find((r) => r.id === id);
  const newStatus = ["pending", "approved", "rejected", "supplement"].includes(String(b.status)) ? String(b.status) : undefined;

  // 대기→승인 전환 시 캘린더에 이벤트 생성(웹훅 설정된 경우)
  let eventId: string | undefined;
  if (target && newStatus === "approved" && target.status !== "approved" && !target.calendarEventId) {
    const cfg = await getConfig(admin);
    eventId = await pushToCalendar(cfg.approveWebhook, target);
  }

  const next = list.map((r) => r.id === id ? {
    ...r,
    status: (newStatus || r.status) as RentalRequest["status"],
    adminMemo: b.adminMemo != null ? String(b.adminMemo) : r.adminMemo,
    calendarEventId: eventId || r.calendarEventId,
  } : r);
  const { error } = await admin.from("app_config").upsert({ key: REQUESTS_KEY, value: next }, { onConflict: "key" });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, calendarReflected: !!eventId });
}

// 관리자: 신청 삭제
export async function DELETE(req: NextRequest) {
  if (!(await requireExpense(req))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const id = String(b.id || "");
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  const admin = supabaseAdmin();
  const { data } = await admin.from("app_config").select("value").eq("key", REQUESTS_KEY).maybeSingle();
  const next = normalizeRequests(data?.value).filter((r) => r.id !== id);
  const { error } = await admin.from("app_config").upsert({ key: REQUESTS_KEY, value: next }, { onConflict: "key" });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

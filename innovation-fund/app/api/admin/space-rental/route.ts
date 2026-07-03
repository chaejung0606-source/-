import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin, requireMenu } from "@/lib/admin-auth";
import {
  SPACES_KEY, REQUESTS_KEY, CONFIG_KEY, DEFAULT_CALENDAR_ID, DEFAULT_SPACES,
  normalizeSpaces, normalizeRequests, slotInt, type RentalRequest,
} from "@/lib/space-rental";
import type { FormSchema } from "@/lib/form-schema";

export const dynamic = "force-dynamic";

interface RentalConfig { calendarId?: string; approveWebhook?: string; form?: FormSchema; resultForm?: FormSchema; }
async function getConfig(admin: ReturnType<typeof supabaseAdmin>): Promise<RentalConfig> {
  const { data } = await admin.from("app_config").select("value").eq("key", CONFIG_KEY).maybeSingle();
  return (data?.value && typeof data.value === "object") ? data.value as RentalConfig : {};
}

// 웹훅 payload (캘린더 이벤트 + 구글시트 상세)
function calendarPayload(action: "create" | "update" | "delete", r: RentalRequest) {
  return {
    action,
    eventId: r.calendarEventId || "",
    title: `[공간대여] ${r.spaceName} · ${r.applicantName}`,
    location: r.spaceName,
    date: r.date, start: r.start, end: r.end,
    description: `신청자: ${r.applicantName} (${r.studentId})\n인원: ${r.headcount}명\n목적: ${r.purpose}\n연락처: ${r.phone}`,
    spaceName: r.spaceName, applicantName: r.applicantName, studentId: r.studentId,
    phone: r.phone, email: r.email, headcount: r.headcount, purpose: r.purpose,
    createdAt: r.createdAt,
  };
}
// 구글 Apps Script 웹훅 호출 — create/update 시 eventId 반환. 웹훅 미설정 시 undefined.
async function callWebhook(webhook: string | undefined, action: "create" | "update" | "delete", r: RentalRequest): Promise<string | undefined> {
  if (!webhook) return undefined;
  try {
    const res = await fetch(webhook, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(calendarPayload(action, r)),
    });
    const j = await res.json().catch(() => ({}));
    return j.eventId ? String(j.eventId) : undefined;
  } catch { return undefined; }
}
const pushToCalendar = (webhook: string | undefined, r: RentalRequest) => callWebhook(webhook, "create", r);

async function saveRequests(admin: ReturnType<typeof supabaseAdmin>, list: RentalRequest[]) {
  return admin.from("app_config").upsert({ key: REQUESTS_KEY, value: list }, { onConflict: "key" });
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
    form: cfg.form || null,
    resultForm: cfg.resultForm || null,
    requests: normalizeRequests(rq?.value).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
  });
}

// 관리자: 장소·설정 저장
export async function POST(req: NextRequest) {
  // 공간대여 폼 저장은 '신청폼 편집'에서도 이뤄지므로 두 메뉴 권한 모두 허용
  if (!(await requireMenu(req, ["/admin/space-rental", "/admin/programs"]))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const admin = supabaseAdmin();

  if (Array.isArray(b.spaces)) {
    const spaces = normalizeSpaces(b.spaces);
    const { error } = await admin.from("app_config").upsert({ key: SPACES_KEY, value: spaces }, { onConflict: "key" });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (b.calendarId != null || b.approveWebhook != null || b.form != null || b.resultForm != null) {
    const cur = await getConfig(admin);
    const value: RentalConfig = {
      calendarId: (b.calendarId != null ? String(b.calendarId).trim() : cur.calendarId) || DEFAULT_CALENDAR_ID,
      approveWebhook: b.approveWebhook != null ? String(b.approveWebhook).trim() : cur.approveWebhook,
      form: b.form != null ? (b.form as FormSchema) : cur.form,
      resultForm: b.resultForm != null ? (b.resultForm as FormSchema) : cur.resultForm,
    };
    await admin.from("app_config").upsert({ key: CONFIG_KEY, value }, { onConflict: "key" });
  }
  return NextResponse.json({ ok: true });
}

// 관리자: 신청 상태 변경(승인/반려/메모) 또는 신청 내용 편집(edit) — 구글 캘린더·시트 자동 반영
export async function PATCH(req: NextRequest) {
  if (!(await requireMenu(req, "/admin/space-rental"))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const id = String(b.id || "");
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  const admin = supabaseAdmin();
  const { data } = await admin.from("app_config").select("value").eq("key", REQUESTS_KEY).maybeSingle();
  const list = normalizeRequests(data?.value);
  const target = list.find((r) => r.id === id);
  if (!target) return NextResponse.json({ ok: false, error: "신청을 찾을 수 없습니다." }, { status: 404 });
  const cfg = await getConfig(admin);

  // ── 신청 내용 편집 ── (구글 캘린더·시트 반영)
  if (b.edit && typeof b.edit === "object") {
    const e = b.edit as Record<string, unknown>;
    const str = (k: string, cur: string) => e[k] != null ? String(e[k]) : cur;
    const edited: RentalRequest = {
      ...target,
      spaceName: str("spaceName", target.spaceName),
      spaceId: str("spaceId", target.spaceId),
      date: str("date", target.date), start: str("start", target.start), end: str("end", target.end),
      applicantName: str("applicantName", target.applicantName), studentId: str("studentId", target.studentId),
      phone: str("phone", target.phone), email: str("email", target.email),
      purpose: str("purpose", target.purpose),
      headcount: e.headcount != null ? Number(e.headcount) || 0 : target.headcount,
    };
    // 같은 날 예약인데 종료가 시작보다 빠르면 반려(여러 날 범위는 endDate가 있어 예외)
    if (!edited.endDate && /^\d{4}-\d{2}-\d{2}$/.test(edited.date) && /^\d{2}:\d{2}$/.test(edited.start) && /^\d{2}:\d{2}$/.test(edited.end)
      && slotInt(edited.date, edited.end) <= slotInt(edited.date, edited.start)) {
      return NextResponse.json({ ok: false, error: "종료 일시가 시작 일시보다 늦어야 합니다." }, { status: 400 });
    }
    // 캘린더/시트 반영: 이벤트가 이미 있으면 update, 없으면(승인건이면) create
    let calendarReflected = false, newEventId = edited.calendarEventId;
    if (cfg.approveWebhook) {
      if (edited.calendarEventId) {
        await callWebhook(cfg.approveWebhook, "update", edited);
        calendarReflected = true;
      } else if (edited.status === "approved") {
        const ev = await callWebhook(cfg.approveWebhook, "create", edited);
        if (ev) { newEventId = ev; calendarReflected = true; }
      }
    }
    edited.calendarEventId = newEventId;
    const next = list.map((r) => r.id === id ? edited : r);
    const { error } = await saveRequests(admin, next);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, calendarReflected });
  }

  // ── 상태 변경 ──
  const newStatus = ["pending", "approved", "rejected", "supplement"].includes(String(b.status)) ? String(b.status) : undefined;
  let eventId: string | undefined;
  if (newStatus === "approved" && target.status !== "approved" && !target.calendarEventId) {
    eventId = await pushToCalendar(cfg.approveWebhook, target);
  }
  const next = list.map((r) => r.id === id ? {
    ...r,
    status: (newStatus || r.status) as RentalRequest["status"],
    adminMemo: b.adminMemo != null ? String(b.adminMemo) : r.adminMemo,
    calendarEventId: eventId || r.calendarEventId,
  } : r);
  const { error } = await saveRequests(admin, next);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, calendarReflected: !!eventId });
}

// 관리자: 신청 삭제 (캘린더 이벤트가 있으면 캘린더에서도 삭제 요청)
export async function DELETE(req: NextRequest) {
  if (!(await requireMenu(req, "/admin/space-rental"))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const id = String(b.id || "");
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  const admin = supabaseAdmin();
  const { data } = await admin.from("app_config").select("value").eq("key", REQUESTS_KEY).maybeSingle();
  const list = normalizeRequests(data?.value);
  const target = list.find((r) => r.id === id);
  if (target?.calendarEventId) {
    const cfg = await getConfig(admin);
    await callWebhook(cfg.approveWebhook, "delete", target);
  }
  const next = list.filter((r) => r.id !== id);
  const { error } = await saveRequests(admin, next);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

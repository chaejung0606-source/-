import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin, requireExpense } from "@/lib/admin-auth";
import {
  SPACES_KEY, REQUESTS_KEY, CONFIG_KEY, DEFAULT_CALENDAR_ID,
  normalizeSpaces, normalizeRequests,
} from "@/lib/space-rental";

export const dynamic = "force-dynamic";

// 관리자: 장소 목록·설정·접수 신청 조회
export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = supabaseAdmin();
  const [{ data: sp }, { data: cf }, { data: rq }] = await Promise.all([
    admin.from("app_config").select("value").eq("key", SPACES_KEY).maybeSingle(),
    admin.from("app_config").select("value").eq("key", CONFIG_KEY).maybeSingle(),
    admin.from("app_config").select("value").eq("key", REQUESTS_KEY).maybeSingle(),
  ]);
  return NextResponse.json({
    spaces: normalizeSpaces(sp?.value),
    calendarId: (cf?.value as { calendarId?: string })?.calendarId || DEFAULT_CALENDAR_ID,
    requests: normalizeRequests(rq?.value).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
  });
}

// 관리자: 장소 목록·캘린더 설정 저장
export async function POST(req: NextRequest) {
  if (!(await requireExpense(req))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const admin = supabaseAdmin();
  if (Array.isArray(b.spaces)) {
    const spaces = normalizeSpaces(b.spaces);
    const { error } = await admin.from("app_config").upsert({ key: SPACES_KEY, value: spaces }, { onConflict: "key" });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (typeof b.calendarId === "string") {
    await admin.from("app_config").upsert({ key: CONFIG_KEY, value: { calendarId: b.calendarId.trim() || DEFAULT_CALENDAR_ID } }, { onConflict: "key" });
  }
  return NextResponse.json({ ok: true });
}

// 관리자: 신청 상태 변경(승인/반려/메모)
export async function PATCH(req: NextRequest) {
  if (!(await requireExpense(req))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const id = String(b.id || "");
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  const admin = supabaseAdmin();
  const { data } = await admin.from("app_config").select("value").eq("key", REQUESTS_KEY).maybeSingle();
  const list = normalizeRequests(data?.value);
  const next = list.map((r) => r.id === id ? {
    ...r,
    status: (["pending", "approved", "rejected"].includes(String(b.status)) ? b.status : r.status),
    adminMemo: b.adminMemo != null ? String(b.adminMemo) : r.adminMemo,
  } : r);
  const { error } = await admin.from("app_config").upsert({ key: REQUESTS_KEY, value: next }, { onConflict: "key" });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
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

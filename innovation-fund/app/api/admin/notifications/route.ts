import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireMenu } from "@/lib/admin-auth";
import { NOTIFICATIONS_KEY, normalizeNotifications, type AdminNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

async function readAll(): Promise<AdminNotification[]> {
  const { data } = await supabaseAdmin().from("app_config").select("value").eq("key", NOTIFICATIONS_KEY).maybeSingle();
  return normalizeNotifications(data?.value);
}
async function writeAll(list: AdminNotification[]): Promise<string | null> {
  const { error } = await supabaseAdmin().from("app_config").upsert({ key: NOTIFICATIONS_KEY, value: list }, { onConflict: "key" });
  return error ? error.message : null;
}

// 관리자: 보낸 알림 조회 (?studentId= 로 특정 학생만)
export async function GET(req: NextRequest) {
  if (!(await requireMenu(req, "/admin/applicants"))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sid = (req.nextUrl.searchParams.get("studentId") || "").trim();
  const all = await readAll();
  const rows = (sid ? all.filter((n) => n.studentId === sid) : all)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return NextResponse.json(rows);
}

// 관리자: 알림(요청 건) 보내기
// body: { studentIds: string[], title, body, applicationId?, receiptNumber? }
export async function POST(req: NextRequest) {
  const session = await requireMenu(req, "/admin/applicants");
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const studentIds: string[] = Array.isArray(b.studentIds)
    ? b.studentIds.map((s: unknown) => String(s || "").trim()).filter(Boolean)
    : [];
  const title = String(b.title || "").trim();
  const body = String(b.body || "").trim();
  if (!studentIds.length) return NextResponse.json({ ok: false, error: "수신 학생을 지정해주세요." }, { status: 400 });
  if (!title && !body) return NextResponse.json({ ok: false, error: "제목 또는 내용을 입력해주세요." }, { status: 400 });

  const admin = supabaseAdmin();
  // 수신 학생들의 uid/이름을 학번으로 조회 (없어도 학번 매칭으로 전달됨)
  const { data: profs } = await admin
    .from("student_profiles").select("id, student_id, name").in("student_id", studentIds);
  const byId = new Map<string, { id: string; name?: string }>();
  (profs || []).forEach((p) => byId.set(String(p.student_id), { id: String(p.id), name: p.name ? String(p.name) : undefined }));

  const now = new Date().toISOString();
  const applicationId = b.applicationId ? String(b.applicationId) : undefined;
  const receiptNumber = b.receiptNumber ? String(b.receiptNumber) : undefined;
  const additions: AdminNotification[] = studentIds.map((sid) => ({
    id: crypto.randomUUID(),
    studentId: sid,
    applicantId: byId.get(sid)?.id,
    name: byId.get(sid)?.name,
    title, body, applicationId, receiptNumber,
    createdAt: now,
    createdBy: session.id,
    readAt: null,
    doneAt: null,
  }));

  const all = await readAll();
  const err = await writeAll([...additions, ...all]);
  if (err) return NextResponse.json({ ok: false, error: err }, { status: 500 });
  return NextResponse.json({ ok: true, count: additions.length });
}

// 관리자: 보낸 알림 회수(삭제)
export async function DELETE(req: NextRequest) {
  if (!(await requireMenu(req, "/admin/applicants"))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const id = String(b.id || "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  const all = await readAll();
  const err = await writeAll(all.filter((n) => n.id !== id));
  if (err) return NextResponse.json({ ok: false, error: err }, { status: 500 });
  return NextResponse.json({ ok: true });
}

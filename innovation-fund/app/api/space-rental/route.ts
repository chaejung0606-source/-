import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  SPACES_KEY, REQUESTS_KEY, CONFIG_KEY, DEFAULT_CALENDAR_ID,
  normalizeSpaces, normalizeRequests, fetchCalendarSlots, slotInt, overlaps, textMatchesSpace,
  type BookedSlot,
} from "@/lib/space-rental";

export const dynamic = "force-dynamic";

async function readConfig() {
  const admin = supabaseAdmin();
  const [{ data: sp }, { data: cf }, { data: rq }] = await Promise.all([
    admin.from("app_config").select("value").eq("key", SPACES_KEY).maybeSingle(),
    admin.from("app_config").select("value").eq("key", CONFIG_KEY).maybeSingle(),
    admin.from("app_config").select("value").eq("key", REQUESTS_KEY).maybeSingle(),
  ]);
  const spaces = normalizeSpaces(sp?.value);
  const calendarId = (cf?.value && typeof cf.value === "object" && (cf.value as { calendarId?: string }).calendarId) || DEFAULT_CALENDAR_ID;
  const requests = normalizeRequests(rq?.value);
  return { admin, spaces, calendarId, requests };
}

// 접수된(대기·승인) 신청을 겹침 판정용 슬롯으로
function requestSlots(requests: ReturnType<typeof normalizeRequests>): BookedSlot[] {
  return requests.filter((r) => r.status !== "rejected").map((r) => ({
    start: slotInt(r.date, r.start), end: slotInt(r.date, r.end),
    label: `${r.spaceName} 신청(${r.status === "approved" ? "승인" : "대기"})`, source: "request" as const, spaceName: r.spaceName,
  }));
}

// 공개: 대여 장소 목록 + 이미 예약된 슬롯(캘린더 + 접수건)
export async function GET() {
  const { spaces, calendarId, requests } = await readConfig();
  let calendar: BookedSlot[] = [];
  let calendarError = false;
  try { calendar = await fetchCalendarSlots(calendarId); } catch { calendarError = true; }
  const booked = [...calendar, ...requestSlots(requests)];
  return NextResponse.json({ spaces, booked, calendarError });
}

// 신청자: 공간대여 신청 (로그인 필요, 서버측 충돌 검증)
export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: { user } } = await anon.auth.getUser(token);
  if (!user) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const spaceId = String(b.spaceId || "");
  const date = String(b.date || "");
  const start = String(b.start || "");
  const end = String(b.end || "");
  const purpose = String(b.purpose || "").trim();
  const headcount = Number(b.headcount) || 0;
  const applicantName = String(b.applicantName || "").trim();
  const studentId = String(b.studentId || "").trim();

  const { admin, spaces, calendarId, requests } = await readConfig();
  const space = spaces.find((s) => s.id === spaceId);
  if (!space) return NextResponse.json({ ok: false, error: "대여 장소를 선택해주세요." }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end))
    return NextResponse.json({ ok: false, error: "날짜와 시간을 정확히 입력해주세요." }, { status: 400 });
  const reqStart = slotInt(date, start), reqEnd = slotInt(date, end);
  if (reqEnd <= reqStart) return NextResponse.json({ ok: false, error: "종료 시간이 시작 시간보다 늦어야 합니다." }, { status: 400 });
  if (!applicantName || !studentId) return NextResponse.json({ ok: false, error: "신청자 정보를 입력해주세요." }, { status: 400 });

  // 충돌 검증: 캘린더 예약 + 접수건 중 같은 장소·시간 겹침
  let calendar: BookedSlot[] = [];
  try { calendar = await fetchCalendarSlots(calendarId); } catch { /* 캘린더 접근 실패 시 접수건만으로 검증 */ }
  const all = [...calendar, ...requestSlots(requests)];
  const conflict = all.find((s) => overlaps(reqStart, reqEnd, s.start, s.end)
    && (s.source === "request" ? s.spaceName === space.name : textMatchesSpace(s.label, space.name)));
  if (conflict) return NextResponse.json({ ok: false, error: "이미 신청된 시간대입니다. 다른 시간을 선택해주세요.", conflict: conflict.label }, { status: 409 });

  const now = new Date().toISOString();
  const entry = {
    id: crypto.randomUUID(), spaceId, spaceName: space.name, date, start, end,
    applicantName, studentId, phone: String(b.phone || "").trim(), email: String(b.email || "").trim(),
    purpose, headcount, status: "pending" as const, createdAt: now, applicantId: user.id,
  };
  const next = [entry, ...requests];
  const { error } = await admin.from("app_config").upsert({ key: REQUESTS_KEY, value: next }, { onConflict: "key" });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

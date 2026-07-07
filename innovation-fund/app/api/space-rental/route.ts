import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  SPACES_KEY, REQUESTS_KEY, CONFIG_KEY, DEFAULT_CALENDAR_ID, DEFAULT_SPACES,
  normalizeSpaces, normalizeRequests, normalizeFiles, fetchCalendarSlots, slotInt, overlaps, textMatchesSpace,
  calendarEmbedUrl, deriveBooking,
  type BookedSlot,
} from "@/lib/space-rental";
import type { FormSchema } from "@/lib/form-schema";

export const dynamic = "force-dynamic";

async function readConfig() {
  const admin = supabaseAdmin();
  const [{ data: sp }, { data: cf }, { data: rq }] = await Promise.all([
    admin.from("app_config").select("value").eq("key", SPACES_KEY).maybeSingle(),
    admin.from("app_config").select("value").eq("key", CONFIG_KEY).maybeSingle(),
    admin.from("app_config").select("value").eq("key", REQUESTS_KEY).maybeSingle(),
  ]);
  // 관리자가 저장한 장소가 없으면 인프라 시트 기준 기본 장소 사용
  const saved = normalizeSpaces(sp?.value);
  const spaces = saved.length ? saved : DEFAULT_SPACES;
  const cfg = (cf?.value && typeof cf.value === "object") ? cf.value as { calendarId?: string; form?: FormSchema; resultForm?: FormSchema; approveWebhook?: string } : {};
  const calendarId = cfg.calendarId || DEFAULT_CALENDAR_ID;
  const form = cfg.form || null;
  const resultForm = cfg.resultForm || null;
  const requests = normalizeRequests(rq?.value);
  return { admin, spaces, calendarId, form, resultForm, approveWebhook: cfg.approveWebhook, requests };
}

// 장소명이 서로 가리키는 같은 공간인지(정규화 후 동일하거나 한쪽이 다른 쪽을 포함)
function sameSpace(a: string, b: string): boolean {
  const norm = (s: string) => (s || "").toLowerCase().replace(/\s+/g, "");
  const x = norm(a), y = norm(b);
  return !!x && !!y && (x === y || x.includes(y) || y.includes(x));
}

// 접수된(대기·승인) 신청을 겹침 판정용 슬롯으로 (날짜·시간이 있는 건만)
function requestSlots(requests: ReturnType<typeof normalizeRequests>): BookedSlot[] {
  return requests
    .filter((r) => r.status !== "rejected" && /^\d{4}-\d{2}-\d{2}$/.test(r.date) && /^\d{2}:\d{2}$/.test(r.start) && /^\d{2}:\d{2}$/.test(r.end))
    .map((r) => ({
      start: slotInt(r.date, r.start), end: slotInt(r.endDate || r.date, r.end),
      label: `${r.spaceName} 신청(${r.status === "approved" ? "승인" : "대기"})`, source: "request" as const, spaceName: r.spaceName,
    }));
}

// 공개: 대여 장소 목록(수용인원만) + 이미 예약된 슬롯(캘린더 + 접수건) + 캘린더 임베드 URL
// + 이용결과 제출용 신청목록(개인 연락처 등 민감정보 제외, 학번은 일부 마스킹)
export async function GET() {
  const { spaces, calendarId, form, resultForm, requests } = await readConfig();
  let calendar: BookedSlot[] = [];
  let calendarError = false;
  try { calendar = await fetchCalendarSlots(calendarId); } catch { calendarError = true; }
  const booked = [...calendar, ...requestSlots(requests)];
  // 신청자에게는 이름·수용인원·사진만 노출 (그 외 세부정보 비공개)
  const publicSpaces = spaces.map((s) => ({ id: s.id, name: s.name, capacity: s.capacity, photos: s.photos }));
  const publicRequests = requests
    .filter((r) => r.status !== "rejected" && !r.hideFromResults)
    .map((r) => ({
      id: r.id, spaceName: r.spaceName, date: r.date, endDate: r.endDate, start: r.start, end: r.end,
      applicantName: r.applicantName,
      studentId: r.studentId ? r.studentId.slice(0, 4) + "*".repeat(Math.max(0, r.studentId.length - 4)) : "",
      status: r.status, hasResult: !!r.usageResult, createdAt: r.createdAt,
    }));
  return NextResponse.json({ spaces: publicSpaces, booked, calendarError, form, resultForm, requests: publicRequests, calendarEmbedUrl: calendarEmbedUrl(calendarId) });
}

// 신청자: 공간대여 신청 — 로그인 불필요(공개). 서버측 충돌 검증.
// 두 가지 입력 방식 지원:
//  (1) 기본 폼: spaceId·date·start·end 등을 직접 전송
//  (2) 관리자 폼만: answers만 전송 → 관리자 폼의 bookingRole 태그로 장소·날짜·시간 추출
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));

  // ── 이용결과 제출: 신청목록에서 건을 선택해 이용자 명단·서명·사진·서류 저장 ──
  if (b.action === "submitResult") {
    const id = String(b.requestId || "");
    const users = Array.isArray(b.users) ? b.users.filter((u: unknown) => !!u && typeof u === "object").map((u: Record<string, unknown>) => ({ name: String(u.name || "").trim(), signature: String(u.signature || "") })).filter((u: { name: string }) => u.name) : [];
    const photos = Array.isArray(b.photos) ? b.photos.map(String).filter(Boolean) : [];
    const rAnswers = Array.isArray(b.answers) ? b.answers.filter((a: unknown) => !!a && typeof a === "object").map((a: Record<string, unknown>) => ({ id: String(a.id || ""), label: String(a.label || ""), value: String(a.value || "") })).filter((a: { value: string }) => a.value) : [];
    const rFiles = normalizeFiles(b.files);
    if (!id) return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
    if (users.length === 0 && photos.length === 0 && rAnswers.length === 0 && !rFiles) return NextResponse.json({ ok: false, error: "이용자 명단(서명)·이용 사진·설문·서류 중 하나 이상 제출해주세요." }, { status: 400 });
    const { admin, approveWebhook, requests } = await readConfig();
    const target = requests.find((r) => r.id === id);
    if (!target) return NextResponse.json({ ok: false, error: "신청 건을 찾을 수 없습니다." }, { status: 404 });
    const usageResult = { submittedAt: new Date().toISOString(), users, photos, answers: rAnswers.length ? rAnswers : undefined, files: rFiles, memo: String(b.memo || "").trim() || undefined };
    const next = requests.map((r) => r.id === id ? { ...r, usageResult } : r);
    const { error } = await admin.from("app_config").upsert({ key: REQUESTS_KEY, value: next }, { onConflict: "key" });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    // 이용결과를 구글시트/드라이브에 자동 기록(웹훅 설정 시). 사진은 절대 URL로 전달해 Apps Script가 내려받아 저장.
    if (approveWebhook) {
      const origin = new URL(req.url).origin;
      const absPhotos = photos.map((p: string) => (p.startsWith("http") ? p : origin + p));
      fetch(approveWebhook, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "usageResult",
          spaceName: target.spaceName, applicantName: target.applicantName, studentId: target.studentId,
          phone: target.phone, date: target.date, start: target.start, end: target.end,
          submittedAt: usageResult.submittedAt, memo: usageResult.memo || "",
          users, photos: absPhotos, answers: rAnswers,
        }),
      }).catch(() => {});
    }
    return NextResponse.json({ ok: true });
  }

  // 관리자가 설정한 설문 답변
  const answers = Array.isArray(b.answers)
    ? b.answers.filter((a: unknown) => !!a && typeof a === "object").map((a: Record<string, unknown>) => ({ id: String(a.id || ""), label: String(a.label || ""), value: String(a.value || "") }))
    : [];

  const { admin, spaces, calendarId, form, requests } = await readConfig();
  // 관리자 폼 태그(bookingRole)로 예약 정보 추출 → 직접 전송값 우선, 없으면 태그에서 보완
  const d = deriveBooking(form, answers);
  const spaceId = String(b.spaceId || "");
  const date = String(b.date || d.date || "");
  const start = String(b.start || d.start || "");
  const end = String(b.end || d.end || "");
  // 종료일 — 날짜+시간 범위에서 시작일과 다른 경우. 없으면 시작일과 동일.
  const endDateRaw = String(b.endDate || d.endDate || "");
  const endDate = /^\d{4}-\d{2}-\d{2}$/.test(endDateRaw) ? endDateRaw : date;
  const purpose = String(b.purpose || d.purpose || "").trim();
  const headcount = Number(b.headcount ?? d.headcount) || 0;
  const applicantName = String(b.applicantName || d.applicantName || "").trim();
  const studentId = String(b.studentId || d.studentId || "").trim();

  // 장소 확정: id 우선, 없으면 태그로 뽑은 장소명으로 매칭
  let space = spaces.find((s) => s.id === spaceId);
  if (!space && d.spaceName) space = spaces.find((s) => s.name === d.spaceName) || spaces.find((s) => textMatchesSpace(d.spaceName!, s.name));
  const spaceName = space?.name || d.spaceName || "";

  const hasDateTime = /^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(start) && /^\d{2}:\d{2}$/.test(end);
  // 최소 조건: 신청자를 식별할 정보(이름)·설문 답변·제출 서류 중 하나라도 있어야 함
  if (!applicantName && answers.length === 0 && !normalizeFiles(b.files)) return NextResponse.json({ ok: false, error: "신청 내용을 입력해주세요." }, { status: 400 });

  // 시간이 모두 있으면 유효성·충돌·수용인원 검증(캘린더 반영 대상)
  if (hasDateTime) {
    // 종료일이 시작일보다 뒤면(여러 날 범위) 종료시간은 시작시간보다 이를 수 있음 → 날짜까지 포함해 비교
    const reqStart = slotInt(date, start), reqEnd = slotInt(endDate, end);
    if (reqEnd <= reqStart) return NextResponse.json({ ok: false, error: "종료 일시가 시작 일시보다 늦어야 합니다." }, { status: 400 });
    if (space?.capacity && headcount > space.capacity) return NextResponse.json({ ok: false, error: `수용 인원(${space.capacity}명)을 초과했습니다.` }, { status: 400 });
    // 같은 장소·시간대에 이미 접수(대기/승인)됐거나 캘린더에 예약된 건과 겹치면 차단.
    // 장소가 정확히 매칭되지 않아도 장소명 기준으로 검사한다.
    const targetSpaceName = space?.name || spaceName;
    if (targetSpaceName) {
      let calendar: BookedSlot[] = [];
      try { calendar = await fetchCalendarSlots(calendarId); } catch { /* 캘린더 접근 실패 시 접수건만으로 검증 */ }
      const all = [...calendar, ...requestSlots(requests)];
      const conflict = all.find((s) => overlaps(reqStart, reqEnd, s.start, s.end)
        && (s.source === "request" ? sameSpace(s.spaceName || "", targetSpaceName) : textMatchesSpace(s.label, targetSpaceName)));
      if (conflict) return NextResponse.json({ ok: false, error: "이미 신청·예약된 장소·시간대입니다. 다른 시간을 선택해주세요.", conflict: conflict.label }, { status: 409 });
    }
  }

  const now = new Date().toISOString();
  const entry = {
    id: crypto.randomUUID(), spaceId: space?.id || spaceId, spaceName, date, endDate: endDate !== date ? endDate : undefined, start, end,
    applicantName, studentId, phone: String(b.phone || d.phone || "").trim(), email: String(b.email || "").trim(),
    purpose, headcount, answers, files: normalizeFiles(b.files), status: "pending" as const, createdAt: now,
  };
  const next = [entry, ...requests];
  const { error } = await admin.from("app_config").upsert({ key: REQUESTS_KEY, value: next }, { onConflict: "key" });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// 공간대여 신청 — 지원금 신청과 별개. app_config에 보관(마이그레이션 불필요).
// 이미 신청받은 건(구글 캘린더 공개 iCal)과 장소+시간이 겹치면 신청 차단.
import type { FormSchema, FormField } from "./form-schema";
export const SPACES_KEY = "space_rental_spaces";      // 대여 가능 장소 목록(관리자 관리)
export const REQUESTS_KEY = "space_rental_requests";  // 접수된 공간대여 신청
export const CONFIG_KEY = "space_rental_config";       // { calendarId, approveWebhook, form }

// 공간대여 전용 구글 캘린더(공개) — 관리자 설정으로 변경 가능
export const DEFAULT_CALENDAR_ID = "eb8f4a81fedc9b901da25bb794fd0a87dfe45ccd099450880debe57c8b02efd0@group.calendar.google.com";

// 공개 구글 캘린더 임베드(보기 전용) URL — 월(MONTH) 보기, 이전/다음달 이동 가능
export function calendarEmbedUrl(calendarId: string): string {
  return `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendarId)}&ctz=Asia%2FSeoul&mode=MONTH&showTitle=0&showPrint=0&showTabs=1&showCalendars=0`;
}

export interface RentalSpace { id: string; name: string; capacity?: number; note?: string; photos?: string[]; }

// 대여 가능 장소 기본값 — 인프라 시트 기준(서암관·의생명대 도서실 제외). 관리자가 수정 가능.
export const DEFAULT_SPACES: RentalSpace[] = [
  { id: "sp-ai-playground", name: "데이터라이브러리 · AI Playground (중도 4층)", capacity: 10 },
  { id: "sp-living-lab", name: "데이터라이브러리 · 데이터 리빙랩 (중도 4층)", capacity: 24 },
  { id: "sp-cyber-warroom", name: "데이터라이브러리 · 사이버 워룸 (중도 4층)", capacity: 30 },
  { id: "sp-safe-zone", name: "데이터라이브러리 · 데이터 안심존 (중도 4층)", capacity: 10 },
  { id: "sp-open-hall", name: "데이터라이브러리 · 오픈형 강연장 (중도 4층)", capacity: 40 },
  { id: "sp-eng4-107", name: "공과대학 4호관 공학정보센터 전산실 (107호)", capacity: 46 },
  { id: "sp-eng5-106", name: "공과대학 5호관 (106호)", capacity: 32 },
  { id: "sp-eng5-106-1", name: "공과대학 5호관 (106-1호)", capacity: 6 },
  { id: "sp-eng5-106-2", name: "공과대학 5호관 (106-2호)", capacity: 6 },
  { id: "sp-eng5-106-3", name: "공과대학 5호관 (106-3호)", capacity: 6 },
];
export type RentalStatus = "pending" | "approved" | "rejected" | "supplement";
export interface RentalRequest {
  id: string;
  spaceId: string; spaceName: string;
  date: string;   // YYYY-MM-DD
  start: string;  // HH:mm
  end: string;    // HH:mm
  applicantName: string; studentId: string; phone: string; email: string;
  purpose: string; headcount: number;
  answers?: { id: string; label: string; value: string }[]; // 관리자 설정 추가 설문 답변
  status: RentalStatus;
  adminMemo?: string;
  createdAt: string;
  applicantId?: string;
  calendarEventId?: string;    // 캘린더 반영 시 이벤트 id(웹훅 응답)
}
// 시간 겹침 판정용 슬롯 (KST 벽시계 정수 YYYYMMDDHHmm)
export interface BookedSlot { start: number; end: number; label: string; source: "calendar" | "request"; spaceName?: string; uid?: string; summary?: string; location?: string; }

// 슬롯 정수(YYYYMMDDHHmm) → { date:'YYYY-MM-DD', time:'HH:mm' }
export function slotIntToParts(n: number): { date: string; time: string } {
  const s = String(n).padStart(12, "0");
  return { date: `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`, time: `${s.slice(8, 10)}:${s.slice(10, 12)}` };
}
// 캘린더 이벤트 제목/장소에서 공간명·신청자명 추정 ("[공간대여] {공간} · {신청자}")
export function guessSpaceAndApplicant(summary: string, location: string): { spaceName: string; applicantName: string } {
  const clean = (summary || "").replace(/^\s*\[공간대여\]\s*/, "").trim();
  const parts = clean.split("·").map((s) => s.trim());
  const spaceName = (location || "").trim() || parts[0] || clean;
  const applicantName = parts.length > 1 ? parts.slice(1).join(" · ") : "";
  return { spaceName, applicantName };
}

export function normalizeSpaces(v: unknown): RentalSpace[] {
  if (!Array.isArray(v)) return [];
  return v.filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
    .map((s) => {
      const photos = Array.isArray(s.photos) ? (s.photos as unknown[]).map(String).filter(Boolean) : (s.photo ? [String(s.photo)] : []);
      return { id: String(s.id || ""), name: String(s.name || ""), capacity: s.capacity != null && s.capacity !== "" ? Number(s.capacity) || undefined : undefined, note: s.note ? String(s.note) : undefined, photos: photos.length ? photos : undefined };
    })
    .filter((s) => s.id && s.name);
}
export function normalizeRequests(v: unknown): RentalRequest[] {
  if (!Array.isArray(v)) return [];
  return v.filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
    .map((r) => ({
      id: String(r.id || ""), spaceId: String(r.spaceId || ""), spaceName: String(r.spaceName || ""),
      date: String(r.date || ""), start: String(r.start || ""), end: String(r.end || ""),
      applicantName: String(r.applicantName || ""), studentId: String(r.studentId || ""),
      phone: String(r.phone || ""), email: String(r.email || ""),
      purpose: String(r.purpose || ""), headcount: Number(r.headcount) || 0,
      answers: Array.isArray(r.answers) ? (r.answers as unknown[]).filter((a): a is Record<string, unknown> => !!a && typeof a === "object").map((a) => ({ id: String(a.id || ""), label: String(a.label || ""), value: String(a.value || "") })) : undefined,
      status: (["pending", "approved", "rejected", "supplement"].includes(String(r.status)) ? r.status : "pending") as RentalStatus,
      adminMemo: r.adminMemo ? String(r.adminMemo) : undefined,
      createdAt: String(r.createdAt || ""), applicantId: r.applicantId ? String(r.applicantId) : undefined,
      calendarEventId: r.calendarEventId ? String(r.calendarEventId) : undefined,
    }))
    .filter((r) => r.id && r.date && r.start && r.end);
}

// 시간 항목 '종일' 선택값
export const ALL_DAY = "종일";

// 관리자 폼(설문)의 bookingRole 태그로 답변에서 예약 정보(장소·날짜·시간 등) 추출
export interface DerivedBooking { spaceName?: string; date?: string; start?: string; end?: string; applicantName?: string; studentId?: string; purpose?: string; headcount?: number; }
export function deriveBooking(form: FormSchema | null | undefined, answers: { id: string; value: string }[]): DerivedBooking {
  const out: DerivedBooking = {};
  if (!form?.steps) return out;
  const byId = new Map(answers.map((a) => [a.id, String(a.value || "")]));
  // 조건부 하위질문(branches)까지 펼쳐서 bookingRole을 찾는다
  const flatten = (fs: FormField[]): FormField[] => fs.flatMap((f) => f.branches ? [f, ...flatten(Object.values(f.branches).flat())] : [f]);
  const fields = flatten(form.steps.flatMap((s) => s.fields || []));
  const timePart = (x: string) => (x.includes("T") ? x.split("T")[1] : x); // datetime-local → HH:mm
  const datePart = (x: string) => (x.includes("T") ? x.split("T")[0] : x);
  for (const f of fields) {
    if (!f.bookingRole) continue;
    const v = (byId.get(f.id) || "").trim();
    if (!v) continue;
    switch (f.bookingRole) {
      case "space": out.spaceName = v; break;
      case "applicantName": out.applicantName = v; break;
      case "studentId": out.studentId = v; break;
      case "purpose": out.purpose = v; break;
      case "headcount": out.headcount = Number(v) || 0; break;
      case "date": out.date = datePart(v.split("~")[0]); break;
      case "time": {
        if (v === ALL_DAY) { out.start = "00:00"; out.end = "23:59"; break; }
        const [a = "", b = ""] = v.split("~");
        out.start = timePart(a);
        out.end = b ? timePart(b) : timePart(a);
        if (a.includes("T") && !out.date) out.date = datePart(a);
        break;
      }
    }
  }
  return out;
}

const pad = (n: number) => String(n).padStart(2, "0");
// 'YYYY-MM-DD','HH:mm' → KST 벽시계 정수 YYYYMMDDHHmm
export function slotInt(date: string, time: string): number {
  const d = (date || "").replace(/-/g, "");
  const t = (time || "00:00").replace(":", "").padStart(4, "0");
  return Number(`${d}${t}`);
}
// 시간 겹침: reqStart < evEnd && reqEnd > evStart
export function overlaps(reqStart: number, reqEnd: number, evStart: number, evEnd: number): boolean {
  return reqStart < evEnd && reqEnd > evStart;
}
// 이벤트 제목/장소에 공간명이 포함되는지 (공백·대소문자 무시)
export function textMatchesSpace(text: string, spaceName: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");
  const a = norm(text), b = norm(spaceName);
  return !!b && a.includes(b);
}

// iCal DTSTART/DTEND 값 → KST 벽시계 정수. Z(UTC)면 +9h 보정.
function icsValueToKstInt(rawLine: string): number | null {
  const colon = rawLine.indexOf(":");
  if (colon < 0) return null;
  const val = rawLine.slice(colon + 1).trim();
  const m = val.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?(Z)?/);
  if (!m) return null;
  const [, Y, Mo, D, H, Mi, , Z] = m;
  if (!H) return Number(`${Y}${Mo}${D}0000`); // 종일 이벤트(VALUE=DATE)
  if (Z) {
    const ms = Date.UTC(+Y, +Mo - 1, +D, +H, +Mi) + 9 * 3600 * 1000; // UTC → KST
    const k = new Date(ms);
    return Number(`${k.getUTCFullYear()}${pad(k.getUTCMonth() + 1)}${pad(k.getUTCDate())}${pad(k.getUTCHours())}${pad(k.getUTCMinutes())}`);
  }
  return Number(`${Y}${Mo}${D}${H}${Mi}`); // TZID(현지) 또는 부동시간 → 그대로 KST 취급
}

// 공개 iCal 텍스트 → 예약 슬롯 목록
export function parseIcs(ics: string): BookedSlot[] {
  const unfolded = ics.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
  const out: BookedSlot[] = [];
  for (const block of unfolded.split("BEGIN:VEVENT").slice(1)) {
    const body = block.split("END:VEVENT")[0];
    const lines = body.split(/\r?\n/);
    let start: number | null = null, end: number | null = null, summary = "", location = "", uid = "";
    for (const ln of lines) {
      if (/^DTSTART/.test(ln)) start = icsValueToKstInt(ln);
      else if (/^DTEND/.test(ln)) end = icsValueToKstInt(ln);
      else if (/^SUMMARY/.test(ln)) summary = ln.slice(ln.indexOf(":") + 1).trim();
      else if (/^LOCATION/.test(ln)) location = ln.slice(ln.indexOf(":") + 1).trim();
      else if (/^UID/.test(ln)) uid = ln.slice(ln.indexOf(":") + 1).trim();
    }
    if (start == null) continue;
    if (end == null) end = start + 1;
    const unesc = (s: string) => s.replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\n/gi, " ");
    const sm = unesc(summary), lc = unesc(location);
    out.push({ start, end, label: `${sm} ${lc}`.trim(), source: "calendar", uid: uid || undefined, summary: sm, location: lc });
  }
  return out;
}

// 공개 캘린더 iCal 가져오기 (서버 전용)
export async function fetchCalendarSlots(calendarId: string): Promise<BookedSlot[]> {
  const url = `https://calendar.google.com/calendar/ical/${encodeURIComponent(calendarId)}/public/basic.ics`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`calendar fetch ${res.status}`);
  return parseIcs(await res.text());
}

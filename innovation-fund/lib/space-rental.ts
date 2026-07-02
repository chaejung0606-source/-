// 공간대여 신청 — 지원금 신청과 별개. app_config에 보관(마이그레이션 불필요).
// 이미 신청받은 건(구글 캘린더 공개 iCal)과 장소+시간이 겹치면 신청 차단.
export const SPACES_KEY = "space_rental_spaces";      // 대여 가능 장소 목록(관리자 관리)
export const REQUESTS_KEY = "space_rental_requests";  // 접수된 공간대여 신청
export const CONFIG_KEY = "space_rental_config";       // { calendarId }

// 사용자가 제공한 구글 캘린더(공개) — 관리자 설정으로 변경 가능
export const DEFAULT_CALENDAR_ID = "be98515f39d0c2c785d01d0a506901d1d28efbe0da0c7cb1023f38240e0eaa59@group.calendar.google.com";

export interface RentalSpace { id: string; name: string; note?: string; }
export type RentalStatus = "pending" | "approved" | "rejected";
export interface RentalRequest {
  id: string;
  spaceId: string; spaceName: string;
  date: string;   // YYYY-MM-DD
  start: string;  // HH:mm
  end: string;    // HH:mm
  applicantName: string; studentId: string; phone: string; email: string;
  purpose: string; headcount: number;
  status: RentalStatus;
  adminMemo?: string;
  createdAt: string;
  applicantId?: string;
}
// 시간 겹침 판정용 슬롯 (KST 벽시계 정수 YYYYMMDDHHmm)
export interface BookedSlot { start: number; end: number; label: string; source: "calendar" | "request"; spaceName?: string; }

export function normalizeSpaces(v: unknown): RentalSpace[] {
  if (!Array.isArray(v)) return [];
  return v.filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
    .map((s) => ({ id: String(s.id || ""), name: String(s.name || ""), note: s.note ? String(s.note) : undefined }))
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
      status: (["pending", "approved", "rejected"].includes(String(r.status)) ? r.status : "pending") as RentalStatus,
      adminMemo: r.adminMemo ? String(r.adminMemo) : undefined,
      createdAt: String(r.createdAt || ""), applicantId: r.applicantId ? String(r.applicantId) : undefined,
    }))
    .filter((r) => r.id && r.date && r.start && r.end);
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
    let start: number | null = null, end: number | null = null, summary = "", location = "";
    for (const ln of lines) {
      if (/^DTSTART/.test(ln)) start = icsValueToKstInt(ln);
      else if (/^DTEND/.test(ln)) end = icsValueToKstInt(ln);
      else if (/^SUMMARY/.test(ln)) summary = ln.slice(ln.indexOf(":") + 1).trim();
      else if (/^LOCATION/.test(ln)) location = ln.slice(ln.indexOf(":") + 1).trim();
    }
    if (start == null) continue;
    if (end == null) end = start + 1;
    const unesc = (s: string) => s.replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\n/gi, " ");
    out.push({ start, end, label: `${unesc(summary)} ${unesc(location)}`.trim(), source: "calendar" });
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

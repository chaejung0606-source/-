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
// 신청자가 폼에서 업로드한 제출 서류 (신청서·명단 등)
export interface RentalFile { name: string; url: string; label?: string; }
// 반복 대여 일정 — 시작일 기준 매주(같은 요일)/매월(같은 일) 반복, until(포함)까지
export interface RentalRepeat { freq: "weekly" | "monthly"; until: string; }
export const REPEAT_LABELS: Record<RentalRepeat["freq"], string> = { weekly: "매주", monthly: "매월" };

const DAY_MS = 24 * 3600 * 1000;
const parseYmd = (s: string) => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); };
const fmtYmd = (t: number) => { const d = new Date(t); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`; };

// 반복 설정을 실제 회차(날짜 목록)로 전개. 매월 반복에서 해당 일이 없는 달(예: 31일)은 건너뜀.
// 폭주 방지: 최대 60회차. 반복이 없으면 시작 회차 1건만 반환.
export function expandOccurrences(date: string, endDate: string | undefined, repeat?: RentalRepeat): { date: string; endDate?: string }[] {
  const span = endDate && endDate !== date ? Math.max(0, Math.round((parseYmd(endDate) - parseYmd(date)) / DAY_MS)) : 0;
  const mk = (t: number) => ({ date: fmtYmd(t), endDate: span ? fmtYmd(t + span * DAY_MS) : undefined });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [{ date, endDate: span ? endDate : undefined }];
  const base = parseYmd(date);
  if (!repeat || !/^\d{4}-\d{2}-\d{2}$/.test(repeat.until)) return [mk(base)];
  const until = parseYmd(repeat.until);
  const out = [mk(base)];
  if (repeat.freq === "weekly") {
    for (let k = 1; k <= 60; k++) {
      const t = base + k * 7 * DAY_MS;
      if (t > until) break;
      out.push(mk(t));
    }
  } else {
    const d0 = new Date(base);
    const dom = d0.getUTCDate();
    for (let k = 1; k <= 24; k++) {
      const t = Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + k, dom);
      if (new Date(t).getUTCDate() !== dom) continue; // 그 일자가 없는 달은 건너뜀
      if (t > until) break;
      out.push(mk(t));
    }
  }
  return out;
}

// 요청 본문에서 반복 설정 파싱(검증 포함)
export function normalizeRepeat(v: unknown): RentalRepeat | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  const freq = String(o.freq || "");
  const until = String(o.until || "");
  if ((freq !== "weekly" && freq !== "monthly") || !/^\d{4}-\d{2}-\d{2}$/.test(until)) return undefined;
  return { freq, until };
}
// 이용결과 제출 — 대여 공간 사용 후 이용자 명단·서명·이용 사진 제출
export interface UsageUser { name: string; signature: string; } // signature: 데이터URL(그리기/업로드)
export interface UsageResult {
  submittedAt: string;
  users: UsageUser[];   // 이용자 명단 및 서명
  photos: string[];     // 대여공간 이용 사진 URL
  answers?: { id: string; label: string; value: string }[]; // 관리자 설정 이용결과 설문 답변
  files?: RentalFile[]; // 이용결과 폼의 파일 항목으로 제출된 서류
  memo?: string;
}
export interface RentalRequest {
  id: string;
  spaceId: string; spaceName: string;
  date: string;    // YYYY-MM-DD (시작일)
  endDate?: string; // YYYY-MM-DD (종료일 — 시작일과 다른 경우, 날짜+시간 범위)
  start: string;  // HH:mm
  end: string;    // HH:mm
  applicantName: string; studentId: string; phone: string; email: string;
  purpose: string; headcount: number;
  answers?: { id: string; label: string; value: string }[]; // 관리자 설정 추가 설문 답변
  files?: RentalFile[]; // 신청 폼의 파일 항목으로 제출된 서류 (신청서·명단 등)
  hideFromResults?: boolean; // 신청자 이용결과 제출 목록에서 숨김 (관리자 설정)
  repeat?: RentalRepeat;     // 반복 대여(매주/매월, 반복 종료일까지) — 관리자 입력
  status: RentalStatus;
  adminMemo?: string;
  createdAt: string;
  applicantId?: string;
  calendarEventId?: string;    // 캘린더 반영 시 이벤트 id(웹훅 응답)
  usageResult?: UsageResult;   // 이용결과 제출(사용 후)
}
// 시간 겹침 판정용 슬롯 (KST 벽시계 정수 YYYYMMDDHHmm)
export interface BookedSlot { start: number; end: number; label: string; source: "calendar" | "request"; spaceName?: string; uid?: string; summary?: string; location?: string; }

// 슬롯 정수(YYYYMMDDHHmm) → { date:'YYYY-MM-DD', time:'HH:mm' }
export function slotIntToParts(n: number): { date: string; time: string } {
  const s = String(n).padStart(12, "0");
  return { date: `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`, time: `${s.slice(8, 10)}:${s.slice(10, 12)}` };
}
// 캘린더 이벤트 제목/장소에서 공간명·신청자명 추정 ("{공간} · {신청자}" — 구버전 "[공간대여]" 접두어는 제거)
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
      date: String(r.date || ""), endDate: r.endDate ? String(r.endDate) : undefined, start: String(r.start || ""), end: String(r.end || ""),
      applicantName: String(r.applicantName || ""), studentId: String(r.studentId || ""),
      phone: String(r.phone || ""), email: String(r.email || ""),
      purpose: String(r.purpose || ""), headcount: Number(r.headcount) || 0,
      answers: Array.isArray(r.answers) ? (r.answers as unknown[]).filter((a): a is Record<string, unknown> => !!a && typeof a === "object").map((a) => ({ id: String(a.id || ""), label: String(a.label || ""), value: String(a.value || "") })) : undefined,
      files: normalizeFiles(r.files),
      hideFromResults: !!r.hideFromResults || undefined,
      repeat: normalizeRepeat(r.repeat),
      status: (["pending", "approved", "rejected", "supplement"].includes(String(r.status)) ? r.status : "pending") as RentalStatus,
      adminMemo: r.adminMemo ? String(r.adminMemo) : undefined,
      createdAt: String(r.createdAt || ""), applicantId: r.applicantId ? String(r.applicantId) : undefined,
      calendarEventId: r.calendarEventId ? String(r.calendarEventId) : undefined,
      usageResult: normalizeUsageResult(r.usageResult),
    }))
    .filter((r) => r.id);
}

// 제출 서류(파일) 정규화
export function normalizeFiles(v: unknown): RentalFile[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const files = (v as unknown[])
    .filter((f): f is Record<string, unknown> => !!f && typeof f === "object")
    .map((f) => ({ name: String(f.name || ""), url: String(f.url || ""), label: f.label ? String(f.label) : undefined }))
    .filter((f) => f.url);
  return files.length ? files : undefined;
}

// 이용결과(이용자 명단·서명·사진·서류) 정규화
function normalizeUsageResult(v: unknown): UsageResult | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  const users = Array.isArray(o.users) ? (o.users as unknown[]).filter((u): u is Record<string, unknown> => !!u && typeof u === "object").map((u) => ({ name: String(u.name || ""), signature: String(u.signature || "") })) : [];
  const photos = Array.isArray(o.photos) ? (o.photos as unknown[]).map(String).filter(Boolean) : [];
  const answers = Array.isArray(o.answers) ? (o.answers as unknown[]).filter((a): a is Record<string, unknown> => !!a && typeof a === "object").map((a) => ({ id: String(a.id || ""), label: String(a.label || ""), value: String(a.value || "") })) : undefined;
  const files = normalizeFiles(o.files);
  if (users.length === 0 && photos.length === 0 && (!answers || answers.length === 0) && (!files || files.length === 0) && !o.memo) return undefined;
  return { submittedAt: String(o.submittedAt || ""), users, photos, answers, files, memo: o.memo ? String(o.memo) : undefined };
}

// 시간 항목 '종일' 선택값
export const ALL_DAY = "종일";

// 관리자 폼(설문)의 bookingRole 태그로 답변에서 예약 정보(장소·날짜·시간 등) 추출
export interface DerivedBooking { spaceName?: string; date?: string; endDate?: string; start?: string; end?: string; applicantName?: string; studentId?: string; phone?: string; purpose?: string; headcount?: number; }
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
      case "phone": out.phone = v; break;
      case "purpose": out.purpose = v; break;
      case "headcount": out.headcount = Number(v) || 0; break;
      case "date": out.date = datePart(v.split("~")[0]); break;
      case "time": {
        const [a = "", b = ""] = v.split("~");
        // 종일: 시간 표기가 없음(순수 '종일' 또는 날짜만). 날짜가 있으면 날짜를 살리고 시간은 전일(00:00~23:59).
        const hasClock = a.includes(":") || a.includes("T");
        if (v === ALL_DAY || !hasClock) {
          if (a.includes("-") && !out.date) out.date = datePart(a);
          if (b.includes("-")) out.endDate = datePart(b);
          out.start = "00:00"; out.end = "23:59";
          break;
        }
        out.start = timePart(a);
        out.end = b ? timePart(b) : timePart(a);
        // 날짜+시간 항목이면 시작/종료 날짜도 반영(일자가 다른 범위 대응)
        if (a.includes("T") && !out.date) out.date = datePart(a);
        if (b.includes("T")) out.endDate = datePart(b);
        break;
      }
    }
  }
  return out;
}

// 전화번호 비교용 정규화(숫자만)
export const normPhone = (s: string) => String(s || "").replace(/\D/g, "");

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

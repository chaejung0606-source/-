/**
 * 공간대여 승인 → 구글 캘린더 이벤트 생성 + 구글시트 기록
 * ────────────────────────────────────────────────────────────
 * 사용 방법
 * 1) https://script.google.com 에서 새 프로젝트를 만들고 이 코드를 붙여넣습니다.
 * 2) 아래 CONFIG 값을 채웁니다.
 *    - CALENDAR_ID : 공간대여 구글 캘린더 ID (기본값 입력해 둠)
 *    - SHEET_ID    : 승인 기록을 남길 구글 스프레드시트 ID
 *                    (URL의 /d/ 와 /edit 사이 문자열. 예: 1DylY5o5QUDG1IqGXNhMEeGi_lTiD_Du77UVS2IO3fbE)
 *    - SHEET_NAME  : 기록할 시트(탭) 이름 (없으면 자동 생성)
 * 3) 프로젝트 설정(⚙️)에서 시간대를 (GMT+09:00) 서울로 지정합니다. (시간 오차 방지)
 * 4) 이 스크립트를 실행하는 구글 계정이 위 캘린더에 "일정 변경" 권한, 시트에 "편집" 권한이 있어야 합니다.
 * 5) 배포 → 새 배포 → 유형: 웹 앱
 *    - 실행 계정: 나(Me)
 *    - 액세스 권한: 모든 사용자(Anyone)
 *    배포 후 나오는 웹 앱 URL(.../exec)을 복사합니다.
 * 6) 플랫폼 관리자 → 공간대여 → 대여가능공간 → "승인 시 구글시트·캘린더 자동 반영 웹훅 URL"에 붙여넣고 저장합니다.
 *    이제 신청을 "승인"하면 이 스크립트가 캘린더 이벤트를 만들고 시트에 한 줄을 기록합니다.
 */

// ── CONFIG ─────────────────────────────────────────────────
var CALENDAR_ID = "eb8f4a81fedc9b901da25bb794fd0a87dfe45ccd099450880debe57c8b02efd0@group.calendar.google.com";
var SHEET_ID = "여기에_스프레드시트_ID_입력";   // 예: 1DylY5o5QUDG1IqGXNhMEeGi_lTiD_Du77UVS2IO3fbE
var SHEET_NAME = "공간대여신청";                 // 기록 탭 이름 (없으면 자동 생성)
// ───────────────────────────────────────────────────────────

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.action === "create") {
      var eventId = createEvent_(data);
      appendRow_(data, eventId);
      return json_({ ok: true, eventId: eventId });
    }
    return json_({ ok: false, error: "unknown action" });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// 캘린더 이벤트 생성 → 이벤트 ID 반환
function createEvent_(d) {
  var cal = CalendarApp.getCalendarById(CALENDAR_ID);
  if (!cal) throw new Error("캘린더를 찾을 수 없습니다. CALENDAR_ID와 권한을 확인하세요.");
  var start = parseDT_(d.date, d.start);
  var end = parseDT_(d.date, d.end);
  var title = d.title || ("[공간대여] " + (d.spaceName || ""));
  var ev = cal.createEvent(title, start, end, {
    location: d.location || d.spaceName || "",
    description: d.description || "",
  });
  return ev.getId();
}

// 'YYYY-MM-DD','HH:mm' → Date (프로젝트 시간대 기준: 서울로 설정할 것)
function parseDT_(dateStr, timeStr) {
  var p = String(dateStr).split("-");
  var t = String(timeStr || "00:00").split(":");
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), Number(t[0] || 0), Number(t[1] || 0), 0);
}

// 구글시트에 승인 기록 한 줄 추가
function appendRow_(d, eventId) {
  if (!SHEET_ID || SHEET_ID === "여기에_스프레드시트_ID_입력") return; // 시트 미설정 시 건너뜀
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(["승인일시", "장소", "사용일", "시작", "종료", "신청자", "학번/소속", "연락처", "이메일", "인원", "사용목적", "접수일시", "캘린더이벤트ID"]);
  }
  sh.appendRow([
    new Date(),
    d.spaceName || d.location || "",
    d.date || "", d.start || "", d.end || "",
    d.applicantName || "", d.studentId || "", d.phone || "", d.email || "",
    d.headcount || "", d.purpose || "",
    d.createdAt || "", eventId || "",
  ]);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// (선택) 배포 전 권한 승인용 테스트 함수 — 한 번 실행해 캘린더/시트 접근 권한을 허용하세요.
function testOnce() {
  createEvent_({ spaceName: "테스트공간", date: "2026-01-01", start: "10:00", end: "11:00", title: "[공간대여] 테스트", description: "권한 테스트" });
}

/**
 * 공간대여 승인 → 구글 캘린더 이벤트 생성 + 구글시트 자동 기록
 * ────────────────────────────────────────────────────────────
 * ★ 시트 ID를 몰라도 됩니다.
 *   SHEET_ID를 비워두면(""), 이 스크립트가 실행 계정(=내 구글 계정)의 드라이브에
 *   "공간대여 일정 기록" 스프레드시트를 자동으로 새로 만들고, 그 링크를 실행 로그에 찍어줍니다.
 *   (한 번 만들면 그 시트 ID를 스크립트에 기억해 두고 계속 같은 시트에 기록합니다.)
 *   → 기존에 "테스트가 안 뜬" 이유는 대부분 SHEET_ID가 실제 시트와 다르거나 편집 권한이 없어서였습니다.
 *     이 방식은 내가 만든 내 시트라 항상 권한이 있어 확실히 기록됩니다.
 *
 * 사용 방법
 * 1) https://script.google.com → 새 프로젝트 → 이 코드 전체를 붙여넣습니다.
 * 2) 프로젝트 설정(⚙️)에서 시간대를 (GMT+09:00) 서울로 지정합니다. (시간 오차 방지)
 * 3) 함수 목록에서 testOnce 를 선택하고 ▶ 실행 → 권한 승인(내 계정) →
 *    [실행 로그]에 "📄 기록용 구글시트: https://docs.google.com/..." 링크가 뜹니다. 그 링크를 열어 시트를 확인하세요.
 *    (직접 만든 빈 시트를 쓰고 싶다면, 그 시트를 열어 URL의 /d/ 와 /edit 사이 문자열을 아래 SHEET_ID 에 붙여넣으면 됩니다.)
 * 4) 배포 → 새 배포 → 유형: 웹 앱
 *    - 실행 계정: 나(Me)
 *    - 액세스 권한: 모든 사용자(Anyone)
 *    배포 후 나오는 웹 앱 URL(.../exec)을 복사합니다.
 * 5) 플랫폼 관리자 → 공간대여 → 대여가능공간 →
 *    "승인 시 구글시트·캘린더 자동 반영 웹훅 URL"에 붙여넣고 저장합니다.
 *    이제 신청을 "승인"하면 이 스크립트가 캘린더 이벤트를 만들고 시트에 한 줄을 기록합니다.
 */

// ── CONFIG ─────────────────────────────────────────────────
var CALENDAR_ID = "eb8f4a81fedc9b901da25bb794fd0a87dfe45ccd099450880debe57c8b02efd0@group.calendar.google.com";
var SHEET_ID = "";                 // 비워두면 스크립트가 시트를 자동 생성(권장). 직접 만든 시트를 쓰려면 그 ID를 여기에.
var SHEET_NAME = "공간대여신청";     // 기록할 시트(탭) 이름 (없으면 자동 생성)
var HEADERS = ["승인일시", "장소", "사용일", "시작", "종료", "신청자", "학번/소속", "연락처", "이메일", "인원", "사용목적", "접수일시", "캘린더이벤트ID"];
var PROP_KEY = "SPACE_RENTAL_SHEET_ID"; // 자동 생성한 시트 ID를 기억해 두는 스크립트 속성 키
var RESULT_SHEET_NAME = "공간대여이용결과";     // 이용결과 기록 탭
var RESULT_HEADERS = ["제출일시", "장소", "사용일", "시작", "종료", "신청자", "학번/소속", "연락처", "이용자명단", "서명파일", "사진파일", "설문답변", "비고"];
var RESULT_FOLDER_NAME = "공간대여 이용결과 파일"; // 서명·사진을 저장할 드라이브 폴더
var RESULT_FOLDER_PROP = "SPACE_RENTAL_RESULT_FOLDER_ID";
// ───────────────────────────────────────────────────────────

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action || "create";
    // 캘린더 작업이 실패(권한 등)해도 시트 기록/수정은 반드시 반영되도록 분리 처리
    if (action === "create") {
      var eventId = "", calErr = "";
      try { eventId = createEvent_(data); } catch (ce) { calErr = String(ce); }
      upsertRow_(data, eventId);
      return json_({ ok: true, eventId: eventId, calendarError: calErr });
    }
    if (action === "update") {
      var nid = data.eventId || "", calErr2 = "";
      try { nid = updateEvent_(data) || (data.eventId || ""); } catch (ce) { calErr2 = String(ce); }
      upsertRow_(data, nid);
      return json_({ ok: true, eventId: nid, calendarError: calErr2 });
    }
    if (action === "delete") {
      try { deleteEvent_(data.eventId); } catch (ce) { /* 캘린더 삭제 실패 무시 */ }
      deleteRow_(data.eventId);
      return json_({ ok: true });
    }
    if (action === "usageResult") {
      return json_(appendUsageResult_(data));
    }
    return json_({ ok: false, error: "unknown action" });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// 캘린더 이벤트 수정 → 이벤트 ID 반환
// 반복(매주/매월) 설정이 바뀔 수 있으므로, 기존 이벤트(단일/반복 시리즈)를 지우고
// 현재 값으로 다시 만드는 방식이 가장 안전하다. (새 이벤트 ID를 반환하면 플랫폼이 저장)
function updateEvent_(d) {
  try { deleteEvent_(d.eventId); } catch (e) { /* 기존 이벤트가 이미 없어도 진행 */ }
  return createEvent_(d);
}

// 캘린더 이벤트 삭제 — 반복 시리즈면 시리즈 전체 삭제
function deleteEvent_(eventId) {
  if (!eventId) return;
  var cal = CalendarApp.getCalendarById(CALENDAR_ID);
  if (!cal) return;
  try {
    var series = cal.getEventSeriesById(eventId);
    if (series) { series.deleteEventSeries(); return; }
  } catch (e) { /* 시리즈가 아니면 단일 이벤트로 시도 */ }
  var ev = cal.getEventById(eventId);
  if (ev) ev.deleteEvent();
}

// 캘린더 이벤트 생성 → 이벤트 ID 반환
// d.repeat = { freq: "weekly"|"monthly", until: "YYYY-MM-DD" } 가 있으면
// 구글 캘린더 반복 일정(EventSeries)으로 등록: 매주(같은 요일)/매월(같은 일), 반복 종료일까지.
function createEvent_(d) {
  var cal = CalendarApp.getCalendarById(CALENDAR_ID);
  if (!cal) throw new Error("캘린더를 찾을 수 없습니다. CALENDAR_ID와 권한을 확인하세요.");
  var start = parseDT_(d.date, d.start);
  var end = parseDT_(d.endDate || d.date, d.end); // 여러 날 범위면 종료일 사용
  var title = d.title || ((d.spaceName || "") + (d.applicantName ? " · " + d.applicantName : ""));
  var opts = { location: d.location || d.spaceName || "", description: d.description || "" };
  if (d.repeat && d.repeat.freq && d.repeat.until) {
    var until = parseDT_(d.repeat.until, "23:59"); // 반복 종료일 포함
    var rec = d.repeat.freq === "monthly"
      ? CalendarApp.newRecurrence().addMonthlyRule().until(until)   // 매월 같은 일 (없는 달은 구글이 건너뜀)
      : CalendarApp.newRecurrence().addWeeklyRule().until(until);   // 매주 같은 요일
    var series = cal.createEventSeries(title, start, end, rec, opts);
    return series.getId();
  }
  var ev = cal.createEvent(title, start, end, opts);
  return ev.getId();
}

// 'YYYY-MM-DD','HH:mm' → Date (프로젝트 시간대 기준: 서울로 설정할 것)
function parseDT_(dateStr, timeStr) {
  var p = String(dateStr).split("-");
  var t = String(timeStr || "00:00").split(":");
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), Number(t[0] || 0), Number(t[1] || 0), 0);
}

// 기록용 스프레드시트(탭)를 반환. SHEET_ID가 비어 있으면 자동 생성하고 ID를 기억한다.
function getRecordSheet_() {
  var ss = null;
  var configured = SHEET_ID && SHEET_ID.indexOf("여기에") === -1;
  if (configured) {
    ss = SpreadsheetApp.openById(SHEET_ID);
  } else {
    var props = PropertiesService.getScriptProperties();
    var savedId = props.getProperty(PROP_KEY);
    if (savedId) { try { ss = SpreadsheetApp.openById(savedId); } catch (e) { ss = null; } }
    if (!ss) {
      ss = SpreadsheetApp.create("공간대여 일정 기록");
      props.setProperty(PROP_KEY, ss.getId());
      Logger.log("📄 기록용 구글시트를 새로 만들었습니다: " + ss.getUrl());
    }
  }
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    var first = ss.getSheets()[0];
    // 새 시트의 기본 빈 탭이면 이름만 바꿔 사용, 아니면 새 탭 추가
    if (first && first.getLastRow() === 0 && /^(시트1|Sheet1)$/.test(first.getName())) {
      sh = first; sh.setName(SHEET_NAME);
    } else {
      sh = ss.insertSheet(SHEET_NAME);
    }
    sh.appendRow(HEADERS);
  }
  return sh;
}

// 한 줄 값 구성 (헤더 순서와 동일 · 13열) — 반복 대여는 사용목적에 [매주/매월 반복 ~종료일] 표기
function rowValues_(d, eventId) {
  var repeatTag = d.repeat && d.repeat.freq
    ? " [" + (d.repeat.freq === "monthly" ? "매월" : "매주") + " 반복 ~" + (d.repeat.until || "") + "]"
    : "";
  return [
    new Date(),
    d.spaceName || d.location || "",
    d.date || "", d.start || "", d.end || "",
    d.applicantName || "", d.studentId || "", d.phone || "", d.email || "",
    d.headcount || "", (d.purpose || "") + repeatTag,
    d.createdAt || "", eventId || "",
  ];
}
// 캘린더이벤트ID(13열)로 기존 행 찾기 — 없으면 -1
function findRowByEventId_(sh, eventId) {
  if (!eventId) return -1;
  var last = sh.getLastRow();
  if (last < 2) return -1;
  var vals = sh.getRange(2, 13, last - 1, 1).getValues();
  for (var i = 0; i < vals.length; i++) { if (String(vals[i][0]) === String(eventId)) return i + 2; }
  return -1;
}
// 이벤트ID 기준 upsert (있으면 그 행 수정, 없으면 추가) — 편집 반영에 사용
function upsertRow_(d, eventId) {
  var sh = getRecordSheet_();
  var row = findRowByEventId_(sh, eventId);
  var vals = rowValues_(d, eventId);
  if (row > 0) sh.getRange(row, 1, 1, vals.length).setValues([vals]);
  else sh.appendRow(vals);
}
// 이벤트ID로 시트 행 삭제
function deleteRow_(eventId) {
  var sh = getRecordSheet_();
  var row = findRowByEventId_(sh, eventId);
  if (row > 0) sh.deleteRow(row);
}
// (호환) 기존 호출부 유지
function appendRow_(d, eventId) { upsertRow_(d, eventId); }

// ── 이용결과: 구글시트 기록 + 서명/사진 구글드라이브 저장 ──
function getResultSheet_() {
  var sh0 = getRecordSheet_();               // 같은 스프레드시트 사용
  var ss = sh0.getParent();
  var sh = ss.getSheetByName(RESULT_SHEET_NAME);
  if (!sh) { sh = ss.insertSheet(RESULT_SHEET_NAME); sh.appendRow(RESULT_HEADERS); }
  return sh;
}
function getResultFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(RESULT_FOLDER_PROP);
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* 재생성 */ } }
  var folder = DriveApp.createFolder(RESULT_FOLDER_NAME);
  props.setProperty(RESULT_FOLDER_PROP, folder.getId());
  return folder;
}
// dataURL(data:image/png;base64,...) → Blob
function dataUrlToBlob_(dataUrl, name) {
  var m = String(dataUrl).match(/^data:([^;]+);base64,(.*)$/);
  if (!m) return null;
  var bytes = Utilities.base64Decode(m[2]);
  return Utilities.newBlob(bytes, m[1], name);
}
function appendUsageResult_(d) {
  var folder = getResultFolder_();
  var stamp = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyyMMdd_HHmmss");
  var tag = (d.applicantName || "신청자") + "_" + (d.date || "");
  // 서명 저장(dataURL)
  var sigLinks = [];
  var users = d.users || [];
  var names = [];
  for (var i = 0; i < users.length; i++) {
    names.push(users[i].name || "");
    var blob = users[i].signature ? dataUrlToBlob_(users[i].signature, "서명_" + tag + "_" + (i + 1) + ".png") : null;
    if (blob) { var f = folder.createFile(blob); sigLinks.push(f.getUrl()); }
  }
  // 사진 저장(URL 다운로드)
  var photoLinks = [];
  var photos = d.photos || [];
  for (var j = 0; j < photos.length; j++) {
    try {
      var resp = UrlFetchApp.fetch(photos[j], { muteHttpExceptions: true });
      if (resp.getResponseCode() === 200) {
        var pblob = resp.getBlob().setName("사진_" + tag + "_" + (j + 1));
        photoLinks.push(folder.createFile(pblob).getUrl());
      }
    } catch (e) { /* 개별 사진 실패 무시 */ }
  }
  var answers = (d.answers || []).map(function (a) { return (a.label || "") + ": " + (a.value || ""); }).join("\n");
  getResultSheet_().appendRow([
    new Date(), d.spaceName || "", d.date || "", d.start || "", d.end || "",
    d.applicantName || "", d.studentId || "", d.phone || "",
    names.join(", "), sigLinks.join("\n"), photoLinks.join("\n"), answers, d.memo || "",
  ]);
  return { ok: true, signatures: sigLinks.length, photos: photoLinks.length };
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// (선택) 배포 전 권한 승인·동작 확인용 테스트 — 실행 후 [실행 로그]에서 시트 링크와 캘린더(내일 10~11시)를 확인하세요.
function testOnce() {
  var cal = CalendarApp.getCalendarById(CALENDAR_ID);
  Logger.log(cal ? ("캘린더 찾음: " + cal.getName()) : "❌ 캘린더를 찾지 못함 — CALENDAR_ID 또는 접근 권한을 확인하세요.");

  var start = new Date(); start.setDate(start.getDate() + 1); start.setHours(10, 0, 0, 0);
  var end = new Date(start); end.setHours(11, 0, 0, 0);
  var eventId = "";
  if (cal) {
    try {
      var ev = cal.createEvent("[공간대여] 테스트(삭제하세요)", start, end, { description: "권한/동작 테스트" });
      eventId = ev.getId();
      Logger.log("✅ 캘린더 이벤트 생성됨 · ID: " + eventId);
    } catch (ce) {
      Logger.log("⚠️ 캘린더 이벤트 생성 실패(시트 기록은 계속 진행): " + ce + " — 이 캘린더에 '일정 변경' 권한이 있는지 확인하세요.");
    }
  }

  // 시트 기록 테스트 (SHEET_ID 미설정 시 자동으로 시트를 만들고 링크를 로그에 출력)
  try {
    appendRow_({ spaceName: "테스트공간", date: Utilities.formatDate(start, "Asia/Seoul", "yyyy-MM-dd"), start: "10:00", end: "11:00", applicantName: "테스트", studentId: "-", purpose: "권한 테스트" }, eventId);
    Logger.log("✅ 시트 기록 성공 → 기록용 구글시트: " + getRecordSheet_().getParent().getUrl());
  } catch (err) {
    Logger.log("⚠️ 시트 기록 실패: " + err);
  }
}

// 자동 생성/사용 중인 기록 시트의 링크를 확인 (언제든 실행해서 시트 URL 확인 가능)
function showSheetUrl() {
  Logger.log("기록용 구글시트: " + getRecordSheet_().getParent().getUrl());
}

// 접근 가능한 캘린더 목록 확인용 (CALENDAR_ID가 안 맞을 때 이걸로 실제 ID를 찾으세요)
function listMyCalendars() {
  CalendarApp.getAllCalendars().forEach(function (c) { Logger.log(c.getName() + "  →  " + c.getId()); });
}

# Google Drive 동기화 설정 (Apps Script 웹훅)

신청이 제출되면 **비민감 정보만** 내 구글 시트(요약)와 드라이브(첨부)에 자동 저장됩니다.

## 절대 Drive로 가지 않는 항목 (Supabase 전용)
- 이름, 학번
- 계좌정보(은행·계좌번호·예금주)
- 연락처, 이메일
- 신분증 사본, 통장 사본 파일

→ Drive에는 **접수번호로만 식별**, 신청유형·프로그램명·금액·상태 같은 업무 요약과 **비민감 증빙(재학증명서·성적·성과/참여 증빙 등)** 만 저장됩니다.

## 설정 방법 (약 5분)

### 1. 구글 시트 만들기
- Google Drive에서 새 **Google 스프레드시트** 생성 (예: "지원금 신청내역")

### 2. Apps Script 붙여넣기
- 시트 상단 **확장 프로그램 → Apps Script**
- 기존 코드 지우고 아래를 붙여넣은 뒤 저장(💾)

```javascript
// 시트 URL의 /d/ 와 /edit 사이 문자열 (스프레드시트 ID)로 교체하세요.
var SHEET_ID = "여기에_시트_ID_붙여넣기";
var SHEET_NAME = "신청내역";
var ATTACH_ROOT = "지원금 신청 첨부";

function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["접수번호","신청일","신청유형","프로그램/내용","신청금액","자동산정금액","검토상태","지급상태","동기화시각","삭제여부"]);
  }

  // ── 취소(삭제) 처리: 시트 행은 '삭제 건'으로 표시(내용 보존) + 드라이브 첨부만 삭제 ──
  if (data.action === "cancel") {
    markCanceled(sheet, data.receiptNumber, data.canceledAt);
    deleteAttachments(data.receiptNumber);
    return jsonOut({ ok: true, canceled: true });
  }

  // ── 일반 동기화: 요약행 추가 ──
  sheet.appendRow([
    data.receiptNumber, data.applicationDate, data.applicationType, data.programName,
    data.requestAmount, data.calculatedAmount, data.reviewStatus, data.paymentStatus, new Date(), ""
  ]);

  // 비민감 첨부파일 → 접수번호 폴더
  if (data.files && data.files.length) {
    var root = getOrCreateFolder(DriveApp.getRootFolder(), ATTACH_ROOT);
    var folder = getOrCreateFolder(root, data.receiptNumber || "기타");
    data.files.forEach(function(f) {
      if (!f.dataUrl) return;
      var parts = f.dataUrl.split(",");
      var b64 = parts[1];
      if (!b64) return;
      var ct = (parts[0].match(/data:(.*?);/) || [null, "application/octet-stream"])[1];
      folder.createFile(Utilities.newBlob(Utilities.base64Decode(b64), ct, f.name));
    });
  }

  return jsonOut({ ok: true });
}

// 접수번호로 행을 찾아 '삭제여부' 열(10번째)에 표시 — 행/내용은 보존
function markCanceled(sheet, receiptNumber, canceledAt) {
  if (!receiptNumber || sheet.getLastRow() < 2) return;
  var ids = sheet.getRange(1, 1, sheet.getLastRow(), 1).getValues(); // A열(접수번호)
  var label = "삭제 건" + (canceledAt ? " · " + canceledAt : "");
  for (var i = 1; i < ids.length; i++) {        // 0=헤더
    if (String(ids[i][0]) === String(receiptNumber)) {
      sheet.getRange(i + 1, 10).setValue(label); // 10 = '삭제여부' 열
    }
  }
}

// 접수번호 폴더(첨부)를 휴지통으로 이동 → 드라이브에서 제거
function deleteAttachments(receiptNumber) {
  if (!receiptNumber) return;
  var roots = DriveApp.getFoldersByName(ATTACH_ROOT);
  if (!roots.hasNext()) return;
  var folders = roots.next().getFoldersByName(receiptNumber);
  while (folders.hasNext()) folders.next().setTrashed(true);
}

function getOrCreateFolder(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function jsonOut(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
```

> 신청자가 신청을 취소(또는 임시저장 삭제)하면 서버가 이 웹훅에 `{ action: "cancel", receiptNumber }`를 보냅니다.
> 시트의 해당 행은 **지우지 않고 '삭제여부' 열에 "삭제 건 · 취소일시"** 로 표시되고, 드라이브의 **접수번호 첨부 폴더는 휴지통으로 이동**됩니다.
> ⚠️ 기존에 이미 배포해 둔 경우, 위 코드로 교체 후 **배포 → 배포 관리 → 편집(연필) → 새 버전 → 배포**로 꼭 재배포해야 취소 처리가 반영됩니다.

### 3. 웹앱으로 배포
- 우측 상단 **배포 → 새 배포**
- 유형: **웹 앱**
- 실행 계정: **나(본인)**
- 액세스 권한: **모든 사용자** (URL을 아는 서버만 호출하므로 사실상 비공개)
- **배포** → 권한 승인(본인 계정) → **웹 앱 URL 복사** (`https://script.google.com/macros/s/.../exec`)

### 4. Vercel 환경변수 등록
- Vercel → 프로젝트 → Settings → Environment Variables
- `GOOGLE_SYNC_WEBHOOK_URL` = 복사한 웹 앱 URL (Production·Preview)
- 저장 후 **재배포**

## 동작 확인
- 신청 1건 제출 → 구글 시트에 요약행 추가 + 드라이브 "지원금 신청 첨부/{접수번호}" 폴더에 비민감 파일 저장
- 안 되면 Apps Script **실행 로그**와 Vercel 함수 로그를 확인

## 주의 (개인정보)
- 구글 시트/드라이브에 학생 정보를 보관하면 처리방침에 "Google Drive 보관" 사실을 명시하는 것이 좋습니다(개보법 §30).
- 본 설정은 접수번호 외 식별정보를 보내지 않아 위험을 최소화했습니다.

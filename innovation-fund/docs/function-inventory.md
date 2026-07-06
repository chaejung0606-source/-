# 기능 목록 (Function Inventory)

플랫폼 전체 기능 전수조사 결과입니다. 코드(app/·components/·lib/) 기준으로 작성했습니다.

> **용어 매핑 안내**: 요청서의 일반 대여시스템 용어를 이 플랫폼의 실제 기능으로 매핑합니다.
> 자산 조회 → **지원금 유형/프로그램 조회**, 대여 신청 → **지원금 신청 / 공간대여 신청**, 반납 → **공간대여 이용결과 제출**,
> 승인/반려 → **검토 상태(승인·반려·보완요청)**, 연체 → (해당 없음 — 지원금은 지급 상태로 관리), 자산 등록/수정/삭제 → **프로그램·대여공간 등록/수정/삭제**.

**범례** — 매뉴얼: ✅작성 / — 해당없음 · 캡처: 📷스크립트로 생성(캡처파일명) / — · 테스트: `코드확인`(코드 정독으로 로직·문구 확인) / `런타임 필요`(백엔드+계정 있는 환경에서 실행 테스트 필요, [test-checklist](./test-checklist.md) 참고)

## A. 사용자(학생) 기능

| 기능명 | 권한 | 접근 경로 | 관련 화면 | 주요 버튼 | 입력 항목 | 저장/수정/삭제 | 관련 데이터 | 매뉴얼 | 캡처 | 테스트 |
|---|---|---|---|---|---|---|---|---|---|---|
| 회원가입 | 공개 | /login | 로그인 | 회원가입 후 시작하기 | 학번·이름·비번·학적·소속·연락처·이메일·계좌·동의 | 저장 | Supabase auth, user_metadata | ✅ | 📷 signup-screen | 런타임 필요 |
| 로그인 | 공개 | /login | 로그인 | 로그인 | 학번·비밀번호 | — | auth 세션 | ✅ | 📷 login-screen | 런타임 필요 |
| 비밀번호 변경 | 사용자 | /mypage | 마이페이지 | 변경 | 새 비번·현재 비번 | 수정 | auth | ✅ | 📷 mypage | 런타임 필요 |
| 학적상태변경(학번 변경) | 사용자 | /mypage | 마이페이지 | 변경 | 새 학번·학적상태·현재 비번 | 수정 | auth, applications | ✅ | 📷 mypage | 런타임 필요 |
| 개인정보 수정 | 사용자 | /mypage | 마이페이지 | 저장 | 이름·소속·연락처·이메일·계좌 | 수정 | user_metadata | ✅ | 📷 mypage | 런타임 필요 |
| 수강 시간표 등록 | 사용자 | /mypage | 마이페이지 | 시간표 저장 | 요일·시간 | 저장 | user_metadata.timetable | ✅ | 📷 mypage | 런타임 필요 |
| 회원 탈퇴 | 사용자 | /mypage | 마이페이지 | 탈퇴하기 | 현재 비번 | 삭제 | auth, applications | ✅ | 📷 mypage | 런타임 필요 |
| 홈·유형 조회 | 공개 | / | 홈 | 유형 카드 | — | — | programs, type-periods, site-config | ✅ | 📷 home-user | 런타임 필요 |
| 지원금 유형 상세(모달) | 공개 | / | 홈 | 유형 카드 클릭 | — | — | site-content | ✅ | 📷 home-user | 런타임 필요 |
| 자격증 목록 조회 | 공개 | / | 홈 | — | — | — | cert-list | ✅ | 📷 home-user | 런타임 필요 |
| 공간대여 캘린더 조회 | 공개 | / , /space-rental | 홈·공간대여 | — | — | — | 구글캘린더 iCal | ✅ | 📷 space-rental | 런타임 필요 |
| 지원신청(사전) | 사용자 | /apply?mode=pre | 신청 | 지원신청 제출 | 유형·프로그램·폼 항목 | 저장 | applications(pre) | ✅ | 📷 apply-pre-select | 런타임 필요 |
| 지원금 신청 | 사용자 | /apply | 신청 | 신청 제출 | 유형·프로그램·폼 항목·동의·서명 | 저장 | applications(fund) | ✅ | 📷 apply-type-select | 런타임 필요 |
| 성적우수 교과목 입력(직접입력) | 사용자 | /apply | 신청 | + 과목 추가 | 세부유형·교과목·학점·성적·MD | 저장 | applications.gradeDetail | ✅ | 📷 apply-grade-detail | 런타임 필요 |
| 파일 업로드(증빙) | 사용자 | /apply | 신청 | 업로드 | PDF·이미지 | 저장 | storage documents | ✅ | 📷 apply-type-select | 런타임 필요 |
| 파일 다운로드(제공 양식) | 사용자 | /apply, /space-rental | 신청 | 다운로드 링크 | — | — | site/ storage | ✅ | — | 런타임 필요 |
| 서명 입력 | 사용자 | /apply | 신청 | 직접 서명/이미지 업로드 | 서명 | 저장 | applications.signature | ✅ | 📷 signature-input | 런타임 필요 |
| 개인정보 동의 | 사용자 | /apply, /login | 신청·가입 | 체크박스 | 동의 | 저장 | consent | ✅ | 📷 privacy-consent | 런타임 필요 |
| 임시저장/이어서 작성 | 사용자 | /apply, /mypage | 신청·마이페이지 | 임시저장/이어서 신청 | 폼 상태 | 저장/수정 | applications(draft) | ✅ | 📷 mypage | 런타임 필요 |
| 신청 완료 확인 | 사용자 | /apply/complete | 완료 | 마이페이지에서 확인 | — | — | receipt | ✅ | 📷 apply-complete | 런타임 필요 |
| 신청 상태 확인 | 사용자 | /mypage | 마이페이지 | 새로고침 | — | — | applications | ✅ | 📷 mypage | 런타임 필요 |
| 보완요청 재제출 | 사용자 | /mypage→/apply | 마이페이지 | 수정 후 재제출 | 수정 폼 | 수정 | applications | ✅ | 📷 mypage | 런타임 필요 |
| 승인→지원금 신청 연계 | 사용자 | /mypage→/apply | 마이페이지 | 지원금 신청하기 | — | 저장 | applications | ✅ | 📷 mypage | 런타임 필요 |
| 신청 취소/임시저장 삭제 | 사용자 | /mypage | 마이페이지 | 신청 취소/삭제 | — | 삭제(취소) | applications | ✅ | 📷 mypage | 런타임 필요 |
| 관리자 알림 수신·확인 | 사용자 | /mypage | 마이페이지 | 확인 | — | 수정(ack) | notifications | ✅ | 📷 mypage | 런타임 필요 |
| 공간대여 신청 | 공개 | /space-rental | 공간대여 | 공간대여 신청 | 장소·일시·신청자·동의 | 저장 | space_rental_requests | ✅ | 📷 space-rental | 런타임 필요 |
| 공간대여 겹침 차단 | 공개 | /space-rental | 공간대여 | (자동) | — | — | requests+calendar | ✅ | — | 코드확인 |
| 공간대여 이용결과 제출 | 공개 | /space-rental | 공간대여 | 내 신청 조회/제출 | 연락처·명단·서명·사진 | 저장 | usageResult, storage | ✅ | 📷 space-rental | 런타임 필요 |

## B. 관리자 기능

| 기능명 | 권한 | 접근 경로 | 관련 화면 | 주요 버튼 | 입력 항목 | 저장/수정/삭제 | 관련 데이터 | 매뉴얼 | 캡처 | 테스트 |
|---|---|---|---|---|---|---|---|---|---|---|
| 관리자 로그인 | 관리자 | /admin/login | 로그인 | 로그인 | 아이디·비밀번호 | — | admin_accounts | ✅ | — (PII 보호) | 런타임 필요 |
| 신청 목록·대시보드 | 관리자 | /admin/applications | 신청 목록 | 필터·엑셀·인쇄 | 검색·필터 | — | applications, status-config | ✅ | — (PII 보호) | 런타임 필요 |
| 신청 상세·상태변경 | 관리자 | /admin/applications/[id] | 신청 상세 | 저장 | 검토/지급상태·승인액·메모 | 수정 | applications | ✅ | — (PII 보호) | 런타임 필요 |
| 승인/반려/보완요청 | 관리자 | /admin/applications/[id] | 신청 상세 | 저장 | 상태·사유 메모 | 수정 | applications | ✅ | — (PII 보호) | 런타임 필요 |
| 계좌·주민번호 확인 입력 | 관리자 | /admin/applications/[id] | 신청 상세 | 수정 | 은행·계좌·예금주·주민번호 | 수정 | applications(마스킹) | ✅ | — (PII 보호) | 런타임 필요 |
| 상태 옵션 편집 | 관리자 | /admin/applications/[id] | 신청 상세 | 상태 옵션 저장 | 상태명·색상 | 저장 | status-config | ✅ | — (PII 보호) | 런타임 필요 |
| 서류 인계/반송 | 관리자 | /admin/applications | 신청 목록/상세 | 지출관리자에게 보내기/반송 | 보완 내용 | 수정 | applications.reviewStage | ✅ | — (PII 보호) | 런타임 필요 |
| 문서 인쇄(PDF) | 관리자 | /admin/applications/[id]/print | 인쇄 | PDF로 저장/인쇄 | — | — | export-settings | ✅ | — | 런타임 필요 |
| 엑셀/CSV 내보내기 | 관리자 | /admin/applications | 신청 목록 | 전체/선택 목록 다운로드 | — | — | applications | ✅ | — (PII 보호) | 런타임 필요 |
| 테스트 신청 삭제 | 관리자 | /admin/applications | 신청 목록 | 삭제 | — | 삭제 | applications | ✅ | — (PII 보호) | 런타임 필요 |
| 학생 검색·비밀번호 재설정 | 지출/권한 | /admin/applicants | 신청자 정보 | 비밀번호 재설정 | 검색·새 비번 | 수정 | auth | ✅ | — (PII 보호) | 런타임 필요 |
| 신청자 등록(대리 계정) | 지출/권한 | /admin/applicants | 신청자 정보 | 등록 | 학번·이름·비번·소속·계좌 | 저장 | auth | ✅ | — (PII 보호) | 런타임 필요 |
| 대리 신청 | 관리자 | /apply?adminFor= | 신청 | 신청 제출 | 폼 항목 | 저장 | applications | ✅ | — | 런타임 필요 |
| 지정 프로그램 설정 | 지출/권한 | /admin/applicants | 신청자 정보 | 저장 | 프로그램 체크 | 저장 | designated | ✅ | — (PII 보호) | 런타임 필요 |
| 신청자 알림 발송/회수 | 지출/권한 | /admin/applicants | 신청자 정보 | n명에게 보내기/회수 | 제목·내용 | 저장/삭제 | notifications | ✅ | — (PII 보호) | 런타임 필요 |
| 신청 가능 학생 조회·엑셀 | 지출/권한 | /admin/applicants | 신청자 정보 | 엑셀 다운로드 | 필터·검색 | — | applications, designated | ✅ | — (PII 보호) | 런타임 필요 |
| 가상학과 명단 관리(엑셀) | 지출/권한 | /admin/applicants(가상학과 탭) | 가상학과 | 엑셀 업로드/학생 추가/삭제 | 명단 | 저장/삭제 | virtual_students | ✅ | — (PII 보호) | 런타임 필요 |
| 가상학과 전용 유형 설정 | 지출/권한 | /admin/applicants | 가상학과 | 저장 | 유형 체크 | 저장 | vdept-config | ✅ | — (PII 보호) | 런타임 필요 |
| 프로그램 등록/수정/삭제 | 지출/권한 | /admin/programs | 신청폼 편집 | 저장/프로그램 삭제 | 프로그램명·역할·대상·기간 | 저장/수정/삭제 | programs | ✅ | — (PII 보호) | 런타임 필요 |
| 신청 폼 빌더 편집 | 지출/권한 | /admin/programs | 신청폼 편집 | 저장 | 항목·옵션·조건부 | 저장/수정/삭제 | program-forms | ✅ | — (PII 보호) | 런타임 필요 |
| 폼 템플릿 저장/불러오기 | 지출/권한 | /admin/programs | 신청폼 편집 | 템플릿으로 저장 | 템플릿명·폼 | 저장/삭제 | form-templates | ✅ | — (PII 보호) | 런타임 필요 |
| 신청 기간 설정 | 지출/권한 | /admin/programs | 신청폼 편집 | 저장 | 상시/마감/기간 | 저장 | type-periods | ✅ | — (PII 보호) | 런타임 필요 |
| 유형별 지급 기준 편집 | 지출/권한 | /admin/content | 지급 기준 | 저장 | 유형·리치텍스트 | 저장 | content | ✅ | — (PII 보호) | 런타임 필요 |
| 자격증 목록 편집/가져오기 | 지출/권한 | /admin/certificates | 자격증 목록 | 저장/가져오기 | 시트·셀·공개여부 | 저장/수정/삭제 | cert-list | ✅ | — (PII 보호) | 런타임 필요 |
| 공간대여 심사(승인/반려/보완) | 지출/권한 | /admin/space-rental | 공간대여 | 승인/반려/보완요청 | 상태·메모 | 수정 | space_rental_requests | ✅ | — (PII 보호) | 런타임 필요 |
| 공간대여 신청 수정 | 지출/권한 | /admin/space-rental | 공간대여 | 수정 저장 | 장소·일시·신청자 | 수정 | requests | ✅ | — (PII 보호) | 런타임 필요 |
| 대여 공간 등록/수정/삭제 | 지출/권한 | /admin/space-rental | 공간대여 | 공간 추가/저장 | 공간명·인원·사진 | 저장/수정/삭제 | spaces | ✅ | — (PII 보호) | 런타임 필요 |
| 캘린더 웹훅 연결 테스트 | 지출/권한 | /admin/space-rental | 공간대여 | 연결 테스트 | 웹훅 URL | — | config | ✅ | — (PII 보호) | 런타임 필요 |
| 공간대여 폼(신청/이용결과) 편집 | 지출/권한 | /admin/space-rental | 공간대여 | 저장 | 폼 항목 | 저장 | config.form/resultForm | ✅ | — (PII 보호) | 런타임 필요 |
| 공간대여 직접 신청 | 지출/권한 | /admin/space-rental | 공간대여 | 신청 접수 | 장소·일시·신청자 | 저장 | requests | ✅ | — (PII 보호) | 런타임 필요 |
| 관리자 계정 생성/삭제 | 지출관리자 | /admin/admins | 관리자 설정 | 관리자 추가/저장 | 아이디·비번·이름 | 저장/삭제 | admin_accounts | ✅ | — (PII 보호) | 런타임 필요 |
| 메뉴별 권한 부여 | 지출관리자 | /admin/admins | 관리자 설정 | 저장 | 메뉴 체크 | 저장 | admin_accounts.menus | ✅ | — (PII 보호) | 런타임 필요 |
| 담당 프로그램 배정 | 지출관리자 | /admin/admins | 관리자 설정 | 저장 | 프로그램 토글 | 저장 | admin_accounts.programIds | ✅ | — (PII 보호) | 런타임 필요 |
| 지출관리자 로그인 설정 | 지출관리자 | /admin/admins | 관리자 설정 | 저장 | 아이디·비밀번호 | 저장 | admin_accounts.expense | ✅ | — (PII 보호) | 런타임 필요 |
| AI 초안 키 설정 | 지출관리자 | /admin/admins | 관리자 설정 | 저장 | API 키·모델 | 저장 | ai_config | ✅ | — (PII 보호) | 런타임 필요 |
| 푸터 설정 | 지출/권한 | /admin/site-settings | 사이트 설정 | 저장 | 조직명·연락처 | 저장 | site-config | ✅ | — (PII 보호) | 런타임 필요 |
| 사이드바 링크 설정 | 지출/권한 | /admin/site-settings | 사이트 설정 | 저장 | 라벨·링크·파일·아이콘 | 저장 | site-config | ✅ | — (PII 보호) | 런타임 필요 |
| 이용안내 편집 | 지출/권한 | /admin/site-settings | 사이트 설정 | 이용안내 저장 | 섹션·리치텍스트 | 저장 | guide | ✅ | — (PII 보호) | 런타임 필요 |
| 팝업 공지 설정 | 지출/권한 | /admin/site-settings | 사이트 설정 | 팝업 저장 | 제목·내용·기간 | 저장 | popup | ✅ | — (PII 보호) | 런타임 필요 |
| 파일 저장 경로 설정 | 지출/권한 | /admin/site-settings | 사이트 설정 | 설정 저장 | 파일명 형식·경로 | 저장(localStorage) | export-settings | ✅ | — (PII 보호) | 런타임 필요 |
| 검토/지급 상태 단계 설정 | 관리자 | /admin/applications/[id] | 신청 상세 | 상태 옵션 저장 | 상태명·색상 | 저장 | status-config | ✅ | — (PII 보호) | 런타임 필요 |

## C. 존재하지 않는(요청서 대비) 기능

| 요청 항목 | 이 플랫폼 | 비고 |
|---|---|---|
| 자산 상세보기 | — | 물품 자산 개념 없음. '대여 공간' 상세는 관리자 [대여가능공간] |
| 반납 신청/반납 확인 | 이용결과 제출로 대체 | 공간 사용 후 이용자 명단·서명·사진 제출 |
| 연체 관리 | — | 지원금은 '지급 상태'로 관리(연체 개념 없음) |
| 자산 CSV 업로드 | 명단/자격증 CSV로 존재 | 가상학과 명단·자격증 목록 CSV 가져오기 |
| 통계 기능 | 신청 목록 상단 대시보드 | 검토/지급 상태별 카운트·미확인 건수 |

## 캡처/테스트 현황 요약

- **매뉴얼 작성**: 전 기능 ✅ (user-guide.md / admin-guide.md)
- **화면 캡처**: `scripts/capture-docs-screenshots.js` 로 생성(**신청자 화면 전용**). 관리자 화면은 실제 학생 개인정보(PII) 때문에 캡처하지 않고 텍스트로 운영. 개발 샌드박스(백엔드·폰트 미비)에서는 미생성 → 운영/스테이징 환경에서 스크립트 실행 필요.
- **테스트**: 코드 정독으로 로직·문구·경로 확인 완료. 런타임(실제 클릭) 테스트는 백엔드+테스트 계정 환경에서 수행 필요 → [test-checklist.md](./test-checklist.md).

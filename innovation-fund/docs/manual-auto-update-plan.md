# 기능 업데이트 시 매뉴얼 자동 반영 — 운영 방안·개발 요청사항

> 기준: 2026-07-07 / 플랫폼 v1.1.179 · 신청자 매뉴얼: [`applicant-manual.md`](./applicant-manual.md) · 매핑표: [`feature-manual-map.md`](./feature-manual-map.md)

## A. 이미 구현되어 있는 것 (현행)

| # | 항목 | 구현 내용 |
|---|---|---|
| 1 | **동적 신청 안내(핵심 자동 반영)** | `/guide`의 「신청 방법 — 유형별 상세 안내」(`components/home/ApplyGuideDynamic.tsx`)가 **현재 등록된 프로그램·신청폼(DB)에서 실시간 생성**됩니다. 관리자가 폼 항목·제출 서류·신청 기간을 바꾸면 신청자 안내가 **즉시 자동 반영**됩니다. |
| 2 | 관리자 직접 편집 | 관리자 → 사이트 설정 → **[이용안내]** 탭(`GuidePanel`)에서 안내 섹션을 리치텍스트로 편집·저장(app_config `guide`). 미편집 시 코드 기본값(`lib/guide.ts`)이 표시되어 **배포와 함께 갱신**됩니다. |
| 3 | 신청자 노출 | 사이드바 **[이용안내]** 버튼 → 플랫폼 **작은 창**으로 열림(신청 화면과 병행 열람). |
| 4 | 문서 체계 | `docs/`(사용자/관리자 매뉴얼·FAQ·오류가이드·기능목록·테스트표·CHANGELOG) + PR 템플릿 체크리스트(`.github/pull_request_template.md`, `DOC_CHECKLIST.md`). |
| 5 | 화면 캡처 자동화 | `scripts/capture-docs-screenshots.js` — 신청자 화면 전용(관리자 PII 제외), 재실행으로 이미지 갱신. |
| 6 | 기능-매뉴얼 매핑표 | `feature-manual-map.md` — 라우트/소스 ↔ 매뉴얼 문단 연결, 최종 확인일 관리. |

## B. 개발 요청사항 (제안)

### B-1. 라벨·라우트 변경 감지 CI 체크 (우선순위 상)
- 스크립트 `scripts/check-manual-sync.js`(신규):
  1) 소스에서 **진실의 원천 문자열**을 추출 — `TopNav` 메뉴 라벨, `APPLICATION_TYPE_LABELS`, `PICK_TYPES_PRE/FUND`, 섹션 페이지 문구, 상태 라벨(`status-config`).
  2) `docs/applicant-manual.md`·`lib/guide.ts`(기본 안내)에 해당 문자열이 존재하는지 대조.
  3) 소스에는 있는데 문서에 없는 라벨(또는 문서에만 남은 옛 라벨)을 **경고 목록으로 출력**, CI에서 실패 처리 가능.
- 효과: 메뉴명·버튼명·유형명이 바뀌면 매뉴얼 수정 없이는 머지 불가 → 문서-화면 불일치 원천 차단.

### B-2. 신규/삭제 신청 유형 자동 반영
- `APPLICATION_TYPE_LABELS`·`PICK_TYPES_*`에 유형이 **추가**되면: B-1 체크가 실패하며, 수정 대상 목록 자동 안내 → ① 매뉴얼 Ⅰ-3 메뉴표 ② Ⅱ-3 준비서류표 ③ FAQ ④ `ApplyGuideDynamic`의 PHASES/FIXED_TYPES 배열.
- 유형 **삭제** 시: 매뉴얼 해당 문단을 삭제하거나 “현재 미운영” 표기(매핑표 규칙 4).

### B-3. 배포 시 변경 이력 자동 기록
- 현행 배포 관례(`chore: vX.Y.Z 배포` 커밋)에 맞춰, 버전 범프 커밋에 `docs/CHANGELOG.md` 갱신을 포함(체크리스트로 강제, 또는 커밋 훅으로 검사).
- `/guide` 하단에 **빌드 버전·일자 자동 표시**: 이미 주입되는 `NEXT_PUBLIC_BUILD_VERSION`/`BUILD_DATE`를 출력(1줄 추가) → 신청자·관리자가 안내의 최신성 기준을 즉시 확인.

### B-4. 신청자용 PDF 매뉴얼 자동 생성
- 1안(권장, 무설치): `/guide`에 인쇄 전용 CSS(`@media print`)를 보강 → 관리자/신청자가 **인쇄 → PDF 저장**으로 항상 최신 PDF 생성. 동적 안내가 포함되므로 별도 빌드 불필요.
- 2안: CI에서 `md-to-pdf`(또는 pandoc)로 `docs/applicant-manual.md` → `public/manual/applicant-manual.pdf` 생성·배포. 한글 폰트(Noto Sans KR) 포함 필요.

### B-5. 파일 관리 위치
- 원본: `docs/applicant-manual.md`(버전 관리, 본 문서 체계와 동일 저장소).
- 배포 노출이 필요하면 `public/manual/applicant-manual.md`로 CI 복사(정적 제공). 단, **신청 방법의 실시간 기준은 `/guide`** 이므로 매뉴얼에는 “/guide가 최신” 문구 유지.

### B-6. 매뉴얼 메타 섹션(적용됨)
- `applicant-manual.md`에 **최종 업데이트일 · 플랫폼 버전 · 변경 이력** 섹션 포함(운영 시 갱신).

## C. 운영 절차 요약 (기능 변경 → 매뉴얼 갱신)

1. 기능 PR 작성 → PR 템플릿 체크리스트에서 문서 영향 확인
2. `feature-manual-map.md`에서 해당 행 확인 → 매뉴얼 문단 수정 + 최종 확인일 갱신
3. (라벨 변경 시) B-1 체크 통과 확인
4. UI 변경 시 캡처 스크립트 재실행(신청자 화면)
5. 배포 커밋에 `CHANGELOG.md` 기록
6. 관리자 편집 영역(지급 기준·이용안내·신청폼)은 **코드 배포 없이도** `/guide` 동적 안내·이용안내 탭에서 즉시 반영됨

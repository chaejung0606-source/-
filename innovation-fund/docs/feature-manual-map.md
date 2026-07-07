# 기능-매뉴얼 매핑표 (신청자 매뉴얼)

> 대상 문서: [`applicant-manual.md`](./applicant-manual.md) · 기준: 플랫폼 v1.1.179 / 2026-07-07
> 사용법: 기능(라우트·컴포넌트)을 변경하면 이 표에서 해당 행을 찾아 **매뉴얼 위치**의 문단을 갱신하고, 「최종 확인일」·「변경 여부」를 갱신합니다. (PR 체크리스트 `DOC_CHECKLIST.md`와 함께 사용)

| 기능명 | URL(라우트) | 화면명 | 관련 신청 유형 | 소스(진실의 원천) | 매뉴얼 위치 | 최종 확인일 | 변경 여부 |
|---|---|---|---|---|---|---|---|
| 홈(유형 카드·기간 표시) | `/` | 홈 | 전체 | `app/page.tsx`, `lib/type-periods.ts` | Ⅰ-3, Ⅳ | 2026-07-07 | — |
| 유형별 지급 기준 모달 | `/` (카드 클릭) | 지급 기준 안내 | 전체 | `components/home/FundTypeModal.tsx`, `lib/site-content.ts`(관리자 편집) | Ⅳ-2 | 2026-07-07 | — |
| 상단 메뉴 | `/` 상단 | 지원신청·지원금신청·소학회·공간대여 | 전체 | `components/home/TopNav.tsx` | Ⅰ-3, Ⅴ-1, Ⅵ-1, Ⅶ-1, Ⅷ-1 | 2026-07-07 | — |
| 섹션 페이지 | `/menu/pre` `/menu/fund` `/menu/club` | 지원신청/지원금신청/소학회 | 전체 | `app/menu/[section]/page.tsx` | Ⅴ-1, Ⅵ-1, Ⅶ-1 | 2026-07-07 | — |
| 회원가입/로그인 | `/login` | 신청자 로그인 | 전체 | `app/login/page.tsx`, `lib/auth.ts` | Ⅲ | 2026-07-07 | — |
| 신청 진입(유형·프로그램 선택) | `/apply` `/apply?mode=pre` | 종류 선택·프로그램 선택 | 전체 | `app/apply/page.tsx` | Ⅴ-3, Ⅵ-2 | 2026-07-07 | — |
| 프로그램 신청폼(동적) | `/apply` | 단계별 신청서 | 근로·프로그램·진행요원·소학회 | `components/apply/SchemaApplyForm.tsx` + 관리자 폼(DB `program_forms`) | Ⅴ-3·4, Ⅵ-2 가~다, Ⅶ / **실시간: [이용안내] 동적 안내** | 2026-07-07 | — |
| 고정 양식 신청폼 | `/apply` | 유형별 신청서 | 성적·경진대회·자격증 | `components/apply/ApplyForm.tsx`, `GradeDetailSection.tsx` | Ⅵ-2 라~바 | 2026-07-07 | — |
| 성적우수 교과목(직접입력) | `/apply` | 성적 우수 상세 | 성적 우수 | `components/apply/GradeDetailSection.tsx`, `lib/md-courses.ts` | Ⅵ-2 라 | 2026-07-07 | — |
| 근무상황부 | `/apply` | 근무상황부 | 근로장학금 | `SchemaApplyForm`(workLog), 시간표 `app/mypage` | Ⅵ-2 가, Ⅴ-3 | 2026-07-07 | — |
| 비용 입력(등록비·교통비·숙박비) | `/apply` | 비용 | 프로그램 참여지원비 등 | `components/apply/CostSection.tsx` | Ⅵ-2 나 | 2026-07-07 | 등록비=금액만(v1.1.179) |
| 파일 업로드/다운로드·서명·동의 | `/apply` | 신청서 공통 항목 | 전체 | `SchemaApplyForm`, `SignaturePad`, `ConsentChecklist` | Ⅱ-2, Ⅴ-4 | 2026-07-07 | — |
| 소학회 구성원 입력 | `/apply?type=club` | 소학회 명단 | 소학회 | `components/apply/ClubMembersField.tsx` | Ⅶ-4 | 2026-07-07 | — |
| 임시저장/이어서 작성 | `/apply`, `/mypage` | 임시저장 | 전체 | `SchemaApplyForm`(saveDraft), `app/mypage` | Ⅴ-7 | 2026-07-07 | — |
| 신청 완료(접수번호) | `/apply/complete` | 신청 완료 | 전체 | `app/apply/complete/page.tsx` | Ⅴ-6, Ⅸ-1 | 2026-07-07 | — |
| 마이페이지(상태·보완·취소·연계) | `/mypage` | 내 신청 현황 | 전체 | `app/mypage/page.tsx`, `lib/status-config.ts` | Ⅸ, Ⅵ-6 | 2026-07-07 | — |
| 계정 관리(개인정보·비번·학적·시간표·탈퇴) | `/mypage` | 마이페이지 카드 | 전체 | `app/mypage/page.tsx` | Ⅲ-4·5, Ⅸ | 2026-07-07 | — |
| 공간대여 신청 | `/space-rental` | 공간대여 신청 | 공간대여 | `app/space-rental/page.tsx`, `app/api/space-rental/route.ts` | Ⅷ-1~3 | 2026-07-07 | 겹침 차단 강화(v1.1.179) |
| 공간대여 이용결과 제출 | `/space-rental` | 이용결과 제출 | 공간대여 | `app/space-rental/page.tsx`(UsageResultModal) | Ⅷ-4 | 2026-07-07 | — |
| 공간대여 캘린더 | `/`, `/space-rental` | 예약 현황 | 공간대여 | `components/home/SpaceCalendar.tsx` | Ⅳ-4, Ⅷ-2 | 2026-07-07 | — |
| 이용안내(동적 신청 안내) | `/guide` | 이용안내(새 탭) | 전체 | `app/guide/page.tsx`, `components/home/ApplyGuideDynamic.tsx`, 관리자 편집(`GuidePanel`) | 매뉴얼 전반의 “실시간 기준” 참조처 | 2026-07-07 | 신규(동적 안내 추가) |
| 개인정보 처리방침 | `/privacy` | 처리방침 | 전체 | `app/privacy/page.tsx` | Ⅲ-2 ⑧ | 2026-07-07 | — |
| 자격증 목록 | `/` | 자격증 목록 | 자격증 | `components/home/CertList.tsx`, 관리자 편집(cert-list) | Ⅵ-2 바 | 2026-07-07 | — |
| 사이드바 바로가기·팝업 공지 | `/` | 바로가기/팝업 | 전체 | `lib/site-config.ts`, `/api/popup` | Ⅳ-5 | 2026-07-07 | — |
| 푸터(문의처) | `/` 하단 | 푸터 | 전체 | `lib/site-config.ts` | Ⅻ | 2026-07-07 | — |

## 갱신 규칙
1. 위 표의 **소스 파일을 수정하는 PR**은 해당 행의 매뉴얼 위치 문단을 점검한다.
2. 점검 후 「최종 확인일」을 갱신하고, 문구가 바뀌었으면 「변경 여부」에 버전·내용을 남긴다.
3. **신규 신청 유형/메뉴 추가 시**: 이 표에 행 추가 + 매뉴얼 Ⅰ-3(메뉴표)·Ⅱ-3(준비서류표)·FAQ에 반영.
4. **기능 삭제 시**: 매뉴얼 해당 문단 삭제 또는 “현재 미운영” 표기, 이 표의 행에 (삭제됨) 표기.

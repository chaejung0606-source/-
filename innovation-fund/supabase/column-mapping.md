# 구글시트 → 플랫폼 컬럼 매핑표

구글시트 신청양식과 플랫폼 필드 간 매핑 구조입니다.
구글시트 컬럼 확인 후 이 파일을 업데이트하여 동일하게 맞춰주세요.

## 기본 정보

| 구글시트 컬럼명 | 플랫폼 필드명 | 타입 | 비고 |
|---|---|---|---|
| 이름 | `name` | string | |
| 학번 | `studentId` | string | |
| 소속 대학 | `university` | string | |
| 학과/전공 | `department` | string | |
| 학년 | `grade` | string | |
| 학적 상태 | `academicStatus` | string | 재학/수료 |
| 연락처 | `phone` | string | |
| 이메일 | `email` | string | |
| 신청일 | `applicationDate` | date | YYYY-MM-DD |
| 은행명 | `bankInfo.bankName` | string | |
| 계좌번호 | `bankInfo.accountNumber` | string | |
| 예금주 | `bankInfo.accountHolder` | string | |

## 신청 유형

| 구글시트 값 | 플랫폼 값 | 설명 |
|---|---|---|
| 프로그램 참여지원비 | `program` | |
| 진행요원비 | `staff` | |
| 성적 우수 지원금 | `grade` | |
| 경진대회 입상 우수성과 지원금 | `contest` | |
| 자격증 취득 우수성과 지원금 | `certificate` | |

## 엑셀 다운로드 컬럼 매핑

| 엑셀 컬럼명 | 플랫폼 필드 |
|---|---|
| 접수번호 | `receiptNumber` |
| 신청일 | `applicationDate` |
| 이름 | `name` |
| 학번 | `studentId` |
| 소속대학 | `university` |
| 학과 | `department` |
| 학년 | `grade` |
| 연락처 | `phone` |
| 이메일 | `email` |
| 신청유형 | `applicationType` (레이블 변환) |
| 세부유형 | 유형별 서브타입 |
| 프로그램명_또는_성과명 | 유형별 대표명칭 |
| 신청금액 | `requestAmount` |
| 자동산정금액 | `calculatedAmount` |
| 최종승인금액 | `approvedAmount` |
| 검토상태 | `reviewStatus` (레이블 변환) |
| 지급상태 | `paymentStatus` (레이블 변환) |
| 관리자메모 | `adminMemo` |
| 은행명 | `bankInfo.bankName` |
| 계좌번호 | `bankInfo.accountNumber` |
| 예금주 | `bankInfo.accountHolder` |
| 첨부파일목록 | `files[].name` 쉼표 구분 |
| 최종수정일 | `updatedAt` |

## 구글시트 확인 후 추가 작업

1. 구글시트에서 실제 컬럼명 확인
2. 위 표에서 불일치하는 항목 수정
3. `lib/excel-export.ts`의 컬럼명 한글명 수정
4. `types/index.ts`에 필요한 필드 추가

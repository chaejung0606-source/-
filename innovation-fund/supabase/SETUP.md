# Supabase 연동 가이드 (개인정보 보호 강화)

현재 앱은 **데모용**으로 인메모리 mock + 브라우저 localStorage 인증을 사용합니다.
실제 학생 개인정보로 운영하려면 아래 절차로 Supabase(인증·DB·스토리지)로 전환해야 합니다.

> 핵심: 단순히 DB에 저장한다고 안전해지지 않습니다. **Auth + RLS + 비공개 Storage + service_role(서버 전용)** 4가지를 모두 갖춰야 합니다.

## 1. Supabase 프로젝트 생성
1. https://supabase.com 에서 프로젝트 생성
2. Settings → API 에서 아래 3개 확인
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` 키 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` 키 → `SUPABASE_SERVICE_ROLE_KEY` **(서버 전용, 절대 공개 금지)**

## 2. 스키마 + RLS 적용
- SQL Editor에서 [`schema.sql`](./schema.sql) 전체 실행
- `applications`·`student_profiles` 등 모든 테이블에 **RLS가 켜져 있는지** 반드시 확인
  (RLS가 꺼져 있으면 anon 키로 전체 조회가 가능해 매우 위험)

## 3. Storage 비공개 버킷
- Storage → New bucket → 이름 `documents`, **Public 체크 해제(비공개)**
- 정책은 `schema.sql`의 Storage 섹션 참고(본인 폴더만 접근, 관리자는 서버 signed URL)

## 4. 환경변수
- `.env.local.example` → `.env.local` 복사 후 값 입력
- `NEXT_PUBLIC_USE_MOCK=false` 로 변경
- 배포(Vercel) 시 동일 환경변수 등록. `SUPABASE_SERVICE_ROLE_KEY`는 `NEXT_PUBLIC_` 없이 등록.

## 5. 로그인 방식 (학번 기반 유지)
- 사용자는 **학번 + 비밀번호**만 입력
- 앱이 내부적으로 학번을 `"{학번}@coss-applicant.kangwon.ac.kr"` 합성 이메일로 매핑해 Supabase Auth에 가입/로그인
- 비밀번호는 Supabase가 bcrypt로 해시(앱이 직접 저장하지 않음), 세션은 JWT 쿠키
- 실제 연락용 이메일은 `student_profiles.email`에 별도 저장

## 6. 관리자
- 관리 작업(전체 신청 조회·상태 변경·엑셀·인쇄)은 **서버 API 라우트에서 service_role 키로만** 수행
- 관리자 페이지/관리 API에 **권한 검사 미들웨어** 적용, `ADMIN_PASSWORD`는 강력한 값으로

## 코드 전환 체크리스트 (다음 단계)
- [ ] `lib/auth.ts` → Supabase Auth(signUp/signInWithPassword/getSession)로 교체, localStorage 인증 제거
- [ ] `lib/supabase-admin.ts`(서버 전용 service_role 클라이언트) 추가
- [ ] `app/api/applications/*` → service_role + 권한 검사, RLS 전제
- [ ] 신청 저장 시 `applicant_id = auth.uid()` 기록
- [ ] `lib/programs.ts`·`lib/site-content.ts` → Supabase 테이블 읽기(공개), 관리자 쓰기(서버)
- [ ] `FileUploadSection` → base64 대신 Storage 업로드, 관리자 열람은 signed URL
- [ ] `/admin/*` 권한 미들웨어, 쿠키 `Secure`·`SameSite`
- [ ] 보유기간(지급 후 5년) 파기 절차

> 위 전환은 Supabase 프로젝트가 연결돼야 실제 동작/검증이 가능합니다.

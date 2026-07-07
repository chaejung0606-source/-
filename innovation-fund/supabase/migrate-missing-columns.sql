-- ───────────────────────────────────────────────────────────────
-- 배포 DB 컬럼 보정 마이그레이션
-- 증상: 신청 제출/임시저장 시 "Could not find the 'is_test' column ..." 등
-- 원인: 코드가 기대하는 컬럼이 운영 Supabase에 추가되지 않음(스키마 캐시 불일치)
-- 사용: Supabase 대시보드 → SQL Editor 에 그대로 붙여넣고 실행.
--       모두 IF NOT EXISTS 라 여러 번 실행해도 안전합니다.
-- 실행 후: Supabase에서 스키마 캐시가 자동 갱신됩니다(수 초). 즉시 정상 동작.
-- ───────────────────────────────────────────────────────────────

-- student_profiles
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS skip_pre BOOLEAN DEFAULT FALSE;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS skip_pre_programs JSONB DEFAULT '[]'::jsonb;
-- 학적상태변경(대학원 진학 등으로 학번 변경) — 신청기록은 applicant_id로 유지
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS academic_status TEXT DEFAULT '재학생';
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS previous_student_ids JSONB DEFAULT '[]'::jsonb;
-- 회원가입·프로필 저장이 쓰는 계좌 컬럼(구버전 DB에 없을 수 있음)
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS account_number TEXT;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS account_holder TEXT;

-- programs
ALTER TABLE programs ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS enabled_pre BOOLEAN DEFAULT TRUE;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS enabled_fund BOOLEAN DEFAULT TRUE;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS roles JSONB DEFAULT '[]'::jsonb;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS report_fields JSONB DEFAULT '[]'::jsonb;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS pre_report_fields JSONB DEFAULT '[]'::jsonb;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS pre_apply BOOLEAN DEFAULT FALSE;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS pre_apply_start TEXT;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS pre_apply_end TEXT;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS program_type TEXT;

-- applications
ALTER TABLE applications ADD COLUMN IF NOT EXISTS club_detail JSONB; -- 첨단 ICT 소학회 활동 지원 상세
ALTER TABLE applications ADD COLUMN IF NOT EXISTS review_stage TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS handoff_note TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS form_answers JSONB;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS application_phase TEXT DEFAULT 'fund';
ALTER TABLE applications ADD COLUMN IF NOT EXISTS canceled BOOLEAN DEFAULT FALSE;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS canceled_ip TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT FALSE;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS draft_step INT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT FALSE;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS campus TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS verified_account JSONB;

-- 커스텀 검토/지급 상태 키 허용(체크 제약 제거)
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_review_status_check;
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_payment_status_check;

-- 신청 유형에 '소학회(club)' 추가.
-- 증상: 소학회(첨단 ICT) 신청 제출 시 "violates check constraint applications_application_type_check"(23514)로 저장 실패.
-- 원인: 코드(ApplicationType)는 'club'을 쓰지만 기존 배포 DB의 CHECK 제약에 'club'이 없음.
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_application_type_check;
ALTER TABLE applications ADD CONSTRAINT applications_application_type_check
  CHECK (application_type IN ('program','staff','grade','contest','certificate','labor','activity','club'));

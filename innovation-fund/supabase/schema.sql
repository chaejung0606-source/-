-- =====================================================================
-- 강원대 데이터보안·활용 혁신융합대학사업단 지원금 신청 플랫폼
-- Supabase 스키마 + RLS(행 수준 보안) + Storage 정책
-- Supabase SQL Editor에서 순서대로 실행하세요.
-- =====================================================================
-- 보안 원칙
--  · 신청자는 "본인 행"만 조회 가능 (RLS)
--  · 관리자 작업은 서버에서 service_role 키로만 수행 (RLS 우회)
--  · anon key는 브라우저에 노출되므로, 반드시 RLS가 켜져 있어야 안전
--  · 비밀번호는 Supabase Auth가 bcrypt로 해시 (앱이 직접 저장하지 않음)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) 신청자 프로필 (Supabase Auth 사용자와 1:1)
--    로그인은 학번 기반: 앱이 학번을 "{학번}@coss-applicant.kangwon.ac.kr"
--    형태의 합성 이메일로 매핑해 Auth에 가입/로그인 (사용자는 학번만 입력)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  department TEXT,
  phone TEXT,
  email TEXT,                       -- 실제 연락용 이메일 (알림 등)
  university TEXT DEFAULT '강원대학교',
  bank_name TEXT,
  account_number TEXT,
  account_holder TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

-- 본인 프로필만 조회/수정/생성
CREATE POLICY "own profile select" ON student_profiles
  FOR SELECT USING (id = auth.uid());
CREATE POLICY "own profile insert" ON student_profiles
  FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON student_profiles
  FOR UPDATE USING (id = auth.uid());

-- ---------------------------------------------------------------------
-- 2) 신청 테이블
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_number TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  applicant_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- 신청자 (RLS 키)

  -- 기본 정보
  name TEXT NOT NULL,
  student_id TEXT NOT NULL,
  university TEXT NOT NULL,
  department TEXT NOT NULL,
  grade TEXT,
  academic_status TEXT,
  grad_completion TEXT,
  completed_years TEXT,
  current_semester TEXT,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  application_date DATE NOT NULL,

  -- 계좌 정보
  bank_name TEXT,
  account_number TEXT,
  account_holder TEXT,
  account_mismatch BOOLEAN DEFAULT FALSE,

  -- 신청 단계 (지원신청: pre / 지원금 신청: fund)
  application_phase TEXT DEFAULT 'fund' CHECK (application_phase IN ('pre','fund')),

  -- 신청 유형 (근로장학금/학생활동지원비 포함)
  application_type TEXT NOT NULL CHECK (application_type IN
    ('program','staff','grade','contest','certificate','labor','activity')),

  -- 유형별 상세 (JSONB)
  program_detail JSONB,
  staff_detail JSONB,
  grade_detail JSONB,
  contest_detail JSONB,
  certificate_detail JSONB,
  labor_detail JSONB,
  activity_detail JSONB,

  -- 파일 메타(실파일은 Storage), 서명
  files JSONB DEFAULT '[]',
  signature TEXT,

  -- 동의
  privacy_consent BOOLEAN DEFAULT FALSE,
  truth_consent BOOLEAN DEFAULT FALSE,
  account_consent BOOLEAN DEFAULT FALSE,

  -- 금액
  request_amount BIGINT DEFAULT 0,
  calculated_amount BIGINT DEFAULT 0,
  approved_amount BIGINT,

  -- 관리자 필드
  review_status TEXT DEFAULT 'received' CHECK (review_status IN ('received','reviewing','supplement','committee','approved','rejected')),
  payment_status TEXT DEFAULT 'waiting' CHECK (payment_status IN ('waiting','processing','completed','hold','refund')),
  admin_memo TEXT DEFAULT ''
);

-- 접수번호 자동 생성
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TRIGGER AS $$
DECLARE year_str TEXT; seq_num INT;
BEGIN
  year_str := TO_CHAR(NOW(), 'YYYY');
  SELECT COUNT(*) + 1 INTO seq_num FROM applications WHERE TO_CHAR(created_at, 'YYYY') = year_str;
  NEW.receipt_number := year_str || '-' || LPAD(seq_num::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_receipt_number
  BEFORE INSERT ON applications
  FOR EACH ROW WHEN (NEW.receipt_number IS NULL OR NEW.receipt_number = '')
  EXECUTE FUNCTION generate_receipt_number();

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- 신청자: 본인 신청만 생성/조회 (수정·삭제는 불가 → 관리자만)
CREATE POLICY "applicant insert own" ON applications
  FOR INSERT WITH CHECK (applicant_id = auth.uid());
CREATE POLICY "applicant select own" ON applications
  FOR SELECT USING (applicant_id = auth.uid());
-- 관리자(service_role)는 RLS를 우회하므로 별도 정책 불필요.
-- anon/authenticated에는 UPDATE/DELETE/타인 SELECT 권한이 없음 → 대량 노출 차단.

CREATE INDEX IF NOT EXISTS idx_applications_applicant ON applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_applications_student_id ON applications(student_id);
CREATE INDEX IF NOT EXISTS idx_applications_review_status ON applications(review_status);
CREATE INDEX IF NOT EXISTS idx_applications_payment_status ON applications(payment_status);
CREATE INDEX IF NOT EXISTS idx_applications_type ON applications(application_type);

-- ---------------------------------------------------------------------
-- 3) 프로그램 / 신청기간 (민감정보 아님: 공개 읽기, 쓰기는 관리자만)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS programs (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('labor','innovation','activity')),
  name TEXT NOT NULL,
  role TEXT,                                  -- 구버전 단일 역할(호환)
  roles JSONB DEFAULT '[]'::jsonb,            -- 역할 목록(여러 개)
  report_fields JSONB DEFAULT '[]'::jsonb,    -- 신청자 보고서 입력 항목 설정
  apply_start DATE NOT NULL,
  apply_end DATE NOT NULL,
  note TEXT DEFAULT ''
);
-- 기존 테이블 마이그레이션(이미 존재 시 컬럼 추가)
ALTER TABLE programs ADD COLUMN IF NOT EXISTS roles JSONB DEFAULT '[]'::jsonb;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS report_fields JSONB DEFAULT '[]'::jsonb;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS pre_apply BOOLEAN DEFAULT FALSE;
-- programs: 지원신청(활동 전) 기간
ALTER TABLE programs ADD COLUMN IF NOT EXISTS pre_apply_start TEXT;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS pre_apply_end TEXT;
-- applications: 신청 단계 컬럼(기존 테이블)
ALTER TABLE applications ADD COLUMN IF NOT EXISTS application_phase TEXT DEFAULT 'fund';
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "programs public read" ON programs FOR SELECT USING (TRUE);
-- INSERT/UPDATE/DELETE는 service_role(서버)만 → 정책 미부여

-- ---------------------------------------------------------------------
-- 4) 유형 세부내용(홈 모달) — 공개 읽기, 쓰기는 관리자만
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS site_content (
  type TEXT PRIMARY KEY,
  content JSONB NOT NULL
);
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content public read" ON site_content FOR SELECT USING (TRUE);

-- ---------------------------------------------------------------------
-- 4-1) 사이트 설정(푸터·사이드바 등) 키-값 저장 — 서버(service_role)만 접근
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
-- 정책 없음 → anon 직접 접근 불가, 서버 라우트(service_role)로만 읽기/쓰기

-- =====================================================================
-- 5) Storage (증빙 서류 — 신분증/통장/재학증명서 등 민감자료)
--    비공개 버킷 'documents'를 만든 뒤 아래 정책 적용.
--    경로 규칙: {auth.uid()}/{application_id}/{filename}
-- =====================================================================
-- (버킷 생성은 대시보드 Storage 또는: select storage.create_bucket('documents', false); )

-- 본인 폴더에만 업로드/조회 (첫 경로 세그먼트 = 사용자 uid)
CREATE POLICY "own files upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "own files read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
-- 관리자 열람은 서버에서 service_role로 signed URL 발급.

-- =====================================================================
-- 6) 관리자 지정 방법 (택1)
--  (a) 간단: 관리 작업을 모두 서버 API에서 service_role 키로 수행하고,
--      서버가 별도 관리자 비밀번호/세션으로 접근을 통제. (현재 구조 확장)
--  (b) Auth 역할: 관리자 계정의 user_metadata에 role='admin' 부여 후,
--      서버에서 JWT의 role을 확인. 클라이언트엔 절대 권한 부여하지 않음.
-- =====================================================================

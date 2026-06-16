-- 혁신인재지원금 신청 플랫폼 Supabase 테이블 설계
-- Supabase SQL Editor에서 실행하세요.

-- 신청 테이블
CREATE TABLE applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_number TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 기본 정보
  name TEXT NOT NULL,
  student_id TEXT NOT NULL,
  university TEXT NOT NULL,
  department TEXT NOT NULL,
  grade TEXT NOT NULL,
  academic_status TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  application_date DATE NOT NULL,

  -- 계좌 정보
  bank_name TEXT,
  account_number TEXT,
  account_holder TEXT,

  -- 신청 유형
  application_type TEXT NOT NULL CHECK (application_type IN ('program','staff','grade','contest','certificate')),

  -- 유형별 상세 (JSONB)
  program_detail JSONB,
  staff_detail JSONB,
  grade_detail JSONB,
  contest_detail JSONB,
  certificate_detail JSONB,

  -- 파일 목록 (JSONB 배열)
  files JSONB DEFAULT '[]',

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

-- 접수번호 자동 생성 함수
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TRIGGER AS $$
DECLARE
  year_str TEXT;
  seq_num INT;
  new_receipt TEXT;
BEGIN
  year_str := TO_CHAR(NOW(), 'YYYY');
  SELECT COUNT(*) + 1 INTO seq_num FROM applications WHERE TO_CHAR(created_at, 'YYYY') = year_str;
  new_receipt := year_str || '-' || LPAD(seq_num::TEXT, 3, '0');
  NEW.receipt_number := new_receipt;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_receipt_number
  BEFORE INSERT ON applications
  FOR EACH ROW
  WHEN (NEW.receipt_number IS NULL OR NEW.receipt_number = '')
  EXECUTE FUNCTION generate_receipt_number();

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS (Row Level Security) 설정
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- 누구나 INSERT 가능 (신청)
CREATE POLICY "Anyone can apply" ON applications FOR INSERT WITH CHECK (TRUE);

-- 관리자만 SELECT/UPDATE 가능 (service_role 사용)
-- 실제 운영 시 Supabase Auth + 관리자 역할로 세분화 필요
CREATE POLICY "Service role full access" ON applications
  USING (auth.role() = 'service_role');

-- 인덱스
CREATE INDEX idx_applications_student_id ON applications(student_id);
CREATE INDEX idx_applications_review_status ON applications(review_status);
CREATE INDEX idx_applications_payment_status ON applications(payment_status);
CREATE INDEX idx_applications_application_date ON applications(application_date);
CREATE INDEX idx_applications_type ON applications(application_type);

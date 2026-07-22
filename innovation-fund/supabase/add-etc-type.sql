-- 지원금 종류 '기타'(etc) 추가 마이그레이션
-- applications.application_type 의 CHECK 제약에 'etc'를 포함하도록 갱신한다.
-- (Supabase SQL Editor에서 1회 실행. programs.program_type 은 제약이 없어 별도 작업 불필요.)

ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_application_type_check;

ALTER TABLE applications ADD CONSTRAINT applications_application_type_check
  CHECK (application_type IN
    ('program','staff','grade','contest','certificate','labor','etc','activity','club'));

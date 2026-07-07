-- 접수번호 생성 방식 수정 (Supabase SQL Editor에서 1회 실행)
--
-- [문제]
-- 기존 함수는 "그 해의 행 개수 + 1"로 번호를 만들었다:
--   SELECT COUNT(*) + 1 FROM applications WHERE ...
-- 그런데 행이 삭제되는 경우(회원 탈퇴 시 미지급 신청 삭제, 관리자의 테스트 신청 삭제)
-- COUNT가 줄어들어, 다음 신청이 "이미 존재하는 번호"를 받으려다
-- receipt_number UNIQUE 제약에 걸려 신청 저장이 실패할 수 있다.
--
-- [수정]
-- "그 해의 최대 번호 + 1"로 변경 → 삭제가 있어도 번호를 재사용하지 않아 충돌이 없다.
-- (번호 사이 빈 구간은 남지만 정상이다: 임시저장이 번호를 선점하거나, 탈퇴·테스트 삭제로
--  행이 사라진 자리다. 접수번호는 식별용이며 연속일 필요가 없다.)

CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TRIGGER AS $$
DECLARE year_str TEXT; seq_num INT;
BEGIN
  year_str := TO_CHAR(NOW(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SPLIT_PART(receipt_number, '-', 2) AS INT)), 0) + 1
    INTO seq_num
    FROM applications
   WHERE receipt_number LIKE year_str || '-%'
     AND SPLIT_PART(receipt_number, '-', 2) ~ '^[0-9]+$';
  NEW.receipt_number := year_str || '-' || LPAD(seq_num::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거는 기존 그대로 사용 (BEFORE INSERT, receipt_number가 비어 있을 때만)
-- CREATE TRIGGER set_receipt_number ... 재생성 불필요.

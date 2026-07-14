-- 접수번호 생성 방식 수정 (Supabase SQL Editor에서 1회 실행)
--
-- [문제]
-- 기존 함수는 "그 해의 행 개수 + 1"로 번호를 만들었다:
--   SELECT COUNT(*) + 1 FROM applications WHERE ...
-- 이 방식은 두 가지 상황에서 이미 존재하는 번호를 다시 만들어
-- receipt_number UNIQUE 제약("applications_receipt_number_key")에 걸려 신청 저장이 실패한다.
--   1) 행 삭제: 회원 탈퇴 시 미지급 신청 삭제, 관리자의 테스트 신청 삭제 → COUNT가 줄어들어 번호 재사용
--   2) 동시 제출: 두 신청이 같은 순간에 들어오면 둘 다 같은 COUNT를 읽어 같은 번호 생성
--
-- [수정]
--   - "그 해의 최대 번호 + 1"로 변경 → 삭제가 있어도 번호를 재사용하지 않는다.
--   - 연도별 자문 잠금(pg_advisory_xact_lock)으로 동시 제출을 직렬화 → 경쟁 충돌 제거.
--   - SECURITY DEFINER + search_path 고정 → RLS(신청자는 본인 행만 조회) 영향 없이
--     전체 행 기준으로 순번을 계산한다.
-- (번호 사이 빈 구간은 남을 수 있으나 정상이다: 임시저장 선점·탈퇴/테스트 삭제 자리.
--  접수번호는 식별용이며 연속일 필요가 없다.)

CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE year_str TEXT; seq_num INT;
BEGIN
  year_str := TO_CHAR(NOW(), 'YYYY');
  -- 동시 제출 시 순번 경쟁 방지: 같은 연도 접수번호 발급을 트랜잭션 단위로 직렬화
  PERFORM pg_advisory_xact_lock(hashtext('applications_receipt_' || year_str));
  -- 그 해의 최대 순번 + 1 (숫자형 접미사만 대상)
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

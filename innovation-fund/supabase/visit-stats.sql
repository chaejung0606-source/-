-- 일일 방문자 집계 (visit_stats) — 날짜별 카운트 + 원자적 증가 함수
-- Supabase SQL Editor에서 1회 실행하세요. (서버 API의 service_role만 접근)

CREATE TABLE IF NOT EXISTS visit_stats (
  date  DATE PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);

-- 직접 접근 차단 — 증가/조회는 서버 API(service_role)만 수행 (익명 조작 방지)
ALTER TABLE visit_stats ENABLE ROW LEVEL SECURITY;

-- 하루 방문 +1 (동시 접속에도 안전한 원자적 upsert)
CREATE OR REPLACE FUNCTION bump_visit(d DATE)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO visit_stats(date, count) VALUES (d, 1)
  ON CONFLICT (date) DO UPDATE SET count = visit_stats.count + 1;
$$;

-- 익명/로그인 사용자의 직접 호출 차단, 서버(service_role)만 실행
REVOKE ALL ON FUNCTION bump_visit(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION bump_visit(DATE) TO service_role;

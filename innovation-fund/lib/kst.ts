// 한국시간(KST) 기준 오늘 날짜 "YYYY-MM-DD".
// new Date().toISOString()는 UTC라서 한국 새벽 0~9시에 '어제'가 되는 문제(팝업 게시기간·
// 신청기간 판정이 하루 어긋남)를 막기 위해 반드시 이 헬퍼를 사용한다.
// (서버는 UTC, 브라우저는 사용자 로컬 — 어디서 실행돼도 동일하게 KST 날짜를 준다)
export function kstToday(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

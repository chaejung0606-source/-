// 관리자 개인정보 메뉴 비밀번호 게이트 — "메뉴를 클릭했을 때만" 재확인.
// 비밀번호 통과 여부를 sessionStorage(탭 단위)에 보관해, 메뉴 '안'에서의 이동
// (예: 신청 목록 ↔ 신청 상세)에는 다시 묻지 않는다.
// 좌측 메뉴를 다시 클릭하면 AdminLayout이 플래그를 지워 새로 확인한다.
// 새 탭·새 창은 sessionStorage가 비어 있으므로 자동으로 다시 확인한다.

const PREFIX = "adminPwGate:";

export function isGateUnlocked(menu: string): boolean {
  try { return sessionStorage.getItem(PREFIX + menu) === "1"; } catch { return false; }
}
export function unlockGate(menu: string): void {
  try { sessionStorage.setItem(PREFIX + menu, "1"); } catch { /* ignore */ }
}
export function lockGate(menu: string): void {
  try { sessionStorage.removeItem(PREFIX + menu); } catch { /* ignore */ }
}

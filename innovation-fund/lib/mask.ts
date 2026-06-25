// 화면 표시용 민감정보 마스킹 (저장값 자체는 평문/암호화 그대로, 표시만 가림).
// 인쇄·내보내기 문서에서는 마스킹하지 않고 전체 표시한다.

// 계좌번호: 마지막 4자리만 노출, 나머지 숫자는 ● 처리 (구분기호 -는 유지)
export function maskAccountNumber(value: string | undefined | null): string {
  const s = String(value ?? "");
  if (!s) return "";
  const digits = s.replace(/\D/g, "");
  if (digits.length <= 4) return s;
  const visible = 4;
  let shown = 0;
  // 뒤에서부터 4자리 숫자만 남기고 앞 숫자는 ● 로 치환, 구분기호는 그대로
  return s
    .split("")
    .reverse()
    .map((ch) => {
      if (/\d/.test(ch)) {
        shown += 1;
        return shown <= visible ? ch : "●";
      }
      return ch;
    })
    .reverse()
    .join("");
}

// 주민등록번호: 생년월일 6자리만 노출, 뒤 7자리는 ● 처리 (예: 900101-●●●●●●●)
export function maskResidentNumber(value: string | undefined | null): string {
  const s = String(value ?? "");
  if (!s) return "";
  const digits = s.replace(/\D/g, "");
  if (digits.length <= 6) return s;
  const front = digits.slice(0, 6);
  const back = "●".repeat(digits.length - 6);
  return `${front}-${back}`;
}

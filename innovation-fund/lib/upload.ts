// 신청자 업로드 파일 제한: 이미지 또는 PDF만 허용
export const ACCEPT_DOC = ".pdf,.jpg,.jpeg,.png,.webp,.heic";
export const DOC_GUIDE = "이미지(JPG·PNG·WEBP) 또는 PDF 파일만 업로드할 수 있습니다.";

// 파일 용량 상한(클라이언트 사전 안내용). Storage 버킷 기본 상한(50MB)과 동일하게 맞춰
// 서버가 어차피 거부할 파일에 대해서만 친절한 한글 안내를 먼저 띄운다(정상 업로드 회귀 없음).
export const MAX_DOC_MB = 50;
export const MAX_DOC_BYTES = MAX_DOC_MB * 1024 * 1024;

export function isAllowedDoc(file: File): boolean {
  const t = (file.type || "").toLowerCase();
  if (t === "application/pdf") return true;
  if (t.startsWith("image/")) return true;
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  return ["pdf", "jpg", "jpeg", "png", "webp", "gif", "heic", "heif"].includes(ext);
}

// 용량 초과 여부(true = 정상 범위). 0바이트 파일도 거부한다.
export function isDocSizeOk(file: File): boolean {
  return file.size > 0 && file.size <= MAX_DOC_BYTES;
}

// 용량 문제 안내 문구(빈 파일 / 초과 구분)
export function docSizeMessage(file: File): string {
  const mb = (file.size / (1024 * 1024)).toFixed(1);
  if (file.size <= 0) return `빈 파일입니다(0바이트).\n${file.name} — 다른 파일을 선택해주세요.`;
  return `파일 용량이 너무 큽니다 (최대 ${MAX_DOC_MB}MB).\n${file.name} — ${mb}MB\n용량을 줄이거나 PDF로 변환해 다시 시도해주세요.`;
}

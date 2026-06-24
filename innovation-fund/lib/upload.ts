// 신청자 업로드 파일 제한: 이미지 또는 PDF만 허용
export const ACCEPT_DOC = ".pdf,.jpg,.jpeg,.png,.webp,.heic";
export const DOC_GUIDE = "이미지(JPG·PNG·WEBP) 또는 PDF 파일만 업로드할 수 있습니다.";

export function isAllowedDoc(file: File): boolean {
  const t = (file.type || "").toLowerCase();
  if (t === "application/pdf") return true;
  if (t.startsWith("image/")) return true;
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  return ["pdf", "jpg", "jpeg", "png", "webp", "gif", "heic", "heif"].includes(ext);
}

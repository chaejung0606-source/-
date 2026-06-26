// 민감 개인정보(주민등록번호 등) 저장용 대칭 암호화 (AES-256-GCM).
// 키: PII_ENCRYPTION_KEY 우선, 없으면 SUPABASE_SERVICE_ROLE_KEY 파생(서버 전용).
import crypto from "crypto";

// 키: PII_ENCRYPTION_KEY 우선, 없으면 SUPABASE_SERVICE_ROLE_KEY 파생.
// 하드코딩 폴백 금지 — 둘 다 없으면 예외(fail-closed)로 안전하게 실패한다.
function getKey(): Buffer {
  const secret = process.env.PII_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("PII 암호화 키 미설정: PII_ENCRYPTION_KEY(권장) 또는 SUPABASE_SERVICE_ROLE_KEY 필요");
  return crypto.createHash("sha256").update(secret).digest(); // 32 bytes
}
const PREFIX = "enc:v1:";

export function encryptPII(plain: string | undefined | null): string {
  if (!plain) return "";
  if (String(plain).startsWith(PREFIX)) return String(plain); // 이미 암호화됨
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptPII(value: string | undefined | null): string {
  if (!value) return "";
  const s = String(value);
  if (!s.startsWith(PREFIX)) return s; // 평문(구버전) 호환
  try {
    const raw = Buffer.from(s.slice(PREFIX.length), "base64");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const data = raw.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch { return ""; }
}

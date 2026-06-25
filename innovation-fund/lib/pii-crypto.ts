// 민감 개인정보(주민등록번호 등) 저장용 대칭 암호화 (AES-256-GCM).
// 키: PII_ENCRYPTION_KEY 우선, 없으면 SUPABASE_SERVICE_ROLE_KEY 파생(서버 전용).
import crypto from "crypto";

const KEY = crypto.createHash("sha256")
  .update(process.env.PII_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "dev-insecure-pii-key")
  .digest(); // 32 bytes
const PREFIX = "enc:v1:";

export function encryptPII(plain: string | undefined | null): string {
  if (!plain) return "";
  if (String(plain).startsWith(PREFIX)) return String(plain); // 이미 암호화됨
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
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
    const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch { return ""; }
}

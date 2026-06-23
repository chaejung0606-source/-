import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// 버전: package.json의 version을 그대로 사용.
// (Vercel은 git을 얕게 클론해 빌드 시 커밋 수를 못 세므로, 푸시 건수는
//  커밋 시점에 scripts/sync-version.mjs로 package.json에 미리 기록한다.)
let pkgVersion = "1.0.0";
try {
  const pkg = JSON.parse(readFileSync(join(__dirname, "package.json"), "utf8"));
  pkgVersion = pkg.version || pkgVersion;
} catch { /* ignore */ }

const buildVersion = `v${pkgVersion}`;

// 업데이트 일시: 한국시간(KST, UTC+9) 기준 "yyyy-mm-dd HH:MM" (24시간제)
const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
const p = (n) => String(n).padStart(2, "0");
const buildDate = `${kst.getUTCFullYear()}-${p(kst.getUTCMonth() + 1)}-${p(kst.getUTCDate())} ${p(kst.getUTCHours())}:${p(kst.getUTCMinutes())}`;

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_VERSION: buildVersion,
    NEXT_PUBLIC_BUILD_DATE: buildDate,
  },
};

export default nextConfig;

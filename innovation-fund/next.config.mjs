import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function tryGit(cmd) {
  try { return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); }
  catch { return ""; }
}

// 버전: major.minor 는 package.json, patch 는 깃허브 푸시(커밋) 건수로 자동 결정
let base = "1.0";
try {
  const pkg = JSON.parse(readFileSync(join(__dirname, "package.json"), "utf8"));
  const parts = String(pkg.version || "1.0.0").split(".");
  base = `${parts[0] || "1"}.${parts[1] || "0"}`;
} catch { /* ignore */ }

const commitCount = tryGit("git rev-list --count HEAD");
const buildVersion = `v${base}.${commitCount || "0"}`;

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

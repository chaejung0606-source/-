import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// 버전: package.json의 version을 단일 출처로 사용 (배포마다 patch 자동 증가)
// 업데이트 일자: 빌드 시점 기준 자동 생성
let pkgVersion = "0.0.0";
try {
  const pkg = JSON.parse(readFileSync(join(__dirname, "package.json"), "utf8"));
  pkgVersion = pkg.version || pkgVersion;
} catch { /* ignore */ }

const buildVersion = `v${pkgVersion}`;
const buildDate = new Date().toISOString().slice(0, 10);

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_VERSION: buildVersion,
    NEXT_PUBLIC_BUILD_DATE: buildDate,
  },
};

export default nextConfig;

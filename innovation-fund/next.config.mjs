import { execSync } from "node:child_process";

function tryGit(cmd) {
  try { return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); }
  catch { return ""; }
}

// 빌드(업데이트) 시점마다 버전/업데이트 일자 자동 생성
const commitCount = tryGit("git rev-list --count HEAD");
const buildVersion = commitCount ? `v1.0.${commitCount}` : "v1.0.0";
const buildDate = new Date().toISOString().slice(0, 10);

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_VERSION: buildVersion,
    NEXT_PUBLIC_BUILD_DATE: buildDate,
  },
};

export default nextConfig;

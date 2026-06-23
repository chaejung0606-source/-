// package.json의 patch 버전을 1 증가시킨다.
// 사용: npm run bump  (배포 전 실행 → 커밋/푸시하면 엔드바 버전이 자동 반영됨)
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = join(__dirname, "..", "package.json");

const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const [major, minor, patch] = String(pkg.version || "0.0.0").split(".").map((n) => parseInt(n, 10) || 0);
const next = `${major}.${minor}.${patch + 1}`;
pkg.version = next;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
console.log(`version: ${major}.${minor}.${patch} → ${next}`);

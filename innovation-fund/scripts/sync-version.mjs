// 배포(푸시)할 때마다 patch 버전을 1씩 올린다.
// next.config.mjs가 이 package.json의 version을 그대로 엔드바에 표시한다.
// (Vercel은 master를 squash로 받아 git 커밋 수가 작으므로, 커밋 수에 의존하지 않고
//  package.json에 값을 직접 기록해 환경과 무관하게 단조 증가하도록 한다.)
// 사용: npm run sync-version  → 직후 커밋/푸시
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = join(__dirname, "..", "package.json");

const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const [major, minor, patch] = String(pkg.version || "1.0.0").split(".").map((n) => parseInt(n, 10) || 0);
const next = `${major}.${minor}.${patch + 1}`;
pkg.version = next;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
console.log(`version: ${major}.${minor}.${patch} → ${next}`);

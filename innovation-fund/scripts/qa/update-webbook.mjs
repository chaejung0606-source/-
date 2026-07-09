// QA 결과를 매뉴얼 웹북에 반영 — 헤더의 QA 상태 배지(통과수·검증일·버전)를 갱신하고 public/으로 배포 복사.
// 사용: node scripts/qa/update-webbook.mjs   (scripts/qa/artifacts/e2e-results.json 필요)
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(".");
const OUT = process.env.QA_OUT || path.join(ROOT, "scripts/qa/artifacts");
const WEBBOOK = path.join(ROOT, "docs/manual-webbook.html");
const PUBLIC = path.join(ROOT, "public/manual-webbook.html");

const resultsPath = path.join(OUT, "e2e-results.json");
if (!fs.existsSync(resultsPath)) { console.error("결과 파일 없음:", resultsPath); process.exit(2); }
const r = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const date = String(r.ranAt || "").slice(0, 10) || "-";
const ok = r.passed === r.total;
const badge = `기준 버전 v${pkg.version} · QA ${r.passed}/${r.total} ${ok ? "통과" : "실패"} (${date})`;

let html = fs.readFileSync(WEBBOOK, "utf8");
const marker = /<!--QA_STATUS-->[\s\S]*?<!--\/QA_STATUS-->/;
if (!marker.test(html)) { console.error("웹북에 QA_STATUS 마커가 없습니다."); process.exit(2); }
html = html.replace(marker, `<!--QA_STATUS-->${badge}<!--/QA_STATUS-->`);
fs.writeFileSync(WEBBOOK, html);

// 앱에서 /manual-webbook.html 로 서빙되도록 public/ 에 배포 복사
fs.mkdirSync(path.dirname(PUBLIC), { recursive: true });
fs.copyFileSync(WEBBOOK, PUBLIC);

console.log(`웹북 갱신: ${badge}`);
console.log(`복사: ${path.relative(ROOT, PUBLIC)}`);
process.exit(ok ? 0 : 1);

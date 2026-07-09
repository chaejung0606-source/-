// QA 파이프라인 — 목 백엔드 기동 → 앱 빌드·기동 → 런타임 클릭 테스트(27개) → 웹북 갱신 → 정리.
// 사용: npm run qa:webbook   (배포 전 또는 CI에서 실행)
// 옵션 env: SKIP_BUILD=1(빌드 생략, 이미 .next 있을 때), QA_KEEP_SERVER=1(디버그용 서버 유지)
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";

const ROOT = path.resolve(".");
const QA = path.join(ROOT, "scripts/qa");
const OUT = path.join(QA, "artifacts");
fs.mkdirSync(OUT, { recursive: true });

// 목 백엔드에 맞춘 테스트 환경변수 (실제 운영 키와 무관 — CI/로컬 QA 전용)
const env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "qa-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "qa-service-role-key",
  ADMIN_SESSION_SECRET: "qa-admin-session-secret",
  QA_BASE: "http://localhost:3000",
  QA_OUT: OUT,
};

// Chromium 실행 파일 탐색(PW_CHROMIUM 우선 → PLAYWRIGHT_BROWSERS_PATH 하위 chromium-*/chrome)
function findChromium() {
  if (process.env.PW_CHROMIUM) return process.env.PW_CHROMIUM;
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || "/opt/pw-browsers";
  try {
    for (const d of fs.readdirSync(base)) {
      if (!d.startsWith("chromium-")) continue;
      for (const cand of [path.join(base, d, "chrome-linux/chrome"), path.join(base, d, "chrome-linux/headless_shell")]) {
        if (fs.existsSync(cand)) return cand;
      }
    }
  } catch {}
  return ""; // 비우면 playwright-core 기본값(대개 실패) — CI는 PW_CHROMIUM 설정 권장
}
env.PW_CHROMIUM = findChromium();

const procs = [];
function cleanup() {
  for (const p of procs) { try { process.kill(-p.pid, "SIGKILL"); } catch {} try { p.kill("SIGKILL"); } catch {} }
}
process.on("exit", cleanup);
process.on("SIGINT", () => { cleanup(); process.exit(130); });

function bg(cmd, args, name) {
  const p = spawn(cmd, args, { env, cwd: ROOT, detached: true, stdio: ["ignore", "pipe", "pipe"] });
  const logf = fs.createWriteStream(path.join(OUT, `${name}.log`));
  p.stdout.pipe(logf); p.stderr.pipe(logf);
  procs.push(p);
  return p;
}
function waitHttp(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const tick = () => {
      const req = http.get(url, (res) => { res.resume(); resolve(true); });
      req.on("error", () => {
        if (Date.now() - t0 > timeoutMs) reject(new Error("timeout: " + url));
        else setTimeout(tick, 500);
      });
    };
    tick();
  });
}

async function main() {
  console.log("① 목 Supabase 백엔드 기동");
  bg("node", [path.join(QA, "mock-supabase.mjs")], "mock");
  await waitHttp("http://127.0.0.1:54321/__dump", 15000);

  if (!process.env.SKIP_BUILD) {
    console.log("② next build");
    const b = spawnSync("npm", ["run", "build"], { env, cwd: ROOT, stdio: "inherit" });
    if (b.status !== 0) throw new Error("build 실패");
  } else console.log("② 빌드 생략(SKIP_BUILD)");

  console.log("③ next start");
  bg("npm", ["run", "start"], "app");
  await waitHttp("http://localhost:3000/", 60000);

  console.log("④ 런타임 클릭 테스트(e2e) 실행");
  const chromium = env.PW_CHROMIUM ? `(chromium: ${env.PW_CHROMIUM})` : "(chromium: playwright 기본)";
  console.log("   " + chromium);
  const e = spawnSync("node", [path.join(QA, "e2e.mjs")], { env, cwd: ROOT, stdio: "inherit" });

  console.log("⑤ 매뉴얼 웹북 갱신");
  spawnSync("node", [path.join(QA, "update-webbook.mjs")], { env, cwd: ROOT, stdio: "inherit" });

  if (process.env.QA_KEEP_SERVER) { console.log("QA_KEEP_SERVER — 서버 유지(수동 종료 필요)"); return; }
  cleanup();
  process.exit(e.status === 0 ? 0 : 1);
}

main().catch((err) => { console.error("QA 파이프라인 오류:", err.message); cleanup(); process.exit(1); });

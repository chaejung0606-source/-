/**
 * 매뉴얼용 화면 캡처 자동화 (Playwright)
 * ------------------------------------------------------------------
 * 실행 환경: Supabase 백엔드가 연결되고 앱이 떠 있는 상태 + 테스트 학생 계정.
 *
 *   npm i -D playwright && npx playwright install chromium   # 최초 1회
 *   BASE_URL=http://localhost:3000 \
 *   TEST_USER_ID=학번 TEST_USER_PW=비번 \
 *   node scripts/capture-docs-screenshots.js
 *
 * ※ 개인정보 보호: 관리자 화면은 실제 학생 개인정보가 표시되므로 캡처하지 않는다.
 *   화면 캡처는 신청자(사용자) 매뉴얼 전용이며, 공개 화면 + 테스트 학생 본인 데이터만 담긴다.
 * 결과: docs/images/*.png (기존 이미지 갱신). 실패 목록은 콘솔에 출력.
 * 각 캡처는 클릭 순서/입력 위치 번호를 화면에 오버레이로 표시할 수 있다(annotate).
 * ------------------------------------------------------------------
 */
const fs = require("fs");
const path = require("path");

const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const OUT_DIR = path.join(__dirname, "..", "docs", "images");
const EXEC = process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined; // 사내/원격 크로미움 지정 시

const USER = { id: process.env.TEST_USER_ID || "", pw: process.env.TEST_USER_PW || "" };

// 캡처 대상 정의. auth: none | user | admin
// annotate: [{ selector, n, note }] → 해당 요소 위에 번호 뱃지를 그려 클릭 순서/입력 위치 표시
const SHOTS = [
  // ---- 공개(사용자) ----
  { name: "login-screen", url: "/login", auth: "none",
    annotate: [{ text: "① 로그인 탭", x: 40, y: 90 }, { text: "② 학번/비밀번호 입력", x: 40, y: 170 }, { text: "③ [로그인]", x: 40, y: 300 }] },
  { name: "signup-screen", url: "/login", auth: "none", pre: async (p) => { const b = await p.$('text=회원가입'); if (b) await b.click(); } },
  { name: "home-user", url: "/", auth: "none" },
  { name: "privacy", url: "/privacy", auth: "none" },
  { name: "guide", url: "/guide", auth: "none" },
  { name: "space-rental", url: "/space-rental", auth: "none" },
  { name: "menu-fund", url: "/menu/fund", auth: "none" },

  // ---- 로그인 사용자 (테스트 학생 계정 — 본인 데이터만 노출) ----
  { name: "apply-type-select", url: "/apply", auth: "user" },
  { name: "apply-pre-select", url: "/apply?mode=pre", auth: "user" },
  { name: "mypage", url: "/mypage", auth: "user" },
  { name: "apply-complete", url: "/apply/complete?receipt=DEMO-000&date=2026-07-06&type=%EC%84%B1%EC%A0%81%20%EC%9A%B0%EC%88%98%20%EC%A7%80%EC%9B%90%EA%B8%88&amount=1000000&phase=fund", auth: "user" },

  // ※ 관리자 화면은 실제 학생 개인정보(PII)가 표시되므로 캡처하지 않는다.
  //   관리자 매뉴얼(admin-guide.md)은 화면 캡처 없이 텍스트로 운영한다.
];

async function ping(url) {
  try { const r = await fetch(url, { method: "GET" }); return r.ok || r.status < 500; } catch { return false; }
}

// 사용자 로그인: /login 폼 제출
async function loginUser(page) {
  if (!USER.id || !USER.pw) throw new Error("TEST_USER_ID/PW 미설정");
  await page.goto(BASE_URL + "/login", { waitUntil: "networkidle" });
  await page.fill('input[placeholder="학번"]', USER.id);
  await page.fill('input[type="password"]', USER.pw);
  await page.click('button:has-text("로그인")');
  await page.waitForTimeout(1500);
}
// 번호 뱃지 오버레이 (클릭 순서/입력 위치 표시)
async function annotate(page, marks) {
  if (!marks || !marks.length) return;
  await page.evaluate((items) => {
    for (const m of items) {
      const d = document.createElement("div");
      d.textContent = m.text || "";
      Object.assign(d.style, {
        position: "fixed", left: (m.x || 20) + "px", top: (m.y || 20) + "px",
        background: "#e11d48", color: "#fff", font: "700 12px sans-serif",
        padding: "3px 8px", borderRadius: "999px", zIndex: 999999,
        boxShadow: "0 2px 8px rgba(0,0,0,.3)", whiteSpace: "nowrap",
      });
      document.body.appendChild(d);
    }
  }, marks);
}

(async () => {
  let chromium;
  try { ({ chromium } = require("playwright")); }
  catch { console.error("playwright 미설치 → `npm i -D playwright` 후 다시 실행하세요."); process.exit(1); }

  if (!(await ping(BASE_URL))) {
    console.error(`플랫폼이 응답하지 않습니다: ${BASE_URL}\n먼저 앱을 실행하세요 (npm run dev 또는 npm run start).`);
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ executablePath: EXEC });
  const failed = [];
  // 세션별 컨텍스트 (none/user/admin)
  const ctx = { none: await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "ko-KR" }) };
  try {
    if (USER.id) { ctx.user = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "ko-KR" }); await loginUser(await ctx.user.newPage()); }
    // 관리자 캡처는 하지 않으므로 admin 세션은 생성하지 않는다(개인정보 보호).
  } catch (e) { console.warn("로그인 준비 경고:", e.message); }

  for (const shot of SHOTS) {
    const context = ctx[shot.auth] || ctx.none;
    if (shot.auth !== "none" && !ctx[shot.auth]) { failed.push(`${shot.name} (테스트 ${shot.auth} 계정 미설정)`); continue; }
    const page = await context.newPage();
    try {
      await page.goto(BASE_URL + shot.url, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(1200);
      if (shot.pre) await shot.pre(page);
      await page.waitForTimeout(600);
      await annotate(page, shot.annotate);
      await page.screenshot({ path: path.join(OUT_DIR, shot.name + ".png"), fullPage: true });
      console.log("✓ " + shot.name + ".png");
    } catch (e) {
      failed.push(`${shot.name} (${e.message})`);
      console.warn("✗ " + shot.name + " — " + e.message);
    } finally { await page.close(); }
  }

  await browser.close();
  console.log("\n완료. 저장 위치: " + OUT_DIR);
  if (failed.length) { console.log("\n실패/건너뜀:"); failed.forEach((f) => console.log("  - " + f)); process.exitCode = 2; }
})();

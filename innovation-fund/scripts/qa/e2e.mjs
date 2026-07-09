// 런타임 클릭 테스트(QA) — 실제 앱 + 목 Supabase + Chromium으로 27개 시나리오를 사람처럼 클릭 검증.
// 환경변수: QA_BASE(기본 http://localhost:3000), PW_CHROMIUM(크로미움 실행 파일 경로; 없으면 playwright 기본),
//           QA_OUT(산출물 디렉토리; 기본 scripts/qa/artifacts)
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.QA_BASE || "http://localhost:3000";
const EXE = process.env.PW_CHROMIUM || undefined; // 없으면 PLAYWRIGHT_BROWSERS_PATH 기반 기본값
const OUT = process.env.QA_OUT || path.resolve("scripts/qa/artifacts");
const SHOTS = path.join(OUT, "shots");
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
const log = (...a) => console.log(...a);
async function step(id, desc, fn) {
  try { await fn(); results.push({ id, desc, pass: true }); log("PASS", id, desc); }
  catch (e) {
    results.push({ id, desc, pass: false, err: String(e).split("\n")[0].slice(0, 400) });
    log("FAIL", id, desc, "→", String(e).split("\n")[0]);
    for (const [nm, pg] of [["A", pageA], ["PM", pagePM], ["EX", pageEX]]) {
      try { await pg.screenshot({ path: `${SHOTS}/fail-${id}-${nm}.jpg`, type: "jpeg", quality: 55 }); } catch {}
    }
  }
}
function watch(page) {
  const store = { dialogs: [], prompt: "" };
  page.on("dialog", async (d) => {
    store.dialogs.push({ type: d.type(), message: d.message() });
    try { if (d.type() === "prompt") await d.accept(store.prompt); else await d.accept(); } catch {}
  });
  return store;
}
const last = (s) => (s.dialogs.length ? s.dialogs[s.dialogs.length - 1].message : "");
function expectIncl(actual, expected) {
  if (!String(actual).includes(expected)) throw new Error(`기대 문구 불일치: "${expected}" ∉ "${String(actual).slice(0, 160)}"`);
}
async function shot(page, name, fullPage = true) {
  await page.screenshot({ path: `${SHOTS}/${name}.jpg`, type: "jpeg", quality: 72, fullPage });
  log("  📷", name);
}
async function drawSign(page) {
  const canvas = page.locator("canvas").first();
  await canvas.scrollIntoViewIfNeeded();
  const b = await canvas.boundingBox();
  if (!b) throw new Error("서명 캔버스 없음");
  const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
  await page.mouse.move(cx - 60, cy - 10);
  await page.mouse.down();
  for (let i = 0; i <= 12; i++) await page.mouse.move(cx - 60 + i * 10, cy - 10 + Math.sin(i) * 14, { steps: 2 });
  await page.mouse.up();
  await page.waitForTimeout(300);
}
async function firstOption(page) { await page.locator(".max-h-56 button").first().click(); }
async function agreeAll(page) {
  // 신청서 동의(hidden checkbox) — '아래 내용에 모두 동의합니다.' 라벨 클릭
  const all = page.locator('label:has-text("아래 내용에 모두 동의합니다")').first();
  if (await all.isVisible().catch(() => false)) { await all.click(); return; }
  const labels = page.locator('label:has-text("[필수]")');
  const n = await labels.count();
  for (let i = 0; i < n; i++) await labels.nth(i).click().catch(() => {});
}
async function adminGate(page, pw) {
  const gate = page.getByPlaceholder("관리자 비밀번호");
  const shown = await gate.waitFor({ state: "visible", timeout: 10000 }).then(() => true).catch(() => false);
  if (shown) {
    await gate.fill(pw);
    await page.getByRole("button", { name: "확인", exact: true }).click();
    await page.waitForTimeout(1000);
  }
}
async function adminLogin(page, id, pw) {
  await page.goto(BASE + "/admin/login", { waitUntil: "networkidle", timeout: 40000 }).catch(() => {});
  const idIn = page.getByPlaceholder("관리자 아이디");
  await idIn.waitFor({ state: "visible", timeout: 15000 });
  await idIn.click(); await idIn.fill(id);
  const pwIn = page.getByPlaceholder("비밀번호");
  await pwIn.click(); await pwIn.fill(pw);
  for (let k = 0; k < 3 && !(await idIn.inputValue().catch(() => "")); k++) { await idIn.fill(id); await page.waitForTimeout(150); }
  const btn = page.getByRole("button", { name: "로그인", exact: true });
  await page.waitForFunction(() => {
    const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "로그인");
    return b && !b.disabled;
  }, { timeout: 6000 }).catch(() => {});
  await btn.click();
  await page.waitForURL((u) => u.pathname === "/", { timeout: 20000 });
}
async function fillAndSubmitForm(page, descText, dstore) {
  for (let i = 0; i < 10; i++) {
    const ta = page.locator("textarea").first();
    if (await ta.isVisible().catch(() => false)) {
      const cur = await ta.inputValue().catch(() => "x");
      if (!cur || cur.length < 3) await ta.fill(descText);
    }
    await agreeAll(page);
    await page.waitForTimeout(400);
    if (await page.locator("canvas").first().isVisible().catch(() => false)) await drawSign(page);
    const submit = page.getByRole("button", { name: /^신청 제출$|^지원신청 제출$/ });
    if (await submit.isVisible().catch(() => false)) {
      if (dstore) dstore.dialogs.length = 0;
      await submit.click();
      await page.waitForTimeout(1600);
      if (/\/apply\/complete/.test(page.url())) return true;
      continue;
    }
    const next = page.getByRole("button", { name: /다음 단계|^다음$/ });
    if (await next.isVisible().catch(() => false)) { await next.click(); await page.waitForTimeout(700); }
    else break;
  }
  return /\/apply\/complete/.test(page.url());
}
const APP = { sid: "20269999", pw: "Test1234!", name: "김테스트" };
const EXP = { id: "20182135", pw: "Admin!Test2026" };
const PM = { id: "pm-test", pw: "Pm!Test2026" };

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const vp = { viewport: { width: 1280, height: 900 } };
const ctxA = await browser.newContext(vp); const pageA = await ctxA.newPage(); const dA = watch(pageA);
const ctxPM = await browser.newContext(vp); const pagePM = await ctxPM.newPage(); const dPM = watch(pagePM);
const ctxEX = await browser.newContext(vp); const pageEX = await ctxEX.newPage(); const dEX = watch(pageEX);

// ============ A. 홈 ============
await step("A1", "홈 렌더 + 유형 카드 모달", async () => {
  await pageA.goto(BASE + "/", { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
  await pageA.waitForSelector("text=프로그램 참여지원비", { timeout: 20000 });
  await shot(pageA, "home");
  await pageA.locator("text=프로그램 참여지원비").first().click();
  await pageA.waitForTimeout(700);
  await shot(pageA, "home-type-modal", false);
  await pageA.keyboard.press("Escape");
  const close = pageA.getByRole("button", { name: /닫기/ }).first();
  if (await close.isVisible().catch(() => false)) await close.click();
});

// ============ B. 회원가입/로그인 ============
await step("B1", "회원가입 필수 누락 차단", async () => {
  await pageA.goto(BASE + "/login?next=/", { waitUntil: "domcontentloaded" });
  await shot(pageA, "login", false);
  await pageA.getByRole("button", { name: "회원가입", exact: true }).click();
  await pageA.getByRole("button", { name: /회원가입 후 시작하기/ }).click();
  await pageA.waitForTimeout(400);
  const err = await pageA.locator("text=다음 항목을 모두 입력해주세요").first().textContent({ timeout: 4000 });
  expectIncl(err, "다음 항목을 모두 입력해주세요");
});
await step("B2", "회원가입 8자 미만/불일치/미동의 차단 후 가입 성공", async () => {
  const p = pageA;
  await p.getByPlaceholder("숫자만").fill(APP.sid);
  await p.locator('xpath=//label[contains(.,"이름")]/following-sibling::input[1]').first().fill(APP.name);
  await p.getByRole("button", { name: "대학생", exact: true }).click();
  await p.getByRole("button", { name: /캠퍼스 선택/ }).click(); await firstOption(p);
  await p.getByRole("button", { name: /단과대학 선택/ }).click(); await firstOption(p);
  await p.getByRole("button", { name: /학과 선택/ }).click(); await firstOption(p);
  await p.getByPlaceholder("010-0000-0000").fill("01012345678");
  await p.getByPlaceholder("id@kangwon.ac.kr").fill("test@kangwon.ac.kr");
  await p.locator("select").first().selectOption({ index: 1 });
  await p.getByPlaceholder("예금주").fill(APP.name);
  await p.getByPlaceholder("계좌번호 (- 없이)").fill("110123456789");
  await p.getByPlaceholder("8자 이상").fill("abc");
  await p.locator('xpath=//label[contains(.,"비밀번호 확인")]/following-sibling::input[1]').first().fill("abc");
  await p.getByRole("button", { name: /회원가입 후 시작하기/ }).click();
  await p.waitForTimeout(300);
  expectIncl(await p.locator("text=비밀번호는 8자").first().textContent(), "8자 이상이어야 합니다");
  await p.getByPlaceholder("8자 이상").fill(APP.pw);
  await p.locator('xpath=//label[contains(.,"비밀번호 확인")]/following-sibling::input[1]').first().fill(APP.pw + "x");
  await p.getByRole("button", { name: /회원가입 후 시작하기/ }).click();
  await p.waitForTimeout(300);
  expectIncl(await p.locator("text=일치하지 않습니다").first().textContent(), "일치하지 않습니다");
  await p.locator('xpath=//label[contains(.,"비밀번호 확인")]/following-sibling::input[1]').first().fill(APP.pw);
  await p.getByRole("button", { name: /회원가입 후 시작하기/ }).click();
  await p.waitForTimeout(300);
  expectIncl(await p.locator("text=동의해야 회원가입").first().textContent(), "동의해야 회원가입이 가능합니다");
  await shot(p, "signup-validation", false);
  await p.locator('input[type="checkbox"]').first().check();
  await shot(p, "signup-filled");
  await p.getByRole("button", { name: /회원가입 후 시작하기/ }).click();
  await p.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 });
});
await step("B3", "로그인 실패 문구 + 재로그인", async () => {
  const p = pageA;
  await p.goto(BASE + "/login?next=/mypage", { waitUntil: "domcontentloaded" });
  await p.getByPlaceholder("학번").fill(APP.sid);
  await p.getByPlaceholder("비밀번호").fill("wrong-pass");
  await p.getByRole("button", { name: "로그인", exact: true }).last().click();
  await p.waitForTimeout(600);
  expectIncl(await p.locator("text=올바르지 않습니다").first().textContent(), "학번 또는 비밀번호가 올바르지 않습니다");
  await p.getByPlaceholder("비밀번호").fill(APP.pw);
  await p.getByRole("button", { name: "로그인", exact: true }).last().click();
  await p.waitForURL(/\/mypage/, { timeout: 20000 });
});

// ============ C. 지원금 신청 ============
let receipt = "";
await step("C1", "신청 유형 선택 → 스키마 폼 진입", async () => {
  const p = pageA;
  await p.goto(BASE + "/apply", { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
  await p.waitForSelector("text=프로그램 참여지원비", { timeout: 20000 });
  await shot(p, "apply-type-select");
  await p.locator("text=프로그램 참여지원비").first().click();
  const noPre = p.getByRole("button", { name: /지원신청 내역 없이 새로 작성/ });
  if (await noPre.waitFor({ state: "visible", timeout: 3000 }).then(() => true).catch(() => false)) await noPre.click();
  const progSel = p.locator('select:has(option:has-text("디지털 혁신 캠프"))');
  await progSel.waitFor({ state: "visible", timeout: 15000 });
  await progSel.selectOption({ label: "디지털 혁신 캠프" });
  await p.waitForSelector("text=단계 1", { timeout: 15000 });
  await shot(p, "apply-program-selected");
});
await step("C2", "단계 검증 차단(필수 서술 미입력) + 임시저장", async () => {
  const p = pageA;
  await p.getByRole("button", { name: /다음 단계/ }).click();
  await p.waitForTimeout(500);
  dA.dialogs.length = 0;
  await p.getByRole("button", { name: /다음 단계/ }).click();
  await p.waitForTimeout(400);
  expectIncl(last(dA), "아래 항목을 확인해주세요");
  await p.locator("textarea").first().fill("디지털 혁신 캠프 참여 활동 내용 — QA 런타임 테스트 제출본입니다.");
  await p.getByRole("button", { name: "임시저장", exact: true }).click();
  await p.waitForSelector("text=임시저장됨", { timeout: 15000 });
  await shot(p, "apply-form-step");
});
await step("C3", "동의·서명 미완료 제출 차단 → 완료 후 제출 → 접수번호", async () => {
  const p = pageA;
  await p.getByRole("button", { name: /다음 단계/ }).click();
  await p.waitForTimeout(600);
  dA.dialogs.length = 0;
  await p.getByRole("button", { name: /^신청 제출$/ }).click();
  await p.waitForTimeout(500);
  expectIncl(last(dA), "확인해주세요");
  await agreeAll(p);
  await p.waitForTimeout(300);
  await drawSign(p);
  await shot(p, "apply-consent-sign");
  await p.getByRole("button", { name: /^신청 제출$/ }).click();
  await p.waitForURL(/\/apply\/complete/, { timeout: 25000 });
  await p.waitForTimeout(600);
  receipt = (await p.locator("text=/20\\d\\d-\\d{3}/").first().textContent().catch(() => "")) || "";
  await shot(p, "apply-complete");
  if (!receipt) throw new Error("접수번호 미표시");
});
await step("C4", "마이페이지 — 신청완료 상태·접수번호 표시", async () => {
  const p = pageA;
  await p.goto(BASE + "/mypage", { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
  await p.waitForSelector("text=신청 내역", { timeout: 20000 });
  await p.waitForSelector(`text=${receipt.trim()}`, { timeout: 15000 });
  await p.waitForSelector("text=검토: 신청완료", { timeout: 15000 });
  await shot(p, "mypage-received");
});

// ============ D. 프로그램 관리자 — 보완요청 ============
let appId = "";
await step("D1", "프로그램 관리자 로그인 + 목록 게이트 + 담당 건 표시", async () => {
  const p = pagePM;
  await adminLogin(p, PM.id, PM.pw);
  await shot(p, "admin-login", false);
  await p.goto(BASE + "/admin/applications", { waitUntil: "domcontentloaded" });
  await adminGate(p, PM.pw);
  await p.waitForSelector("text=관리자 미확인 신청", { timeout: 20000 });
  await p.waitForSelector(`text=${APP.name}`, { timeout: 15000 });
  await shot(p, "admin-list-pm");
});
await step("D2", "신청 상세 — 보완요청 + 안내 메모 저장", async () => {
  const p = pagePM;
  await p.getByRole("link", { name: "상세" }).first().click();
  await p.waitForSelector("text=검토 상태", { timeout: 20000 });
  appId = p.url().split("/").pop().split("?")[0];
  await p.locator("select").first().selectOption("supplement");
  await p.locator("textarea").first().fill("증빙자료 부족 — 활동 증빙(사진·확인서)을 보완해 다시 제출해주세요. (QA 테스트)");
  dPM.dialogs.length = 0;
  await p.locator("button.btn-primary", { hasText: "저장" }).first().click();
  await p.waitForTimeout(900);
  expectIncl(last(dPM), "저장되었습니다");
  await shot(p, "admin-detail-supplement");
});
await step("D3", "프로그램 관리자 — 지급 상태·승인 금액 비활성(UI) + 서버 차단(403)", async () => {
  const p = pagePM;
  await p.waitForSelector("text=(지출관리자 전용)", { timeout: 8000 });
  const paySel = p.locator("select").nth(1);
  if (!(await paySel.isDisabled())) throw new Error("지급 상태 select가 비활성이 아님");
  const id = p.url().split("/").pop().split("?")[0];
  const r = await p.evaluate(async (id) => {
    const res = await fetch(`/api/applications/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentStatus: "completed" }),
    });
    return { status: res.status, body: await res.text() };
  }, id);
  if (r.status !== 403) throw new Error(`403 기대, 실제 ${r.status}: ${r.body.slice(0, 120)}`);
  expectIncl(r.body, "지출관리자만");
});

// ============ E. 신청자 — 보완 재제출(자동 보완완료) ============
await step("E1", "마이페이지 보완요청 배너 + [수정 후 재제출] 노출", async () => {
  const p = pageA;
  await p.goto(BASE + "/mypage", { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
  await p.waitForSelector("text=보완 요청이 있는 신청이", { timeout: 20000 });
  await p.waitForSelector("text=검토: 보완요청", { timeout: 15000 });
  await p.waitForSelector("text=증빙자료 부족", { timeout: 15000 });
  await shot(p, "mypage-supplement");
});
await step("E2", "수정 후 재제출 → 검토 상태 자동 '보완완료'", async () => {
  const p = pageA;
  await p.getByRole("link", { name: /수정 후 재제출/ }).first().click();
  await p.waitForSelector("text=단계 1", { timeout: 25000 });
  await p.waitForTimeout(600);
  await fillAndSubmitForm(p, "보완 반영 — 활동 증빙을 추가하고 내용을 수정했습니다. (재제출)", dA);
  await p.waitForURL(/\/apply\/complete/, { timeout: 25000 });
  await p.goto(BASE + "/mypage", { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
  await p.waitForSelector("text=검토: 보완완료", { timeout: 20000 });
  await shot(p, "mypage-supplemented");
});
await step("E3", "관리자 목록 — '보완완료' 자동 표시 + 미확인 집계 포함", async () => {
  const p = pagePM;
  await p.goto(BASE + "/admin/applications", { waitUntil: "domcontentloaded" });
  await adminGate(p, PM.pw);
  await p.waitForSelector('td:has-text("보완완료")', { timeout: 20000 });
  await shot(p, "admin-list-supplemented");
});

// ============ F. 인계 → 지출관리자 승인·지급 ============
await step("F1", "프로그램 관리자 → 지출관리자에게 보내기(일괄 인계)", async () => {
  const p = pagePM;
  await p.locator('tbody input[type="checkbox"]').first().check();
  dPM.dialogs.length = 0;
  await p.getByRole("button", { name: /지출관리자에게 보내기/ }).click();
  await p.waitForTimeout(1200);
  expectIncl(dPM.dialogs.map((d) => d.message).join(" | "), "지출관리자에게 전달");
});
await step("F2", "지출관리자 로그인 — 전달된 건 확인", async () => {
  const p = pageEX;
  await adminLogin(p, EXP.id, EXP.pw);
  await p.goto(BASE + "/admin/applications", { waitUntil: "domcontentloaded" });
  await adminGate(p, EXP.pw);
  await p.waitForSelector("text=지출관리자 · 전체 권한", { timeout: 20000 });
  await p.waitForSelector(`text=${APP.name}`, { timeout: 15000 });
  await shot(p, "admin-list-expense");
});
await step("F3", "지출관리자 — 승인 + 최종 승인 금액 + 지출완료 저장", async () => {
  const p = pageEX;
  await p.getByRole("link", { name: "상세" }).first().click();
  await p.waitForSelector("text=검토 상태", { timeout: 20000 });
  await p.locator("select").nth(0).selectOption("approved");
  await p.locator("select").nth(1).selectOption("completed");
  await p.locator('input[type="number"]').first().fill("300000");
  await p.locator("textarea").first().fill("승인 및 지급 완료 처리 (QA 테스트)");
  dEX.dialogs.length = 0;
  await p.locator("button.btn-primary", { hasText: "저장" }).first().click();
  await p.waitForTimeout(900);
  expectIncl(last(dEX), "저장되었습니다");
  await shot(p, "admin-detail-approved");
});
await step("F4", "신청자 — 승인·최종 승인액·지출완료 표시 + 지급완료 건 취소 차단", async () => {
  const p = pageA;
  await p.goto(BASE + "/mypage", { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
  await p.waitForSelector("text=검토: 승인", { timeout: 20000 });
  await p.waitForSelector("text=지급: 지출완료", { timeout: 15000 });
  await p.waitForSelector("text=300,000", { timeout: 15000 });
  await shot(p, "mypage-approved");
  await p.getByRole("button", { name: /신청 취소/ }).first().click();
  await p.waitForTimeout(400);
  dA.dialogs.length = 0;
  await p.getByRole("button", { name: "신청 취소", exact: true }).last().click();
  await p.waitForTimeout(900);
  expectIncl(last(dA), "이미 지급 완료된 신청은 취소할 수 없습니다");
});

// ============ G. 공간대여 ============
await step("G1", "공간대여 신청 접수", async () => {
  const p = pageA;
  await p.goto(BASE + "/space-rental", { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
  await p.waitForSelector("text=테스트 세미나실 101호", { timeout: 20000 });
  await shot(p, "space-rental");
  await p.getByRole("button", { name: /신청하기/ }).first().click();
  await p.waitForSelector('text=대여 공간', { timeout: 15000 });
  const sel = p.locator("select").first();
  await sel.selectOption({ index: 1 });
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  await p.locator('input[type="date"]').first().fill(tomorrow);
  const times = p.locator('input[type="time"]');
  await times.nth(0).fill("10:00");
  await times.nth(1).fill("12:00");
  await p.getByPlaceholder("홍길동").fill(APP.name);
  await p.getByPlaceholder("학번 또는 소속").fill(APP.sid);
  await agreeAll(p);
  dA.dialogs.length = 0;
  await p.getByRole("button", { name: /공간대여 신청/ }).last().click();
  await p.waitForTimeout(1800);
  await shot(p, "space-rental-submitted");
});
await step("G2", "공간대여 겹침 차단(같은 공간·시간 재신청)", async () => {
  const p = pageA;
  await p.goto(BASE + "/space-rental", { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
  await p.waitForSelector("text=테스트 세미나실 101호", { timeout: 20000 });
  await p.getByRole("button", { name: /신청하기/ }).first().click();
  await p.waitForSelector('text=대여 공간', { timeout: 15000 });
  const sel = p.locator("select").first();
  await sel.selectOption({ index: 1 });
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  await p.locator('input[type="date"]').first().fill(tomorrow);
  const times = p.locator('input[type="time"]');
  await times.nth(0).fill("11:00");
  await times.nth(1).fill("13:00");
  await p.getByPlaceholder("홍길동").fill("박중복");
  await p.getByPlaceholder("학번 또는 소속").fill("20260001");
  await agreeAll(p);
  dA.dialogs.length = 0;
  const btn = p.getByRole("button", { name: /공간대여 신청/ }).last();
  if (await btn.isDisabled().catch(() => false)) {
    expectIncl(await p.locator("text=/겹칩니다|이미 (신청|예약)/").first().textContent({ timeout: 5000 }), "겹");
  } else {
    await btn.click();
    await p.waitForTimeout(1500);
    expectIncl(last(dA), "이미 신청·예약된 장소·시간대입니다");
  }
  await shot(p, "space-rental-conflict", false);
});
await step("G3", "관리자 공간대여 심사 — 승인(웹훅 미설정 안내)", async () => {
  const p = pageEX;
  await p.goto(BASE + "/admin/space-rental", { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
  await p.waitForSelector("text=공간대여 신청목록", { timeout: 20000 });
  await p.locator('button:has-text("테스트 세미나실 101호")').first().click();
  await p.waitForTimeout(500);
  await shot(p, "admin-space-rental");
  dEX.dialogs.length = 0;
  await p.getByRole("button", { name: "승인", exact: true }).first().click();
  await p.waitForTimeout(1800);
  if (!/승인/.test(last(dEX))) throw new Error("승인 안내 문구 없음: " + last(dEX).slice(0, 120));
});
await step("G4", "이용결과 제출(명단·서명)", async () => {
  const p = pageA;
  await p.goto(BASE + "/space-rental/result", { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
  await p.waitForSelector("text=/이용결과|신청목록/", { timeout: 20000 });
  await p.locator('button:has-text("이용결과 제출"), button:has-text("다시 제출")').last().click();
  await p.waitForTimeout(800);
  await p.getByPlaceholder("이용자 이름").first().fill(APP.name);
  await drawSign(p);
  await shot(p, "space-result-form");
  dA.dialogs.length = 0;
  await p.getByRole("button", { name: "이용결과 제출", exact: true }).last().click();
  await p.waitForSelector("text=이용결과가 제출되었습니다", { timeout: 15000 });
  await shot(p, "space-result");
});

// ============ H. 관리자 나머지 화면 ============
for (const [id, pathUrl, waitText, name] of [
  ["H1", "/admin/programs", "프로그램 신청 내용", "admin-programs"],
  ["H2", "/admin/admins", "지출관리자 로그인", "admin-admins"],
  ["H3", "/admin/site-settings", "푸터", "admin-site-settings"],
]) {
  await step(id, `${pathUrl} 렌더·캡처`, async () => {
    const p = pageEX;
    await p.goto(BASE + pathUrl, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
    await p.waitForSelector(`text=${waitText}`, { timeout: 20000 });
    await shot(p, name);
  });
}
await step("H4", "/admin/applicants 게이트 + 렌더·캡처", async () => {
  const p = pageEX;
  await p.goto(BASE + "/admin/applicants", { waitUntil: "domcontentloaded" });
  await adminGate(p, EXP.pw);
  await p.waitForSelector("text=학생 검색", { timeout: 20000 });
  await shot(p, "admin-applicants");
});
await step("H5", "이용안내(/guide) 렌더·캡처", async () => {
  const p = pageA;
  await p.goto(BASE + "/guide", { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(800);
  await shot(p, "guide", false);
});

// ============ 결과 저장 ============
const passed = results.filter((r) => r.pass).length;
fs.writeFileSync(path.join(OUT, "e2e-results.json"), JSON.stringify({
  ranAt: new Date().toISOString(), passed, total: results.length, receipt, results,
}, null, 2));
log(`\n===== ${passed}/${results.length} PASS =====`);
await browser.close();
process.exit(passed === results.length ? 0 : 1);

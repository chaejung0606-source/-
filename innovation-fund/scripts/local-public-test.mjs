import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const EXEC = process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined;
const results = [];
function rec(id, name, actual, pass) {
  results.push({ id, name, actual, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${id} ${name} :: ${actual}`);
}

// loopback bypasses the agent proxy by default; no proxy config needed.
const browser = await chromium.launch({ executablePath: EXEC });
const ctx = await browser.newContext();
// When run locally without a real Supabase, stub its REST/auth calls so client-side
// fetches resolve (empty) instead of connection-refused. Keeps the session unauthenticated
// (so auth gates still fire) while letting content-gated UI like FundTypeModal render.
// Harmless against a real backend: only localhost:54321 (the dummy URL) is intercepted.
await ctx.route('**/localhost:54321/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
const page = await ctx.newPage();
const appErrors = [];
page.on('pageerror', (e) => appErrors.push(String(e)));

try {
  // R1: home + 6 type keywords
  await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 60000 });
  const title = await page.title();
  const body = await page.locator('body').innerText();
  // exact labels from types/index.ts (note the spaces)
  const types = ['근로장학금', '프로그램 참여지원비', '진행요원비', '성적 우수 지원금', '경진대회 입상 우수성과 지원금', '자격증 취득 우수성과 지원금'];
  const found = types.filter((t) => body.includes(t));
  rec('R1', 'home renders 6 type cards', `title="${title}" types=${found.length}/6`, found.length === 6);

  // R2: type detail — click a type card, expect FundTypeModal overlay to appear
  let r2 = false, r2note = '';
  try {
    const before = (await page.locator('body').innerText()).length;
    const el = page.locator('button', { hasText: '자격증 취득 우수성과 지원금' }).first();
    if (await el.count()) {
      await el.click({ timeout: 8000 }).catch(() => {});
      // FundTypeModal renders a `.fixed.inset-0.z-[100]` overlay with a .modal-backdrop
      const overlay = page.locator('div.fixed.inset-0 .modal-backdrop');
      await overlay.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      const dlgVisible = (await overlay.count()) > 0 && await overlay.first().isVisible().catch(() => false);
      const after = (await page.locator('body').innerText()).length;
      r2 = dlgVisible || after > before + 40;
      r2note = `overlayVisible=${dlgVisible} textDelta=${after - before}`;
    } else r2note = 'type card button not found';
  } catch (e) { r2note = 'err ' + String(e).slice(0, 60); }
  rec('R2', 'type detail interaction', r2note, r2);

  // Close any modal
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(300);

  // R3: auth gate — unauthenticated /apply?mode=pre -> login redirect/prompt
  await page.goto(BASE + '/apply?mode=pre', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);
  const applyUrl = page.url();
  const applyBody = await page.locator('body').innerText();
  const gated = /\/login/.test(applyUrl) || /로그인/.test(applyBody);
  rec('R3', 'auth gate /apply?mode=pre', `url=${applyUrl.replace(BASE, '')} loginWord=${/로그인/.test(applyBody)}`, gated);

  // R4: 404
  const resp = await page.goto(BASE + '/nope-xyz-404', { waitUntil: 'domcontentloaded', timeout: 30000 });
  const nf = (await page.locator('body').innerText()).slice(0, 120).replace(/\n/g, ' ');
  rec('R4', '404 handling', `status=${resp?.status()} "${nf.slice(0, 60)}"`, resp?.status() === 404 || /404|찾을 수 없|not be found/i.test(nf));

  // R5: space-rental public
  await page.goto(BASE + '/space-rental', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);
  const srUrl = page.url();
  const srBody = await page.locator('body').innerText();
  const srOk = !/\/login/.test(srUrl) && /공간|대여|신청/.test(srBody);
  rec('R5', 'space-rental public access', `url=${srUrl.replace(BASE, '')} content=${/공간|대여/.test(srBody)}`, srOk);

  // R6: mypage unauthenticated behavior (report flagged this — does it gate or render empty shell?)
  await page.goto(BASE + '/mypage', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);
  const myUrl = page.url();
  const myBody = (await page.locator('body').innerText()).slice(0, 200).replace(/\n/g, ' ');
  const redirected = /\/login/.test(myUrl);
  rec('R6', 'mypage unauth (observe gate)', `url=${myUrl.replace(BASE, '')} redirectedToLogin=${redirected} body="${myBody.slice(0, 70)}"`, true); // observational

  // R7: mobile 390px no horizontal overflow (home)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(800);
  const dims = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  rec('R7', 'mobile 390px no h-overflow', `scrollW=${dims.sw} innerW=${dims.iw}`, dims.sw <= dims.iw + 2);

} catch (e) {
  console.log('FATAL', String(e));
} finally {
  console.log('\n=== app pageerrors (JS thrown in app) ===');
  console.log(appErrors.length ? appErrors.join('\n') : '(none)');
  const p = results.filter((r) => r.pass).length;
  console.log(`\n=== SUMMARY ${p}/${results.length} pass; appErrors=${appErrors.length} ===`);
  await browser.close();
}

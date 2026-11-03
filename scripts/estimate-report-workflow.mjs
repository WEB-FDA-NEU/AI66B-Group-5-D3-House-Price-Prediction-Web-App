import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const preview = spawn(process.env.PYTHON || 'python', ['scripts/preview.py'], {
  cwd: root,
  stdio: 'ignore',
});
const base = 'http://127.0.0.1:4173';
let browser;

async function waitForPreview() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (preview.exitCode !== null) throw new Error('Static preview server exited before becoming ready.');
    try {
      const response = await fetch(`${base}/report-estimate.html`);
      if (response.ok) return;
    } catch { /* The server is still starting. */ }
    await delay(200);
  }
  throw new Error('Static preview server did not become ready.');
}

try {
  await waitForPreview();
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-gpu'] });

  const demo = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await demo.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    sessionStorage.setItem('homeval_prediction_draft', JSON.stringify({
      id: 'pred-demo', estimated_price: 4_850_000_000, draft_token: 'demo-draft',
      input: { district: 'Thủ Đức', property_type: 'Nhà phố', area_m2: 72 },
    }));
  });

  await page.goto(`${base}/report-estimate.html`);
  await page.getByRole('heading', { name: 'Bạn cần đăng nhập để gửi báo cáo' }).waitFor();
  await page.evaluate(() => sessionStorage.removeItem('homeval_prediction_draft'));
  await page.getByRole('link', { name: 'Dùng thử với dữ liệu mẫu' }).click();
  await page.getByRole('heading', { name: 'Báo cáo của bạn' }).waitFor();
  assert.equal(await page.locator('#reports-empty').isVisible(), true);

  const estimated = await page.locator('#report-estimated-price').textContent();
  const estimatedNumber = Number(estimated.replace(/[^\d]/g, ''));
  await page.locator('#expected-price').fill(String(estimatedNumber));
  await page.locator('#report-comment').fill('Ngắn');
  await page.getByRole('button', { name: 'Gửi báo cáo' }).click();
  assert.equal(await page.locator('#expected-price').getAttribute('aria-invalid'), 'true');
  assert.equal(await page.locator('#report-comment').getAttribute('aria-invalid'), 'true');

  await page.locator('#expected-price').fill(String(estimatedNumber + 100_000_000));
  await page.locator('#report-comment').fill('Nhà đã sửa mới, giá giao dịch gần đây cao hơn.');
  await page.getByRole('button', { name: 'Gửi báo cáo' }).click();
  await page.getByRole('status').filter({ hasText: 'Đã gửi báo cáo.' }).waitFor();
  assert.equal(await page.locator('.report-card').count(), 1);
  await page.reload();
  assert.equal(await page.locator('.report-card').count(), 1);

  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []);
  await demo.close();

  const errorContext = await browser.newContext();
  await errorContext.addInitScript(() => {
    localStorage.setItem('app_token', 'test-token');
    localStorage.setItem('app_user', JSON.stringify({ id: 1, display_name: 'Test', role: 'user' }));
    sessionStorage.setItem('homeval_prediction_draft', JSON.stringify({
      id: 'pred-demo', estimated_price: 4_850_000_000, draft_token: 'test-proof',
      input: { district: 'Thủ Đức', property_type: 'Nhà phố', area_m2: 72 },
    }));
  });
  const errorPage = await errorContext.newPage();
  await errorPage.route('**/api/me/estimate-reports?**', route =>
    route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ detail: 'Dịch vụ báo cáo tạm thời không khả dụng.' }) }));
  await errorPage.goto(`${base}/report-estimate.html`);
  await errorPage.getByRole('alert').filter({ hasText: 'Dịch vụ báo cáo tạm thời không khả dụng.' }).waitFor();
  await errorContext.close();

  const authContext = await browser.newContext();
  await authContext.addInitScript(() => {
    localStorage.setItem('app_token', 'expired-token');
    localStorage.setItem('app_user', JSON.stringify({ id: 1, display_name: 'Test', role: 'user' }));
    sessionStorage.setItem('homeval_prediction_draft', JSON.stringify({
      id: 'pred-demo', estimated_price: 4_850_000_000, draft_token: 'test-proof',
      input: { district: 'Thủ Đức', property_type: 'Nhà phố', area_m2: 72 },
    }));
  });
  const authPage = await authContext.newPage();
  await authPage.route('**/api/me/estimate-reports?**', route =>
    route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ detail: 'Bạn cần đăng nhập.' }) }));
  await authPage.goto(`${base}/report-estimate.html`);
  await authPage.getByRole('heading', { name: 'Bạn cần đăng nhập để gửi báo cáo' }).waitFor();
  await authContext.close();

  console.log(JSON.stringify({
    checks: [
      'Unauthorized state offers login and backend-free demo',
      'Demo loads fixture, validates fields, submits, and persists reports',
      'Mobile layout has no horizontal overflow',
      'API errors and expired sessions are displayed',
    ],
    errors,
  }, null, 2));
} finally {
  if (browser) await browser.close();
  preview.kill();
}

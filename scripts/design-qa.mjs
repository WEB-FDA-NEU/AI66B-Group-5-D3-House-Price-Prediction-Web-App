import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createPreviewServer } from './preview.mjs';

const server = createPreviewServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
const results = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
await mkdir('docs/redesign', { recursive: true });

async function layout(name) {
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    assert.equal(overflow, false, `${name} overflows at ${width}px`);
  }
  results.push(`${name}: no horizontal overflow at 360/390/768/1440px`);
}
async function login(email = 'anh@example.com', password = 'password123') {
  await page.goto(base + '/login.html');
  await page.locator('[name=email]').fill(email);
  await page.locator('[name=password]').fill(password);
  await page.locator('button[type=submit]').click();
}
try {
  await page.goto(base);
  await page.locator('site-header nav').waitFor();
  assert(await page.locator('.hero-visual img').evaluate(img => img.complete && img.naturalWidth > 0));
  await layout('Home');
  await page.screenshot({ path: 'docs/redesign/home-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'docs/redesign/home-mobile.png', fullPage: true });
  await page.locator('.menu-toggle').click();
  assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'), 'true');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'), 'false');
  await page.locator('.faq-list summary').first().click();
  assert(await page.locator('.faq-list details').first().getAttribute('open') !== null);
  results.push('Mobile navigation, Escape and FAQ disclosure work');
  await page.locator('.quick-form [name=district]').selectOption('Thủ Đức');
  await page.locator('.quick-form [name=property_type]').selectOption('Nhà phố');
  await page.locator('.quick-form [name=area_m2]').fill('86');
  await page.locator('.quick-form button').click();
  await page.waitForURL('**/predict.html?**');
  assert.equal(await page.locator('[name=area_m2]').inputValue(), '86');
  assert.equal(await page.locator('[name=district]').inputValue(), 'Thủ Đức');
  assert.equal(await page.locator('#preview-area').innerText(), '86 m²');
  await layout('Prediction');
  await page.screenshot({ path: 'docs/redesign/predict-desktop.png', fullPage: true });
  await page.locator('[name=bathrooms]').fill('15');
  await page.locator('button[type=submit]').click();
  assert.equal(await page.locator('[name=bathrooms]').getAttribute('aria-invalid'), 'true');
  await page.locator('[name=bathrooms]').fill('2');
  await page.locator('button[type=submit]').click();
  await page.waitForURL('**/predict-result.html');
  await page.locator('#result').waitFor();
  assert((await page.locator('#estimated-price').innerText()).length > 0);
  await layout('Guest result');
  await page.locator('#save-form button').click();
  await page.waitForURL('**/login.html');
  await layout('Login');
  await page.screenshot({ path: 'docs/redesign/login-desktop.png', fullPage: true });
  await login();
  await page.waitForURL('**/predict-result.html');
  await page.locator('#save-form [name=label]').fill('Nhà thử nghiệm giao diện');
  await page.locator('#save-form button').click();
  await page.locator('#save-form').waitFor({ state: 'hidden' });
  await page.goto(base + '/predictions.html');
  const row = page.locator('.prediction-row').filter({ hasText: 'Nhà thử nghiệm giao diện' });
  await row.waitFor();
  await layout('History');
  await page.screenshot({ path: 'docs/redesign/history-desktop.png', fullPage: true });
  await row.getByRole('link', { name: 'Chi tiết' }).click();
  await page.locator('#detail').waitFor();
  await layout('Saved detail');
  await page.locator('#delete-prediction').click();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#confirm-dialog').isVisible(), false);
  await page.locator('#delete-prediction').click();
  await page.locator('[data-confirm]').click();
  await page.waitForURL('**/predictions.html');
  await page.locator('#history-search [name=q]').fill('Nhà thử nghiệm giao diện');
  await page.locator('#history-search button').click();
  await page.locator('.empty').waitFor();
  results.push('Quick estimate → validation → guest result → login → save → history → detail → cancel/delete');
  for (const name of ['profile', 'about-model', '404', '500', 'register']) {
    await page.goto(`${base}/${name}.html`);
    if (name === 'about-model') await page.locator('#dataset-title').waitFor();
    await layout(name);
  }
  await page.goto(base + '/index.html');
  await page.locator('[data-action=logout]').click();
  await page.waitForURL('**/index.html');
  await page.goto(base + '/admin.html');
  await page.waitForURL('**/login.html?next=admin');
  await page.evaluate(() => sessionStorage.removeItem('app_return_to'));
  await login('admin@homeval.vn', 'admin123');
  await page.waitForURL('**/index.html');
  for (const name of ['admin', 'admin-models', 'admin-models-new']) {
    await page.goto(`${base}/${name}.html`);
    if (name === 'admin') await page.locator('.kpi').first().waitFor();
    if (name === 'admin-models') await page.locator('.table').waitFor();
    await layout(name);
    await page.screenshot({ path: `docs/redesign/${name}-desktop.png`, fullPage: true });
  }
  await page.locator('button[type=submit]').click();
  assert(await page.locator('[aria-invalid=true]').count() > 0);
  results.push('Admin guard, model table and upload validation work');
  assert.deepEqual(errors, [], 'Browser errors or failed resources');
  results.push('No browser JavaScript errors or failed resources');
  await writeFile('docs/redesign/qa-results.json', JSON.stringify({ passed: true, results }, null, 2));
  console.log(results.join('\n'));
} finally {
  await browser.close();
  server.close();
}

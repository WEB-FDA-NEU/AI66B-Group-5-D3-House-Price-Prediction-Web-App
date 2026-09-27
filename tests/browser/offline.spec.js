import { test, expect } from '@playwright/test';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { unzipSync } from 'fflate';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
// Test the actual ZIP after extraction, including paths containing spaces.
const output = mkdtempSync(path.resolve('dist', 'extracted review-'));
for (const [name, bytes] of Object.entries(unzipSync(readFileSync('dist/team5.zip')))) {
  const target = path.resolve(output, name);
  if (!target.startsWith(output + path.sep)) throw new Error('Invalid ZIP path');
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, bytes);
}
const pageURL = file => pathToFileURL(path.join(output, file)).href;

test('file:// root loads Home data; admin login navigates to dashboard and models without network', async ({ page }) => {
  const errors = [];
  const network = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', r => { if (/^https?:/.test(r.url())) network.push(r.url()); });
  await page.goto(pageURL('index.html'));
  await expect(page.locator('#model-stats-body')).toContainText('87%');
  await page.goto(pageURL('frontend/login.html'));
  await page.locator('[name=email]').fill('admin@homeval.vn');
  await page.locator('[name=password]').fill('incorrect123');
  await page.locator('button[type=submit]').click();
  await expect(page.locator('body')).toContainText('Email hoặc mật khẩu không đúng.');
  await page.locator('[name=password]').fill('Admin123!');
  await page.locator('button[type=submit]').click();
  await expect(page).toHaveURL(/index.html$/);
  await page.locator('[data-nav=admin]').click();
  await expect(page.locator('#kpis')).toContainText('128');
  await page.locator('[data-nav=models]').click();
  await expect(page.locator('#list')).toContainText('v2.3.0');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#list')).toBeVisible();
  expect(errors).toEqual([]);
  expect(network).toEqual([]);
});

test('ordinary user has no admin navigation', async ({ page }) => {
  await page.goto(pageURL('frontend/login.html'));
  await page.locator('[name=email]').fill('anh@example.com');
  await page.locator('[name=password]').fill('HomeVal123!');
  await page.locator('button[type=submit]').click();
  await expect(page).toHaveURL(/index.html$/);
  await expect(page.locator('[data-nav=admin]')).toBeHidden();
  await expect(page.locator('[data-nav=models]')).toBeHidden();
});

test('registration persists across pages and duplicate email is rejected', async ({ page }) => {
  await page.goto(pageURL('frontend/register.html'));
  await page.locator('[name=display_name]').fill('Demo Account');
  await page.locator('[name=email]').fill('new@example.com');
  await page.locator('[name=password]').fill('Demo12345');
  await page.locator('[name=confirm]').fill('Demo12345');
  await page.locator('button[type=submit]').click();
  await expect(page).toHaveURL(/index.html$/);
  await page.locator('[data-action=logout]').click();
  await page.goto(pageURL('frontend/login.html'));
  await page.locator('[name=email]').fill('new@example.com');
  await page.locator('[name=password]').fill('Demo12345');
  await page.locator('button[type=submit]').click();
  await expect(page).toHaveURL(/index.html$/);
  await expect(page.locator('[data-user-name]')).toHaveText('Demo Account');
  await page.goto(pageURL('frontend/register.html'));
  await page.locator('[name=display_name]').fill('Another Account');
  await page.locator('[name=email]').fill('NEW@example.com');
  await page.locator('[name=password]').fill('Demo12345');
  await page.locator('[name=confirm]').fill('Demo12345');
  await page.locator('button[type=submit]').click();
  await expect(page.locator('body')).toContainText('Email này đã được đăng ký.');
});

test('Home server-error scenario renders retry and recovers after resetting URL', async ({ page }) => {
  const home = pageURL('frontend/index.html');
  await page.goto(home + '?mockOperation=model&mockScenario=server');
  await expect(page.locator('#model-stats-body')).toContainText('Dịch vụ tạm thời không khả dụng.');
  await page.getByRole('button', { name: 'Thử lại' }).click();
  await expect(page.locator('#model-stats-body')).toContainText('Dịch vụ tạm thời không khả dụng.');
  await page.goto(home);
  await expect(page.locator('#model-stats-body')).toContainText('87%');
});

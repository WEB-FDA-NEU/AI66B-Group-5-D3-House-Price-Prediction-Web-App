import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './tests/browser', workers: 1,
  use: { browserName: 'chromium', channel: process.env.PLAYWRIGHT_CHANNEL || undefined, headless: true } });

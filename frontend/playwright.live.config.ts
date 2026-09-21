import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: 'live.spec.ts', workers: 1, timeout: 60000,
  use: { baseURL: process.env.LIVE_APP_URL || 'http://127.0.0.1:5173', browserName: 'chromium', headless: true }
});


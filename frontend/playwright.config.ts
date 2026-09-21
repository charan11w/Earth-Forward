import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests',testMatch:['flows.spec.ts','auth.spec.ts'],workers:1,timeout:180000,
  expect:{timeout:15000},
  use:{baseURL:process.env.LIVE_APP_URL||'http://127.0.0.1:5173',browserName:'chromium',headless:true,trace:'retain-on-failure'}
});


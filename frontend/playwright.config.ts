import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: 'app.spec.ts', fullyParallel: false,
  use: { baseURL: 'http://127.0.0.1:5175', browserName: 'chromium', headless: true },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5175 --strictPort',
    url: 'http://127.0.0.1:5175', reuseExistingServer: false,
    env: { VITE_USE_MOCKS: 'true', VITE_API_URL: 'http://localhost:4000/api' }
  }
});


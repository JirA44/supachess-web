const { defineConfig } = require('@playwright/test');
const baseURL = new URL(process.env.SUPACHESS_BASE_URL || 'http://127.0.0.1:4173/');
if (!baseURL.pathname.endsWith('/')) baseURL.pathname += '/';
module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: { timeout: 5000 },
  retries: 0,
  workers: 2,
  reporter: 'list',
  use: { baseURL: baseURL.toString(), browserName: 'chromium', headless: true },
  webServer: { command: 'python3 -m http.server 4173 --bind 127.0.0.1', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI, timeout: 15000 },
});

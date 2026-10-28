const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests/e2e',
  testMatch: /.*\.spec\.cjs/,
  timeout: 30000,
  expect: { timeout: 10000 },
  retries: 0,
  workers: 2,
  reporter: 'list',
  use: { baseURL: process.env.SUPACHESS_BASE_URL || 'http://127.0.0.1:4173', browserName: 'chromium', headless: true },
  webServer: process.env.SUPACHESS_BASE_URL ? undefined : { command: 'python -m http.server 4173 --bind 127.0.0.1', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI, timeout: 15000 },
});


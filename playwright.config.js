import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', timeout: 90000, workers: 1,
  use: { baseURL: process.env.TEST_URL || 'http://127.0.0.1:4173', trace: 'retain-on-failure' },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } }],
  webServer: process.env.TEST_URL ? undefined : {
    command: 'npm run build && npm run preview -- --port 4173',
    url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI
  }
});

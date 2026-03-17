import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/specs',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
      },
      testMatch: /.*\.spec\.ts/,
    },
  ],
  webServer: {
    command: 'pnpm exec vite --config vite.config.e2e.ts',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
})

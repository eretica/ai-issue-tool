import { defineConfig } from '@playwright/test'

/**
 * Playwright config for Electron E2E tests.
 *
 * These tests launch the actual Electron app (with real IPC, DB, preload)
 * rather than a browser against the Vite dev server.
 *
 * Run: pnpm test:e2e:electron
 */
export default defineConfig({
  testDir: './e2e/electron',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['html', { outputFolder: 'playwright-report-electron', open: 'never' }], ['list']],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  // No webServer — we launch Electron directly in the test fixtures
})

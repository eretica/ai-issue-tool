import { _electron as electron, type ElectronApplication, type Page } from 'playwright'
import { join } from 'path'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'

const PROJECT_ROOT = join(__dirname, '../..')

export interface ElectronTestContext {
  app: ElectronApplication
  page: Page
  dbPath: string
  cleanup: () => Promise<void>
}

/**
 * Launch the Electron app for testing.
 *
 * - Uses a temporary SQLite DB (isolated per test)
 * - Forces mock mode for AI/GitHub services
 * - Requires `electron-vite build` to have been run first
 */
export async function launchElectronApp(options?: {
  forceMock?: boolean
}): Promise<ElectronTestContext> {
  const forceMock = options?.forceMock ?? true

  // Create a temp directory for the test DB
  const tmpDir = mkdtempSync(join(tmpdir(), 'ai-issue-e2e-'))
  const dbPath = join(tmpDir, 'test.db')

  const app = await electron.launch({
    args: [join(PROJECT_ROOT, 'out/main/index.js')],
    env: {
      ...process.env,
      TEST_DB_PATH: dbPath,
      TEST_FORCE_MOCK: forceMock ? '1' : '0',
      NODE_ENV: 'production', // use file:// loading (built renderer)
    },
  })

  // Wait for the first window
  const page = await app.firstWindow()

  // Wait for the app to be ready (renderer loaded)
  await page.waitForLoadState('domcontentloaded')

  const cleanup = async (): Promise<void> => {
    await app.close()
    try {
      rmSync(tmpDir, { recursive: true, force: true })
    } catch { /* ignore */ }
  }

  return { app, page, dbPath, cleanup }
}

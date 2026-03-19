import { test, expect } from '@playwright/test'
import { launchElectronApp, type ElectronTestContext } from './electron-app'

let ctx: ElectronTestContext

test.beforeAll(async () => {
  ctx = await launchElectronApp()
})

test.afterAll(async () => {
  await ctx.cleanup()
})

test.describe('Electron App Launch', () => {
  test('app window opens with correct title', async () => {
    const title = await ctx.page.title()
    expect(title).toBeTruthy()
  })

  test('renderer loads the React app', async () => {
    // The root element should be present
    await expect(ctx.page.locator('#root')).toBeAttached()
  })

  test('sidebar is visible with navigation links', async () => {
    await expect(ctx.page.getByRole('heading', { name: 'AI Issue Tool' })).toBeVisible()
    await expect(ctx.page.getByRole('link', { name: '設定' })).toBeVisible()
  })

  test('window has expected minimum size', async () => {
    const size = await ctx.page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
    }))
    expect(size.width).toBeGreaterThanOrEqual(400)
    expect(size.height).toBeGreaterThanOrEqual(300)
  })
})

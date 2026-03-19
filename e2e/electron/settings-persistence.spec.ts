import { test, expect } from '@playwright/test'
import { launchElectronApp, type ElectronTestContext } from './electron-app'

let ctx: ElectronTestContext

test.beforeAll(async () => {
  ctx = await launchElectronApp()
})

test.afterAll(async () => {
  await ctx.cleanup()
})

test.describe('Settings Persistence (real DB)', () => {
  test('settings page loads', async () => {
    await ctx.page.getByRole('link', { name: '設定' }).click()
    await expect(ctx.page.getByRole('heading', { name: '外部ツール連携' })).toBeVisible()
  })

  test('save GitHub mode setting', async () => {
    await ctx.page.getByLabel('GitHub連携').selectOption('mock')
    await ctx.page.getByRole('button', { name: '保存', exact: true }).click()
    await expect(ctx.page.getByRole('status').getByText('保存しました')).toBeVisible()
  })

  test('saved setting persists after navigation', async () => {
    // Navigate away (click "+ 追加" link to go home)
    await ctx.page.getByRole('link', { name: '+ 追加' }).click()
    await ctx.page.waitForTimeout(500)

    // Come back to settings
    await ctx.page.getByRole('link', { name: '設定' }).click()
    await expect(ctx.page.getByRole('heading', { name: '外部ツール連携' })).toBeVisible()

    // Setting should be retained from DB
    const ghSelect = ctx.page.getByLabel('GitHub連携')
    await expect(ghSelect).toHaveValue('mock')
  })
})

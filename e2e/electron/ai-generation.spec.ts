import { test, expect } from '@playwright/test'
import { launchElectronApp, type ElectronTestContext } from './electron-app'

let ctx: ElectronTestContext

test.beforeAll(async () => {
  ctx = await launchElectronApp({ forceMock: true })

  // Setup: add a repo
  const input = ctx.page.getByPlaceholder('owner/name')
  await input.fill('ai-test/repo')
  await ctx.page.getByRole('button', { name: '追加', exact: true }).click()
  await expect(ctx.page.getByText('ai-test/repo')).toBeVisible()
})

test.afterAll(async () => {
  await ctx.cleanup()
})

test.describe('AI Generation Flow (mock, real IPC + DB)', () => {
  test('AI generation creates draft and completes', async () => {
    // Navigate to repo
    await ctx.page.getByText('ai-test/repo').click()

    // Navigate to new issue (first() for strict mode)
    await ctx.page.getByRole('link', { name: '新規Issue作成' }).first().click()

    // Select template and fill description
    await ctx.page.getByRole('button', { name: '機能要望' }).click()
    await ctx.page.getByLabel('説明').fill('ダークモードを追加してほしい')

    // Click AI generate
    await ctx.page.getByRole('button', { name: 'AIでIssueを生成' }).click()

    // Should navigate to draft list with toast
    await expect(ctx.page.getByRole('status').getByText('AI生成を開始しました')).toBeVisible({ timeout: 5000 })

    // Wait for generation to complete (mock is fast, but need polling refetch)
    await expect(ctx.page.locator('.rounded-full:has-text("AI生成済み")').first()).toBeVisible({ timeout: 15000 })
  })

  test('generated draft has proper content', async () => {
    // Click on the draft
    await ctx.page.getByRole('link', { name: /ダークモード|Feature/ }).first().click()
    await ctx.page.waitForURL(/#\/repos\/\d+\/drafts\/\d+/)

    // Wait for title to be populated (data loading after navigation)
    const titleInput = ctx.page.getByLabel('ドラフトタイトル')
    await expect(titleInput).not.toHaveValue('', { timeout: 5000 })

    const titleValue = await titleInput.inputValue()
    expect(titleValue).not.toBe('AI生成中...')
    expect(titleValue.length).toBeGreaterThan(5)

    // Body should have content
    const editor = ctx.page.getByLabel('Markdownエディタ')
    const body = await editor.inputValue()
    expect(body.length).toBeGreaterThan(50)
  })
})

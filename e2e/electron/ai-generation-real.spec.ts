import { test, expect } from '@playwright/test'
import { launchElectronApp, type ElectronTestContext } from './electron-app'

let ctx: ElectronTestContext

test.beforeAll(async () => {
  // forceMock: false — use real claude CLI for AI generation
  ctx = await launchElectronApp({ forceMock: false })

  // Setup: add a repo
  const input = ctx.page.getByPlaceholder('owner/name')
  await input.fill('real-ai-test/repo')
  await ctx.page.getByRole('button', { name: '追加', exact: true }).click()
  await expect(ctx.page.getByText('real-ai-test/repo')).toBeVisible()
})

test.afterAll(async () => {
  await ctx.cleanup()
})

test.describe('AI Generation with real claude CLI', () => {
  test('generate issue via claude -p and verify result', async () => {
    // Set long timeout — real claude CLI takes ~60s
    test.setTimeout(180_000)

    // Navigate to repo
    await ctx.page.getByText('real-ai-test/repo').click()

    // Navigate to new issue
    await ctx.page.getByRole('link', { name: '新規Issue作成' }).first().click()

    // Select template and fill description
    await ctx.page.getByRole('button', { name: 'バグ報告' }).click()
    await ctx.page.getByLabel('説明').fill('ログインページで500エラーが出る')

    // Click AI generate
    await ctx.page.getByRole('button', { name: 'AIでIssueを生成' }).click()

    // Should navigate to draft list with toast
    await expect(ctx.page.getByRole('status').getByText('AI生成を開始しました')).toBeVisible({ timeout: 5000 })

    // Initially should show 'generating' status (amber badge with spinner)
    // This may be very brief if the network is fast
    const generatingBadge = ctx.page.locator('.rounded-full:has-text("AI生成中...")')
    const generatedBadge = ctx.page.locator('.rounded-full:has-text("AI生成済み")')

    // Wait for AI generation to complete (real CLI, up to 3 minutes)
    await expect(generatedBadge.first()).toBeVisible({ timeout: 150_000 })

    // Verify the draft has no generating badges left
    await expect(generatingBadge).toHaveCount(0)

    // Click on the draft to verify content
    await ctx.page.getByRole('link', { name: /ログイン|Bug/ }).first().click()

    // Wait for title to be populated (data loading after navigation)
    const titleInput = ctx.page.getByLabel('ドラフトタイトル')
    await expect(titleInput).not.toHaveValue('', { timeout: 5000 })

    const title = await titleInput.inputValue()
    expect(title).not.toBe('AI生成中...')
    expect(title.length).toBeGreaterThan(5)
    console.log('[real-ai] Generated title:', title)

    // Body should have substantial content
    const editor = ctx.page.getByLabel('Markdownエディタ')
    const body = await editor.inputValue()
    expect(body.length).toBeGreaterThan(100)
    console.log('[real-ai] Generated body length:', body.length)

    // Body should NOT contain error messages or raw JSON
    expect(body).not.toContain('AI生成に失敗しました')
    expect(body).not.toContain('"title"')
    expect(body).not.toContain('許可が難しい場合')

    // Preview should render markdown
    await expect(ctx.page.getByLabel('Markdownプレビュー')).toBeVisible()
  })
})

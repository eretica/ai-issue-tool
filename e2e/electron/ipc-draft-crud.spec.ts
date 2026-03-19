import { test, expect } from '@playwright/test'
import { launchElectronApp, type ElectronTestContext } from './electron-app'

let ctx: ElectronTestContext

test.beforeAll(async () => {
  ctx = await launchElectronApp()
})

test.afterAll(async () => {
  await ctx.cleanup()
})

test.describe('IPC: Draft CRUD (real DB)', () => {
  test('add a repository first', async () => {
    const input = ctx.page.getByPlaceholder('owner/name')
    await input.fill('test-org/test-repo')
    await ctx.page.getByRole('button', { name: '追加', exact: true }).click()
    await expect(ctx.page.getByText('test-org/test-repo')).toBeVisible()
  })

  test('navigate to repo and create a draft', async () => {
    // Navigate to repo
    await ctx.page.getByText('test-org/test-repo').click()
    await expect(ctx.page.getByText('ドラフトがありません')).toBeVisible()

    // Click new issue (first() for strict mode - appears in header + empty state)
    await ctx.page.getByRole('link', { name: '新規Issue作成' }).first().click()

    // Fill form
    await ctx.page.getByRole('button', { name: 'バグ報告' }).click()
    await ctx.page.getByLabel('タイトル').fill('Electron E2E テストドラフト')
    await ctx.page.getByLabel('説明').fill('これはElectron E2Eテストで作成したドラフトです')

    // Save
    await ctx.page.getByRole('button', { name: '下書き保存' }).click()
    await expect(ctx.page.getByText('Electron E2E テストドラフト')).toBeVisible({ timeout: 5000 })
  })

  test('draft persists in real DB after navigation', async () => {
    // Navigate to settings
    await ctx.page.getByRole('link', { name: '設定' }).click()
    await expect(ctx.page.getByRole('heading', { name: '外部ツール連携' })).toBeVisible()

    // Use sidebar to navigate back to the repo (repo should appear in sidebar)
    await ctx.page.getByRole('link', { name: 'test-repo' }).click()

    // Draft should still be there (from real DB)
    await expect(ctx.page.getByText('Electron E2E テストドラフト')).toBeVisible({ timeout: 5000 })
  })

  test('edit and save draft', async () => {
    await ctx.page.getByText('Electron E2E テストドラフト').click()
    await ctx.page.waitForURL(/#\/repos\/\d+\/drafts\/\d+/)

    const titleInput = ctx.page.getByLabel('ドラフトタイトル')
    await expect(titleInput).toHaveValue('Electron E2E テストドラフト')

    await titleInput.clear()
    await titleInput.fill('更新: Electron E2E テスト')

    await ctx.page.getByRole('button', { name: '保存' }).click()
    await expect(ctx.page.getByRole('status').getByText('保存しました', { exact: true })).toBeVisible()
  })

  test('delete draft', async () => {
    await ctx.page.getByRole('button', { name: '削除' }).click()
    await expect(ctx.page.getByText('ドラフトを削除しますか？')).toBeVisible()
    await ctx.page.getByRole('button', { name: '削除する' }).click()
    await expect(ctx.page.getByText('ドラフトがありません')).toBeVisible({ timeout: 5000 })
  })
})

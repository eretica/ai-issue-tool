import { test, expect } from '@playwright/test'

test.describe('Draft search and filter', () => {
  test.beforeEach(async ({ page }) => {
    // Create two drafts with different content
    await page.goto('/repos/1/new')
    await page.getByRole('button', { name: 'バグ報告' }).click()
    await page.getByLabel('タイトル').fill('ログインバグ')
    await page.getByLabel('説明').fill('ログイン画面のエラー')
    await page.getByRole('button', { name: '下書き保存' }).click()
    await page.waitForURL('/repos/1')

    await page.getByRole('link', { name: '新規Issue作成' }).first().click()
    await page.waitForURL('/repos/1/new')
    await page.getByRole('button', { name: '機能要望' }).click()
    await page.getByLabel('タイトル').fill('ダークモード対応')
    await page.getByLabel('説明').fill('テーマ切り替え機能')
    await page.getByRole('button', { name: '下書き保存' }).click()
    await page.waitForURL('/repos/1')
  })

  test('search filters drafts by title', async ({ page }) => {
    await expect(page.getByText('ログインバグ')).toBeVisible()
    await expect(page.getByText('ダークモード対応')).toBeVisible()

    await page.getByLabel('ドラフト検索').fill('ログイン')
    await expect(page.getByText('ログインバグ')).toBeVisible()
    await expect(page.getByText('ダークモード対応')).not.toBeVisible()
  })

  test('search shows no results message', async ({ page }) => {
    await page.getByLabel('ドラフト検索').fill('存在しないキーワード')
    await expect(page.getByText(/一致するドラフトがありません/)).toBeVisible()
  })

  test('clearing search shows all drafts', async ({ page }) => {
    await page.getByLabel('ドラフト検索').fill('ログイン')
    await expect(page.getByText('ダークモード対応')).not.toBeVisible()

    await page.getByLabel('ドラフト検索').clear()
    await expect(page.getByText('ログインバグ')).toBeVisible()
    await expect(page.getByText('ダークモード対応')).toBeVisible()
  })
})

test.describe('Dark mode toggle', () => {
  test('toggle persists across navigation', async ({ page }) => {
    await page.goto('/')
    const sidebar = page.getByRole('navigation', { name: 'メインナビゲーション' })
    const toggle = sidebar.getByRole('button', { name: /モードに切り替え/ })

    // Enable dark mode
    await toggle.click()
    await expect(page.locator('html')).toHaveClass(/dark/)

    // Navigate to settings
    await sidebar.getByText('設定').click()
    await page.waitForURL('/settings')

    // Dark mode should persist
    await expect(page.locator('html')).toHaveClass(/dark/)
  })
})

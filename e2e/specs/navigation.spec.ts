import { test, expect } from '@playwright/test'

test.describe('Home page (repository list)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('page heading is displayed', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'リポジトリ' })).toBeVisible()
  })

  test('shows seed repositories as cards', async ({ page }) => {
    await expect(page.getByText('example/my-app')).toBeVisible()
    await expect(page.getByText('example/api-server')).toBeVisible()
  })

  test('shows manual add form', async ({ page }) => {
    await expect(page.getByPlaceholder('owner/name')).toBeVisible()
  })
})

test.describe('Sidebar navigation', { tag: '@smoke' }, () => {
  test('sidebar is always visible', async ({ page }) => {
    await page.goto('/')
    const sidebar = page.getByRole('navigation', { name: 'メインナビゲーション' })
    await expect(sidebar).toBeVisible()
  })

  test('app title is displayed in sidebar', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'AI Issue Tool' })).toBeVisible()
  })

  test('sidebar shows repository list', async ({ page }) => {
    await page.goto('/')
    const sidebar = page.getByRole('navigation', { name: 'メインナビゲーション' })
    await expect(sidebar.getByText('my-app')).toBeVisible()
    await expect(sidebar.getByText('api-server')).toBeVisible()
  })

  test('clicking repo in sidebar navigates to repo page', async ({ page }) => {
    await page.goto('/')
    const sidebar = page.getByRole('navigation', { name: 'メインナビゲーション' })
    await sidebar.getByText('my-app').click()
    await page.waitForURL(/\/repos\/1/)
    await expect(page.getByRole('heading', { name: 'ドラフト一覧' })).toBeVisible()
  })

  test('scoped nav appears when repo is active', async ({ page }) => {
    await page.goto('/repos/1')
    const sidebar = page.getByRole('navigation', { name: 'メインナビゲーション' })
    await expect(sidebar.getByText('ドラフト一覧')).toBeVisible()
    await expect(sidebar.getByText('新規作成')).toBeVisible()
    await expect(sidebar.getByText('公開済み')).toBeVisible()
  })

  test('dark mode toggle is visible', async ({ page }) => {
    await page.goto('/')
    const sidebar = page.getByRole('navigation', { name: 'メインナビゲーション' })
    await expect(sidebar.getByRole('button', { name: /モードに切り替え/ })).toBeVisible()
  })

  test('dark mode toggle works', async ({ page }) => {
    await page.goto('/')
    const sidebar = page.getByRole('navigation', { name: 'メインナビゲーション' })
    const toggle = sidebar.getByRole('button', { name: /モードに切り替え/ })

    // Click to toggle to dark mode
    await toggle.click()
    await expect(page.locator('html')).toHaveClass(/dark/)

    // Click again to toggle back to light mode
    await toggle.click()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
  })

  test('settings link is always visible', async ({ page }) => {
    await page.goto('/')
    const sidebar = page.getByRole('navigation', { name: 'メインナビゲーション' })
    await expect(sidebar.getByText('設定')).toBeVisible()
  })

  test('clicking settings navigates to /settings', async ({ page }) => {
    await page.goto('/')
    const sidebar = page.getByRole('navigation', { name: 'メインナビゲーション' })
    await sidebar.getByText('設定').click()
    await page.waitForURL('/settings')
    await expect(page.getByRole('heading', { name: '外部ツール連携' })).toBeVisible()
  })

  test('scoped nav links work correctly', async ({ page }) => {
    await page.goto('/repos/1')
    const sidebar = page.getByRole('navigation', { name: 'メインナビゲーション' })

    await sidebar.getByText('新規作成').click()
    await page.waitForURL('/repos/1/new')
    await expect(page.getByText('新規Issue作成')).toBeVisible()

    await sidebar.getByText('公開済み').click()
    await page.waitForURL('/repos/1/published')
    await expect(page.getByText('公開済みIssue')).toBeVisible()

    await sidebar.getByText('ドラフト一覧').click()
    await page.waitForURL('/repos/1')
  })

  test('sidebar remains visible after navigation', async ({ page }) => {
    await page.goto('/repos/1')
    const sidebar = page.getByRole('navigation', { name: 'メインナビゲーション' })

    await sidebar.getByText('新規作成').click()
    await expect(sidebar).toBeVisible()

    await sidebar.getByText('公開済み').click()
    await expect(sidebar).toBeVisible()

    await sidebar.getByText('設定').click()
    await expect(sidebar).toBeVisible()
  })
})

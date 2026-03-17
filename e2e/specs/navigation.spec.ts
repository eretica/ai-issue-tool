import { test, expect } from '@playwright/test'

test.describe('Sidebar navigation', { tag: '@smoke' }, () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('sidebar is always visible', async ({ page }) => {
    const sidebar = page.getByRole('navigation', { name: 'メインナビゲーション' })
    await expect(sidebar).toBeVisible()
  })

  test('app title is displayed in sidebar', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'AI Issue Tool' })).toBeVisible()
  })

  test('all navigation links are visible', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'ドラフト一覧' })).toBeVisible()
    await expect(page.getByRole('link', { name: '新規作成' })).toBeVisible()
    await expect(page.getByRole('link', { name: '公開済み' })).toBeVisible()
    await expect(page.getByRole('link', { name: '設定' })).toBeVisible()
  })

  test('clicking "ドラフト一覧" navigates to /', async ({ page }) => {
    // Navigate away first
    await page.getByRole('link', { name: '新規作成' }).click()
    await expect(page).toHaveURL('/new')

    // Navigate back
    await page.getByRole('link', { name: 'ドラフト一覧' }).click()
    await expect(page).toHaveURL('/')
  })

  test('clicking "新規作成" navigates to /new', async ({ page }) => {
    await page.getByRole('link', { name: '新規作成' }).click()
    await expect(page).toHaveURL('/new')
  })

  test('clicking "公開済み" navigates to /published', async ({ page }) => {
    await page.getByRole('link', { name: '公開済み' }).click()
    await expect(page).toHaveURL('/published')
  })

  test('clicking "設定" navigates to /settings', async ({ page }) => {
    await page.getByRole('link', { name: '設定' }).click()
    await expect(page).toHaveURL('/settings')
  })

  test('active link has aria-current="page" on draft list (home)', async ({ page }) => {
    const draftLink = page.getByRole('link', { name: 'ドラフト一覧' })
    await expect(draftLink).toHaveAttribute('aria-current', 'page')

    // Other links should NOT have aria-current
    const newLink = page.getByRole('link', { name: '新規作成' })
    await expect(newLink).not.toHaveAttribute('aria-current', 'page')
  })

  test('active link changes when navigating', async ({ page }) => {
    // Navigate to 新規作成
    await page.getByRole('link', { name: '新規作成' }).click()

    const newLink = page.getByRole('link', { name: '新規作成' })
    await expect(newLink).toHaveAttribute('aria-current', 'page')

    const draftLink = page.getByRole('link', { name: 'ドラフト一覧' })
    await expect(draftLink).not.toHaveAttribute('aria-current', 'page')
  })

  test('sidebar remains visible after navigation', async ({ page }) => {
    const sidebar = page.getByRole('navigation', { name: 'メインナビゲーション' })

    await page.getByRole('link', { name: '新規作成' }).click()
    await expect(sidebar).toBeVisible()

    await page.getByRole('link', { name: '公開済み' }).click()
    await expect(sidebar).toBeVisible()

    await page.getByRole('link', { name: '設定' }).click()
    await expect(sidebar).toBeVisible()
  })
})

import { test, expect } from '@playwright/test'

test.describe('Draft list page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/repos/1')
  })

  test('page heading is displayed', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'ドラフト一覧' })).toBeVisible()
  })

  test('page has accessible section label', async ({ page }) => {
    const section = page.getByRole('region', { name: 'ドラフト一覧' })
    await expect(section).toBeVisible()
  })

  test('filter tabs are visible', async ({ page }) => {
    const tablist = page.getByRole('tablist', { name: 'ステータスフィルター' })
    await expect(tablist).toBeVisible()

    await expect(page.getByRole('tab', { name: 'すべて' })).toBeVisible()
    await expect(page.getByRole('tab', { name: '下書き' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'AI生成済み' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'レビュー済み' })).toBeVisible()
    await expect(page.getByRole('tab', { name: '公開済み' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'アーカイブ' })).toBeVisible()
  })

  test('"すべて" tab is selected by default', async ({ page }) => {
    const allTab = page.getByRole('tab', { name: 'すべて' })
    await expect(allTab).toHaveAttribute('aria-selected', 'true')
  })

  test('empty state message is displayed', async ({ page }) => {
    await expect(
      page.getByText('ドラフトがありません。新しいIssueを作成しましょう。')
    ).toBeVisible()
  })

  test('header has link to create new issue', async ({ page }) => {
    const createLink = page.getByRole('link', { name: '新規Issue作成' }).first()
    await expect(createLink).toBeVisible()
  })

  test('clicking "新規Issue作成" link navigates to repo new page', async ({ page }) => {
    await page.getByRole('link', { name: '新規Issue作成' }).first().click()
    await page.waitForURL('/repos/1/new')
    await expect(page.getByRole('heading', { name: '新規Issue作成' })).toBeVisible()
  })

  test('search input is visible', async ({ page }) => {
    await expect(page.getByLabel('ドラフト検索')).toBeVisible()
  })

  test('all filter tabs are clickable', async ({ page }) => {
    const tabs = ['すべて', '下書き', 'AI生成済み', 'レビュー済み', '公開済み', 'アーカイブ']

    for (const tabName of tabs) {
      const tab = page.getByRole('tab', { name: tabName })
      await tab.click()
      await expect(tab).toBeVisible()
    }
  })
})

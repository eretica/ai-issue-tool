import { test, expect } from '@playwright/test'

test.describe('Draft sorting', () => {
  test.beforeEach(async ({ page }) => {
    // Create drafts with different titles
    await page.goto('/repos/1/new')
    await page.getByRole('button', { name: 'バグ報告' }).click()
    await page.getByLabel('タイトル').fill('Aアルファ')
    await page.getByLabel('説明').fill('テスト')
    await page.getByRole('button', { name: '下書き保存' }).click()
    await page.waitForURL('/repos/1')

    await page.getByRole('link', { name: '新規Issue作成' }).first().click()
    await page.waitForURL('/repos/1/new')
    await page.getByRole('button', { name: '機能要望' }).click()
    await page.getByLabel('タイトル').fill('Zゼータ')
    await page.getByLabel('説明').fill('テスト')
    await page.getByRole('button', { name: '下書き保存' }).click()
    await page.waitForURL('/repos/1')
  })

  test('sort selector is visible', async ({ page }) => {
    await expect(page.getByLabel('並び替え')).toBeVisible()
  })

  test('sort by title A-Z', async ({ page }) => {
    await page.getByLabel('並び替え').selectOption({ label: 'タイトル（A→Z）' })
    const cards = page.locator('section[aria-label="ドラフト一覧"] a[href*="/drafts/"]')
    const titles = await cards.allTextContents()
    // First should contain "A"
    expect(titles[0]).toContain('Aアルファ')
    expect(titles[1]).toContain('Zゼータ')
  })

  test('sort by title Z-A', async ({ page }) => {
    await page.getByLabel('並び替え').selectOption({ label: 'タイトル（Z→A）' })
    const cards = page.locator('section[aria-label="ドラフト一覧"] a[href*="/drafts/"]')
    const titles = await cards.allTextContents()
    expect(titles[0]).toContain('Zゼータ')
    expect(titles[1]).toContain('Aアルファ')
  })
})

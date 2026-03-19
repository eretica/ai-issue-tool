import { test, expect } from '@playwright/test'

test.describe('Batch operations on draft list', () => {
  test.beforeEach(async ({ page }) => {
    // Create two drafts
    await page.goto('/repos/1/new')
    await page.getByRole('button', { name: 'バグ報告' }).click()
    await page.getByLabel('タイトル').fill('バッチテスト1')
    await page.getByLabel('説明').fill('テスト1')
    await page.getByRole('button', { name: '下書き保存' }).click()
    await page.waitForURL('/repos/1')

    await page.getByRole('link', { name: '新規Issue作成' }).first().click()
    await page.waitForURL('/repos/1/new')
    await page.getByRole('button', { name: '機能要望' }).click()
    await page.getByLabel('タイトル').fill('バッチテスト2')
    await page.getByLabel('説明').fill('テスト2')
    await page.getByRole('button', { name: '下書き保存' }).click()
    await page.waitForURL('/repos/1')
  })

  test('selecting a draft shows batch action bar', async ({ page }) => {
    // Initially no batch bar
    await expect(page.getByText('件選択中')).not.toBeVisible()

    // Select first draft
    await page.getByLabel('バッチテスト1を選択').check()

    // Batch bar appears
    await expect(page.getByText('1件選択中')).toBeVisible()
    await expect(page.getByRole('button', { name: '選択を削除' })).toBeVisible()
    await expect(page.getByRole('button', { name: '選択解除' })).toBeVisible()
  })

  test('deselect clears batch action bar', async ({ page }) => {
    await page.getByLabel('バッチテスト1を選択').check()
    await expect(page.getByText('1件選択中')).toBeVisible()

    await page.getByRole('button', { name: '選択解除' }).click()
    await expect(page.getByText('件選択中')).not.toBeVisible()
  })

  test('batch delete with confirm removes drafts', async ({ page }) => {
    await page.getByLabel('バッチテスト1を選択').check()
    await page.getByLabel('バッチテスト2を選択').check()
    await expect(page.getByText('2件選択中')).toBeVisible()

    await page.getByRole('button', { name: '選択を削除' }).click()

    // Confirm dialog
    await expect(page.getByText('2件のドラフトを削除しますか？')).toBeVisible()
    await page.getByRole('button', { name: '削除する' }).click()

    // Both drafts should be gone
    await expect(page.getByText('バッチテスト1')).not.toBeVisible()
    await expect(page.getByText('バッチテスト2')).not.toBeVisible()

    // Toast notification
    await expect(page.getByRole('status').getByText('2件のドラフトを削除しました')).toBeVisible()
  })

  test('batch delete cancel preserves drafts', async ({ page }) => {
    await page.getByLabel('バッチテスト1を選択').check()
    await page.getByRole('button', { name: '選択を削除' }).click()

    await expect(page.getByText('1件のドラフトを削除しますか？')).toBeVisible()
    await page.getByRole('button', { name: 'キャンセル' }).click()

    // Draft still visible
    await expect(page.getByText('バッチテスト1')).toBeVisible()
  })
})

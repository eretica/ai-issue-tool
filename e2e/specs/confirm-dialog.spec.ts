import { test, expect } from '@playwright/test'

test.describe('Confirm dialog', () => {
  test.beforeEach(async ({ page }) => {
    // Create a draft first
    await page.goto('/repos/1/new')
    await page.getByRole('button', { name: 'バグ報告' }).click()
    await page.getByLabel('タイトル').fill('確認ダイアログテスト')
    await page.getByLabel('説明').fill('テスト用')
    await page.getByRole('button', { name: '下書き保存' }).click()
    await page.waitForURL('/repos/1')

    await page.getByText('確認ダイアログテスト').click()
    await page.waitForURL(/\/repos\/1\/drafts\/\d+/)
  })

  test('delete cancel keeps user on edit page', async ({ page }) => {
    await page.getByRole('button', { name: '削除' }).click()
    await expect(page.getByText('ドラフトを削除しますか？')).toBeVisible()

    // Click cancel
    await page.getByRole('button', { name: 'キャンセル' }).click()
    await expect(page.getByText('ドラフトを削除しますか？')).not.toBeVisible()

    // Still on edit page
    await expect(page.getByLabel('ドラフトタイトル')).toBeVisible()
  })

  test('publish cancel keeps user on edit page', async ({ page }) => {
    await page.getByRole('button', { name: '公開' }).click()
    await expect(page.getByText('Issueを公開しますか？')).toBeVisible()

    await page.getByRole('button', { name: 'キャンセル' }).click()
    await expect(page.getByText('Issueを公開しますか？')).not.toBeVisible()

    await expect(page.getByLabel('ドラフトタイトル')).toBeVisible()
  })

  test('delete confirm dialog has danger button', async ({ page }) => {
    await page.getByRole('button', { name: '削除' }).click()
    const confirmBtn = page.getByRole('button', { name: '削除する' })
    await expect(confirmBtn).toBeVisible()
    // Danger button should have bg-red-600 class
    await expect(confirmBtn).toHaveClass(/bg-red-600/)
  })

  test('publish confirm and navigate to published', async ({ page }) => {
    await page.getByRole('button', { name: '公開' }).click()
    await page.getByRole('button', { name: '公開する' }).click()
    await page.waitForURL('/repos/1/published')
    await expect(page.getByText('確認ダイアログテスト')).toBeVisible()
  })
})

test.describe('Unsaved changes indicator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/repos/1/new')
    await page.getByRole('button', { name: '機能要望' }).click()
    await page.getByLabel('タイトル').fill('未保存テスト')
    await page.getByLabel('説明').fill('テスト')
    await page.getByRole('button', { name: '下書き保存' }).click()
    await page.waitForURL('/repos/1')

    await page.getByText('未保存テスト').click()
    await page.waitForURL(/\/repos\/1\/drafts\/\d+/)
  })

  test('shows unsaved indicator after editing', async ({ page }) => {
    // Initially no unsaved indicator
    await expect(page.getByText('未保存の変更あり')).not.toBeVisible()

    // Edit the body
    const editor = page.getByLabel('Markdownエディタ')
    await editor.fill('変更後の内容')

    // Unsaved indicator appears
    await expect(page.getByText('未保存の変更あり')).toBeVisible()
  })

  test('unsaved indicator disappears after manual save', async ({ page }) => {
    const editor = page.getByLabel('Markdownエディタ')
    await editor.fill('変更後の内容')

    await expect(page.getByText('未保存の変更あり')).toBeVisible()

    // Save manually
    await page.getByRole('button', { name: '保存' }).click()
    await expect(page.getByRole('status').getByText('保存しました', { exact: true })).toBeVisible()

    // Indicator should disappear
    await expect(page.getByText('未保存の変更あり')).not.toBeVisible()
  })
})

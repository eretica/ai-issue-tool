import { test, expect } from '@playwright/test'

test.describe('Settings page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings')
  })

  test('page heading is displayed', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '設定', exact: true })).toBeVisible()
  })

  test('page has accessible section label', async ({ page }) => {
    const section = page.getByRole('region', { name: '設定' })
    await expect(section).toBeVisible()
  })

  test('外部ツール連携 section is present', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '外部ツール連携' })).toBeVisible()
  })

  test('GitHub mode selector is present', async ({ page }) => {
    const githubMode = page.getByLabel('GitHub連携')
    await expect(githubMode).toBeVisible()
  })

  test('AI engine selector is present', async ({ page }) => {
    const aiMode = page.getByLabel('AI生成エンジン')
    await expect(aiMode).toBeVisible()
  })

  test('can select GitHub mode', async ({ page }) => {
    const githubMode = page.getByLabel('GitHub連携')
    await githubMode.selectOption('gh-cli')
    await expect(githubMode).toHaveValue('gh-cli')
    await expect(page.getByText('gh CLIがインストール・認証済みである必要があります')).toBeVisible()
  })

  test('can select AI engine', async ({ page }) => {
    const aiMode = page.getByLabel('AI生成エンジン')
    await aiMode.selectOption('claude-cli')
    await expect(aiMode).toHaveValue('claude-cli')
    await expect(page.getByText('Claude Codeがインストールされている必要があります')).toBeVisible()
  })

  test('save button saves connection settings', async ({ page }) => {
    await page.getByLabel('GitHub連携').selectOption('gh-cli')
    await page.getByRole('button', { name: '保存', exact: true }).click()
    await expect(page.getByRole('status').getByText('保存しました', { exact: true })).toBeVisible()
  })

  test('AI生成設定 section is present', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'AI生成設定' })).toBeVisible()
  })

  test('default generation mode radio buttons are present', async ({ page }) => {
    const radioGroup = page.getByRole('radiogroup', { name: 'デフォルト生成モード' })
    await expect(radioGroup).toBeVisible()
  })

  test('save AI settings', async ({ page }) => {
    await page.getByRole('button', { name: 'AI設定を保存' }).click()
    await expect(page.getByRole('status').getByText('AI設定を保存しました')).toBeVisible()
  })

  test('version info is displayed', async ({ page }) => {
    await expect(page.getByText('AI Issue Tool v1.0.0')).toBeVisible()
  })
})

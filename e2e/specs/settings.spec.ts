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

  test('API設定 section is present', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'API設定' })).toBeVisible()
  })

  test('GitHub token input is present', async ({ page }) => {
    const tokenInput = page.getByLabel('GitHub Personal Access Token')
    await expect(tokenInput).toBeVisible()
    await expect(tokenInput).toHaveAttribute('type', 'password')
  })

  test('Claude API key input is present', async ({ page }) => {
    const apiKeyInput = page.getByLabel('Claude API Key')
    await expect(apiKeyInput).toBeVisible()
    await expect(apiKeyInput).toHaveAttribute('type', 'password')
  })

  test('リポジトリ管理 section is present', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'リポジトリ管理' })).toBeVisible()
    await expect(
      page.getByText('Issueを作成するリポジトリを管理します。')
    ).toBeVisible()
  })

  test('リポジトリ管理 link is present', async ({ page }) => {
    await expect(
      page.getByRole('link', { name: 'リポジトリ管理を開く' })
    ).toBeVisible()
  })

  test('テンプレート管理 section is present', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'テンプレート管理' })).toBeVisible()
    await expect(
      page.getByText('Issueのテンプレートをカスタマイズします。')
    ).toBeVisible()
  })

  test('テンプレート一覧 link is present', async ({ page }) => {
    await expect(
      page.getByRole('link', { name: 'テンプレート一覧を開く' })
    ).toBeVisible()
  })

  test('can type in GitHub token field', async ({ page }) => {
    const tokenInput = page.getByLabel('GitHub Personal Access Token')
    await tokenInput.fill('ghp_test_token_12345')
    await expect(tokenInput).toHaveValue('ghp_test_token_12345')
  })

  test('can type in Claude API key field', async ({ page }) => {
    const apiKeyInput = page.getByLabel('Claude API Key')
    await apiKeyInput.fill('sk-ant-test_key_12345')
    await expect(apiKeyInput).toHaveValue('sk-ant-test_key_12345')
  })

  test('clicking リポジトリ管理を開く navigates to repositories page', async ({ page }) => {
    await page.getByRole('link', { name: 'リポジトリ管理を開く' }).click()
    await expect(page).toHaveURL('/settings/repositories')
  })
})

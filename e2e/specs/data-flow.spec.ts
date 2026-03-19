import { test, expect } from '@playwright/test'

test.describe('Draft creation and listing flow', () => {
  test('create a draft via form and see it in the list', async ({ page }) => {
    await page.goto('/repos/1/new')

    // Select a template
    await page.getByRole('button', { name: 'バグ報告' }).click()
    await expect(page.getByRole('button', { name: 'バグ報告' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )

    // Fill in basic info (no repo selector — repo is from URL)
    await page.getByLabel('タイトル').fill('テスト用バグ報告')
    await page.getByLabel('説明').fill('ログイン画面で500エラーが発生する')
    await page.getByLabel('対象ページ').fill('/login')

    // Save as draft
    await page.getByRole('button', { name: '下書き保存' }).click()

    // Should navigate back to repo draft list
    await page.waitForURL('/repos/1')

    // Draft should appear in the list
    await expect(page.getByText('テスト用バグ報告')).toBeVisible()
    const draftCard = page.getByRole('link', { name: /テスト用バグ報告/ })
    await expect(draftCard).toBeVisible()
  })

  test('create draft via AI generation (ai_doc mode)', async ({ page }) => {
    await page.goto('/repos/1/new')

    await page.getByRole('button', { name: '機能要望' }).click()
    // ai_doc is default
    await expect(page.getByRole('radio', { name: 'AI向けドキュメント' })).toBeChecked()
    await page.getByLabel('説明').fill('ダークモードを実装してほしい')

    await page.getByRole('button', { name: 'AIでIssueを生成' }).click()

    // Should navigate back to draft list (background generation)
    await page.waitForURL('/repos/1')

    // Toast should show
    await expect(page.getByRole('status').getByText('AI生成を開始しました')).toBeVisible()

    // Draft should appear in the list (mock completes instantly)
    // Wait for the draft card badge to show AI生成済み (not the filter tab)
    await expect(page.locator('.rounded-full:has-text("AI生成済み")').first()).toBeVisible({ timeout: 10000 })

    // Click on the draft to verify content
    await page.getByRole('link', { name: /ダークモード/ }).first().click()
    await page.waitForURL(/\/repos\/1\/drafts\/\d+/)

    const editor = page.getByLabel('Markdownエディタ')
    await expect(editor).toBeVisible()
    // AI doc should contain implementation plan structure
    await expect(editor).toContainText('実装計画')
  })

  test('create draft via AI generation (human_doc mode)', async ({ page }) => {
    await page.goto('/repos/1/new')

    await page.getByRole('button', { name: '機能要望' }).click()
    // Switch to human doc mode
    await page.getByRole('radio', { name: '人間向けドキュメント' }).click()
    await page.getByLabel('説明').fill('通知機能を追加してほしい')

    await page.getByRole('button', { name: 'AIでIssueを生成' }).click()

    // Should navigate back to draft list (background generation)
    await page.waitForURL('/repos/1')

    // Wait for the draft card badge to show AI生成済み
    await expect(page.locator('.rounded-full:has-text("AI生成済み")').first()).toBeVisible({ timeout: 10000 })

    // Click on the draft to verify content
    await page.getByRole('link', { name: /通知機能/ }).first().click()
    await page.waitForURL(/\/repos\/1\/drafts\/\d+/)

    const editor = page.getByLabel('Markdownエディタ')
    await expect(editor).toBeVisible()
    // Human doc should contain overview structure
    await expect(editor).toContainText('概要')
    await expect(editor).toContainText('受け入れ条件')
  })
})

test.describe('Draft edit flow', () => {
  test.beforeEach(async ({ page }) => {
    // Create a draft first
    await page.goto('/repos/1/new')
    await page.getByRole('button', { name: 'バグ報告' }).click()
    await page.getByLabel('タイトル').fill('編集テスト用ドラフト')
    await page.getByLabel('説明').fill('テスト説明文')
    await page.getByRole('button', { name: '下書き保存' }).click()
    await page.waitForURL('/repos/1')

    // Click on the draft to navigate to edit page
    await page.getByText('編集テスト用ドラフト').click()
    await page.waitForURL(/\/repos\/1\/drafts\/\d+/)
  })

  test('edit draft title and body', async ({ page }) => {
    const titleInput = page.getByLabel('ドラフトタイトル')
    await titleInput.clear()
    await titleInput.fill('更新されたタイトル')
    await expect(titleInput).toHaveValue('更新されたタイトル')

    const editor = page.getByLabel('Markdownエディタ')
    await editor.clear()
    await editor.fill('## 更新された内容')
    await expect(editor).toHaveValue('## 更新された内容')

    await expect(page.getByLabel('Markdownプレビュー')).toContainText('更新された内容')
  })

  test('save draft shows success feedback', async ({ page }) => {
    await page.getByLabel('Markdownエディタ').fill('更新内容')
    await page.getByRole('button', { name: '保存' }).click()
    await expect(page.getByRole('status').getByText('保存しました', { exact: true })).toBeVisible()
  })

  test('character count is displayed', async ({ page }) => {
    const editor = page.getByLabel('Markdownエディタ')
    await editor.clear()
    await editor.fill('テスト文字列')
    // Character count should update
    await expect(page.getByText(/6文字/)).toBeVisible()
    await expect(page.getByText(/1行/)).toBeVisible()
  })

  test('copy button is visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'コピー' })).toBeVisible()
  })

  test('Cmd+S shortcut hint is visible', async ({ page }) => {
    await expect(page.getByText('Cmd+S で保存')).toBeVisible()
  })

  test('markdown preview renders formatted content', async ({ page }) => {
    const editor = page.getByLabel('Markdownエディタ')
    await editor.clear()
    await editor.fill('**太字テスト**')
    const preview = page.getByLabel('Markdownプレビュー')
    // Should render bold text (strong element)
    await expect(preview.locator('strong')).toContainText('太字テスト')
  })

  test('delete draft navigates to repo page', async ({ page }) => {
    await page.getByRole('button', { name: '削除' }).click()
    // Confirm dialog appears
    await expect(page.getByText('ドラフトを削除しますか？')).toBeVisible()
    await page.getByRole('button', { name: '削除する' }).click()
    await page.waitForURL('/repos/1')
  })
})

test.describe('Publish flow', () => {
  test('publish draft and see it in published list', async ({ page }) => {
    await page.goto('/repos/1/new')
    await page.getByRole('button', { name: '改善提案' }).click()
    await page.getByLabel('タイトル').fill('公開テスト用Issue')
    await page.getByLabel('説明').fill('テスト公開フロー')
    await page.getByRole('button', { name: '下書き保存' }).click()
    await page.waitForURL('/repos/1')

    await page.getByText('公開テスト用Issue').click()
    await page.waitForURL(/\/repos\/1\/drafts\/\d+/)

    await page.getByRole('button', { name: '公開' }).click()
    // Confirm dialog appears
    await expect(page.getByText('Issueを公開しますか？')).toBeVisible()
    await page.getByRole('button', { name: '公開する' }).click()
    await page.waitForURL('/repos/1/published')

    await expect(page.getByText('公開テスト用Issue')).toBeVisible()
    await expect(page.getByText('open')).toBeVisible()
  })
})

test.describe('Filter tabs', () => {
  test('filter tabs switch and show correct drafts', async ({ page }) => {
    await page.goto('/repos/1/new')
    await page.getByRole('button', { name: 'バグ報告' }).click()
    await page.getByLabel('タイトル').fill('フィルタテスト1')
    await page.getByLabel('説明').fill('テスト')
    await page.getByRole('button', { name: '下書き保存' }).click()
    await page.waitForURL('/repos/1')

    await expect(page.getByText('フィルタテスト1')).toBeVisible()

    await page.getByRole('tab', { name: '下書き' }).click()
    await expect(page.getByText('フィルタテスト1')).toBeVisible()

    await page.getByRole('tab', { name: 'AI生成済み' }).click()
    await expect(page.getByText('ドラフトがありません')).toBeVisible()

    await page.getByRole('tab', { name: 'すべて' }).click()
    await expect(page.getByText('フィルタテスト1')).toBeVisible()
  })
})

test.describe('Settings save flow', () => {
  test('save connection settings', async ({ page }) => {
    await page.goto('/settings')
    await page.getByLabel('GitHub連携').selectOption('gh-cli')
    await page.getByRole('button', { name: '保存', exact: true }).click()
    await expect(page.getByRole('status').getByText('保存しました', { exact: true })).toBeVisible()
  })
})

test.describe('Label selection', () => {
  test('labels are visible for repo (from URL)', async ({ page }) => {
    await page.goto('/repos/1/new')
    await page.getByRole('button', { name: 'ラベル・担当' }).click()

    // Since repo 1 has labels in mock, they should be visible immediately
    await expect(page.getByText('bug')).toBeVisible()
    await expect(page.getByText('enhancement')).toBeVisible()
  })
})

test.describe('Repository management', () => {
  test('add repo manually and navigate to it', async ({ page }) => {
    await page.goto('/')

    // Fill manual add form
    await page.getByPlaceholder('owner/name').fill('test-org/new-repo')
    await page.getByRole('button', { name: '追加', exact: true }).click()

    // New repo should appear
    await expect(page.getByText('test-org/new-repo')).toBeVisible()
  })
})

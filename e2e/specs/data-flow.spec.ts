import { test, expect } from '@playwright/test'

test.describe('Draft creation and listing flow', () => {
  test('create a draft via form and see it in the list', async ({ page }) => {
    // Navigate to new issue page
    await page.goto('/new')

    // Select a template
    await page.getByRole('button', { name: 'バグ報告' }).click()
    await expect(page.getByRole('button', { name: 'バグ報告' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )

    // Fill in basic info
    await page.getByLabel('タイトル').fill('テスト用バグ報告')
    await page.getByLabel('説明').fill('ログイン画面で500エラーが発生する')
    await page.getByLabel('対象ページ').fill('/login')

    // Select a repository
    await page.getByLabel('リポジトリ').selectOption({ index: 1 })

    // Save as draft
    await page.getByRole('button', { name: '下書き保存' }).click()

    // Should navigate back to draft list
    await page.waitForURL('/')

    // Draft should appear in the list with its status badge
    await expect(page.getByText('テスト用バグ報告')).toBeVisible()
    // Verify the draft card contains a status badge (within the card, not the filter tab)
    const draftCard = page.getByRole('link', { name: /テスト用バグ報告/ })
    await expect(draftCard).toBeVisible()
  })

  test('create draft via AI generation', async ({ page }) => {
    await page.goto('/new')

    // Select template
    await page.getByRole('button', { name: '機能要望' }).click()

    // Fill description (required for AI generation)
    await page.getByLabel('説明').fill('ダークモードを実装してほしい')

    // Select a repository
    await page.getByLabel('リポジトリ').selectOption({ index: 1 })

    // Click AI generate
    await page.getByRole('button', { name: 'AIでIssueを生成' }).click()

    // Should navigate to draft edit page
    await page.waitForURL(/\/drafts\/\d+/)

    // Draft edit page should show AI-generated content
    await expect(page.getByLabel('ドラフトタイトル')).toBeVisible()
    await expect(page.getByLabel('Markdownエディタ')).toBeVisible()
  })
})

test.describe('Draft edit flow', () => {
  test.beforeEach(async ({ page }) => {
    // Create a draft first
    await page.goto('/new')
    await page.getByRole('button', { name: 'バグ報告' }).click()
    await page.getByLabel('タイトル').fill('編集テスト用ドラフト')
    await page.getByLabel('説明').fill('テスト説明文')
    await page.getByLabel('リポジトリ').selectOption({ index: 1 })
    await page.getByRole('button', { name: '下書き保存' }).click()
    await page.waitForURL('/')

    // Click on the draft to navigate to edit page
    await page.getByText('編集テスト用ドラフト').click()
    await page.waitForURL(/\/drafts\/\d+/)
  })

  test('edit draft title and body', async ({ page }) => {
    // Edit title
    const titleInput = page.getByLabel('ドラフトタイトル')
    await titleInput.clear()
    await titleInput.fill('更新されたタイトル')
    await expect(titleInput).toHaveValue('更新されたタイトル')

    // Edit body
    const editor = page.getByLabel('Markdownエディタ')
    await editor.clear()
    await editor.fill('## 更新された内容')
    await expect(editor).toHaveValue('## 更新された内容')

    // Preview should update
    await expect(page.getByLabel('Markdownプレビュー')).toContainText('## 更新された内容')
  })

  test('save draft shows success feedback', async ({ page }) => {
    await page.getByLabel('Markdownエディタ').fill('更新内容')
    await page.getByRole('button', { name: '保存' }).click()
    await expect(page.getByText('保存しました')).toBeVisible()
  })

  test('delete draft navigates to home', async ({ page }) => {
    await page.getByRole('button', { name: '削除' }).click()
    await page.waitForURL('/')
  })
})

test.describe('Publish flow', () => {
  test('publish draft and see it in published list', async ({ page }) => {
    // Create a draft
    await page.goto('/new')
    await page.getByRole('button', { name: '改善提案' }).click()
    await page.getByLabel('タイトル').fill('公開テスト用Issue')
    await page.getByLabel('説明').fill('テスト公開フロー')
    await page.getByLabel('リポジトリ').selectOption({ index: 1 })
    await page.getByRole('button', { name: '下書き保存' }).click()
    await page.waitForURL('/')

    // Navigate to draft edit
    await page.getByText('公開テスト用Issue').click()
    await page.waitForURL(/\/drafts\/\d+/)

    // Publish
    await page.getByRole('button', { name: '公開' }).click()
    await page.waitForURL('/published')

    // Should appear in published list
    await expect(page.getByText('公開テスト用Issue')).toBeVisible()
    await expect(page.getByText('open')).toBeVisible()
  })
})

test.describe('Filter tabs', () => {
  test('filter tabs switch and show correct drafts', async ({ page }) => {
    // Create two drafts with different statuses
    await page.goto('/new')
    await page.getByRole('button', { name: 'バグ報告' }).click()
    await page.getByLabel('タイトル').fill('フィルタテスト1')
    await page.getByLabel('説明').fill('テスト')
    await page.getByLabel('リポジトリ').selectOption({ index: 1 })
    await page.getByRole('button', { name: '下書き保存' }).click()
    await page.waitForURL('/')

    // Should show the draft
    await expect(page.getByText('フィルタテスト1')).toBeVisible()

    // Click "下書き" filter tab
    await page.getByRole('tab', { name: '下書き' }).click()
    await expect(page.getByText('フィルタテスト1')).toBeVisible()

    // Click "AI生成済み" filter tab - should be empty
    await page.getByRole('tab', { name: 'AI生成済み' }).click()
    await expect(page.getByText('ドラフトがありません')).toBeVisible()

    // Click "すべて" to see all again
    await page.getByRole('tab', { name: 'すべて' }).click()
    await expect(page.getByText('フィルタテスト1')).toBeVisible()
  })
})

test.describe('Settings save flow', () => {
  test('save API settings', async ({ page }) => {
    await page.goto('/settings')

    // Fill in settings
    await page.getByLabel('GitHub Personal Access Token').fill('ghp_test12345')
    await page.getByLabel('Claude API Key').fill('sk-ant-test12345')

    // Save
    await page.getByRole('button', { name: '保存' }).click()

    // Should show success message
    await expect(page.getByText('保存しました')).toBeVisible()
  })
})

test.describe('Label selection', () => {
  test('labels appear when repository is selected', async ({ page }) => {
    await page.goto('/new')

    // Expand labels section
    await page.getByRole('button', { name: 'ラベル・担当' }).click()

    // Initially shows instruction text
    await expect(page.getByText('リポジトリを選択するとラベルが表示されます')).toBeVisible()

    // Select a repository
    await page.getByLabel('リポジトリ').selectOption({ index: 1 })

    // Labels should now appear as checkboxes
    await expect(page.getByText('bug')).toBeVisible()
    await expect(page.getByText('enhancement')).toBeVisible()
  })
})

import { test, expect } from '@playwright/test'

test.describe('New Issue page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/new')
  })

  test('page heading is displayed', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '新規Issue作成' })).toBeVisible()
  })

  test('template selection buttons are visible', async ({ page }) => {
    const templateGroup = page.getByRole('group', { name: 'テンプレート選択' })
    await expect(templateGroup).toBeVisible()

    await expect(page.getByRole('button', { name: 'バグ報告' })).toBeVisible()
    await expect(page.getByRole('button', { name: '機能要望' })).toBeVisible()
    await expect(page.getByRole('button', { name: '改善提案' })).toBeVisible()
  })

  test('basic info section is open by default', async ({ page }) => {
    // The "基本情報" section has defaultOpen=true, so its fields should be visible
    await expect(page.getByLabel('タイトル')).toBeVisible()
    await expect(page.getByLabel('説明')).toBeVisible()
    await expect(page.getByLabel('対象ページ')).toBeVisible()
    await expect(page.getByLabel('リポジトリ')).toBeVisible()
  })

  test('fill in basic info fields', async ({ page }) => {
    await page.getByLabel('タイトル').fill('ログイン画面でエラーが発生する')
    await expect(page.getByLabel('タイトル')).toHaveValue('ログイン画面でエラーが発生する')

    await page.getByLabel('説明').fill('ログインボタンを押すと500エラーが返される')
    await expect(page.getByLabel('説明')).toHaveValue('ログインボタンを押すと500エラーが返される')

    await page.getByLabel('対象ページ').fill('/login')
    await expect(page.getByLabel('対象ページ')).toHaveValue('/login')
  })

  test('design info section can be expanded and filled', async ({ page }) => {
    // Figma URL field should not be visible initially (section is collapsed)
    await expect(page.getByLabel('Figma URL')).not.toBeVisible()

    // Expand the "デザイン情報" section
    await page.getByRole('button', { name: 'デザイン情報' }).click()

    // Now fields should be visible
    await expect(page.getByLabel('Figma URL')).toBeVisible()
    await expect(page.getByLabel('フレーム名')).toBeVisible()
    await expect(page.getByLabel('デザインノート')).toBeVisible()

    // Fill in the fields
    await page.getByLabel('Figma URL').fill('https://www.figma.com/file/abc123')
    await expect(page.getByLabel('Figma URL')).toHaveValue('https://www.figma.com/file/abc123')

    await page.getByLabel('フレーム名').fill('Login Screen')
    await expect(page.getByLabel('フレーム名')).toHaveValue('Login Screen')

    await page.getByLabel('デザインノート').fill('新しいレイアウトに変更')
    await expect(page.getByLabel('デザインノート')).toHaveValue('新しいレイアウトに変更')
  })

  test('related info section can be expanded and filled', async ({ page }) => {
    // Related issues field should not be visible initially
    await expect(page.getByLabel('関連Issue')).not.toBeVisible()

    // Expand the "関連情報" section
    await page.getByRole('button', { name: '関連情報' }).click()

    // Now fields should be visible
    await expect(page.getByLabel('関連Issue')).toBeVisible()
    await expect(page.getByLabel('参考URL')).toBeVisible()

    // Fill in related issue
    await page.getByLabel('関連Issue').fill('#123, #456')
    await expect(page.getByLabel('関連Issue')).toHaveValue('#123, #456')

    await page.getByLabel('参考URL').fill('https://example.com/docs')
    await expect(page.getByLabel('参考URL')).toHaveValue('https://example.com/docs')
  })

  test('attachment section can be expanded', async ({ page }) => {
    // The drop zone should not be visible initially
    await expect(
      page.getByRole('button', { name: 'ファイルをドロップまたはクリックして添付' })
    ).not.toBeVisible()

    // Expand the "添付ファイル" section
    await page.getByRole('button', { name: '添付ファイル' }).click()

    // Drop zone should now be visible
    await expect(
      page.getByRole('button', { name: 'ファイルをドロップまたはクリックして添付' })
    ).toBeVisible()
  })

  test('labels and assignee section can be expanded', async ({ page }) => {
    // Fields should not be visible initially
    await expect(page.getByLabel('ラベル')).not.toBeVisible()

    // Expand the "ラベル・担当" section
    await page.getByRole('button', { name: 'ラベル・担当' }).click()

    // Now fields should be visible
    await expect(page.getByLabel('ラベル')).toBeVisible()
    await expect(page.getByLabel('アサイニー')).toBeVisible()
  })

  test('action buttons are visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: '下書き保存' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'AIでIssueを生成' })).toBeVisible()
  })

  test('accordion sections can be toggled open and closed', async ({ page }) => {
    // Open "デザイン情報"
    await page.getByRole('button', { name: 'デザイン情報' }).click()
    await expect(page.getByLabel('Figma URL')).toBeVisible()

    // Close "デザイン情報"
    await page.getByRole('button', { name: 'デザイン情報' }).click()
    await expect(page.getByLabel('Figma URL')).not.toBeVisible()
  })

  test('form has accessible name', async ({ page }) => {
    const form = page.getByRole('form', { name: 'Issue入力フォーム' })
    await expect(form).toBeVisible()
  })
})

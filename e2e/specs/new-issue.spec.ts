import { test, expect } from '@playwright/test'

test.describe('New Issue page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/repos/1/new')
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
    await expect(page.getByLabel('タイトル')).toBeVisible()
    await expect(page.getByLabel('説明')).toBeVisible()
    await expect(page.getByLabel('対象ページ')).toBeVisible()
    // Repository selector should NOT be present (repo is from URL)
    await expect(page.getByLabel('リポジトリ')).not.toBeVisible()
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
    await expect(page.getByLabel('Figma URL')).not.toBeVisible()
    await page.getByRole('button', { name: 'デザイン情報' }).click()

    await expect(page.getByLabel('Figma URL')).toBeVisible()
    await expect(page.getByLabel('フレーム名')).toBeVisible()
    await expect(page.getByLabel('デザインノート')).toBeVisible()

    await page.getByLabel('Figma URL').fill('https://www.figma.com/file/abc123')
    await expect(page.getByLabel('Figma URL')).toHaveValue('https://www.figma.com/file/abc123')
  })

  test('related info section can be expanded and filled', async ({ page }) => {
    await expect(page.getByLabel('関連Issue')).not.toBeVisible()
    await page.getByRole('button', { name: '関連情報' }).click()

    await expect(page.getByLabel('関連Issue')).toBeVisible()
    await expect(page.getByLabel('参考URL')).toBeVisible()

    await page.getByLabel('関連Issue').fill('#123, #456')
    await expect(page.getByLabel('関連Issue')).toHaveValue('#123, #456')
  })

  test('attachment section can be expanded', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: 'ファイルをドロップまたはクリックして添付' })
    ).not.toBeVisible()

    await page.getByRole('button', { name: '添付ファイル' }).click()
    await expect(
      page.getByRole('button', { name: 'ファイルをドロップまたはクリックして添付' })
    ).toBeVisible()
  })

  test('labels section shows labels for repo', async ({ page }) => {
    await page.getByRole('button', { name: 'ラベル・担当' }).click()
    // Since repo 1 has labels in mock, they should be visible
    await expect(page.getByText('bug')).toBeVisible()
    await expect(page.getByText('enhancement')).toBeVisible()
  })

  test('generation mode radio buttons are visible and selectable', async ({ page }) => {
    const radioGroup = page.getByRole('radiogroup', { name: '生成モード' })
    await expect(radioGroup).toBeVisible()

    const aiDocRadio = page.getByRole('radio', { name: 'AI向けドキュメント' })
    const humanDocRadio = page.getByRole('radio', { name: '人間向けドキュメント' })

    await expect(aiDocRadio).toBeVisible()
    await expect(humanDocRadio).toBeVisible()

    // AI doc is selected by default
    await expect(aiDocRadio).toBeChecked()
    await expect(humanDocRadio).not.toBeChecked()

    // Switch to human doc
    await humanDocRadio.click()
    await expect(humanDocRadio).toBeChecked()
    await expect(aiDocRadio).not.toBeChecked()

    // Description updates (card description text)
    await expect(page.getByText('目的・背景・達成条件を簡潔にまとめた仕様書')).toBeVisible()
  })

  test('action buttons are visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: '下書き保存' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'AIでIssueを生成' })).toBeVisible()
  })

  test('form has accessible name', async ({ page }) => {
    const form = page.getByRole('form', { name: 'Issue入力フォーム' })
    await expect(form).toBeVisible()
  })
})

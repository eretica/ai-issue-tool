import { useState } from 'react'

const templates = [
  { slug: 'bug-report', label: 'バグ報告' },
  { slug: 'feature-request', label: '機能要望' },
  { slug: 'improvement', label: '改善提案' },
] as const

interface AccordionSectionProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}

function AccordionSection({ title, defaultOpen = false, children }: AccordionSectionProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-[var(--border)]">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)]"
      >
        {title}
        <span aria-hidden="true" className="text-xs">{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

export function NewIssuePage(): React.JSX.Element {
  return (
    <section aria-label="新規Issue作成">
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-[var(--foreground)]">新規Issue作成</h2>
      </header>

      <div className="mb-6">
        <p className="mb-2 text-sm font-medium text-[var(--foreground)]">テンプレート選択</p>
        <div className="flex gap-2" role="group" aria-label="テンプレート選択">
          {templates.map((tpl) => (
            <button
              key={tpl.slug}
              className="rounded-md border border-[var(--border)] bg-[var(--secondary)] px-4 py-2 text-sm text-[var(--secondary-foreground)] transition-colors hover:bg-[var(--accent)]"
            >
              {tpl.label}
            </button>
          ))}
        </div>
      </div>

      <form aria-label="Issue入力フォーム" className="rounded-lg border border-[var(--border)]">
        <AccordionSection title="基本情報" defaultOpen>
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="issue-title" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                タイトル
              </label>
              <input
                id="issue-title"
                type="text"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                placeholder="Issueのタイトルを入力"
              />
            </div>
            <div>
              <label htmlFor="issue-description" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                説明
              </label>
              <textarea
                id="issue-description"
                rows={4}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                placeholder="Issueの詳細を入力"
              />
            </div>
            <div>
              <label htmlFor="target-page" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                対象ページ
              </label>
              <input
                id="target-page"
                type="text"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                placeholder="対象ページのURLまたはパス"
              />
            </div>
            <div>
              <label htmlFor="repository-select" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                リポジトリ
              </label>
              <select
                id="repository-select"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
              >
                <option value="">リポジトリを選択</option>
              </select>
            </div>
          </div>
        </AccordionSection>

        <AccordionSection title="デザイン情報">
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="figma-url" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                Figma URL
              </label>
              <input
                id="figma-url"
                type="url"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                placeholder="https://www.figma.com/..."
              />
            </div>
            <div>
              <label htmlFor="figma-frame" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                フレーム名
              </label>
              <input
                id="figma-frame"
                type="text"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                placeholder="フレーム名を入力"
              />
            </div>
            <div>
              <label htmlFor="design-notes" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                デザインノート
              </label>
              <textarea
                id="design-notes"
                rows={3}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                placeholder="デザインに関するメモ"
              />
            </div>
          </div>
        </AccordionSection>

        <AccordionSection title="添付ファイル">
          <div
            role="button"
            tabIndex={0}
            aria-label="ファイルをドロップまたはクリックして添付"
            className="flex items-center justify-center rounded-lg border-2 border-dashed border-[var(--border)] py-12 text-sm text-[var(--muted-foreground)] transition-colors hover:border-[var(--ring)]"
          >
            ファイルをドロップまたはクリックして添付
          </div>
        </AccordionSection>

        <AccordionSection title="関連情報">
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="related-issues" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                関連Issue
              </label>
              <input
                id="related-issues"
                type="text"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                placeholder="#123, #456"
              />
            </div>
            <div>
              <label htmlFor="context-urls" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                参考URL
              </label>
              <input
                id="context-urls"
                type="text"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                placeholder="https://..."
              />
            </div>
          </div>
        </AccordionSection>

        <AccordionSection title="ラベル・担当">
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="label-select" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                ラベル
              </label>
              <select
                id="label-select"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
              >
                <option value="">ラベルを選択</option>
              </select>
            </div>
            <div>
              <label htmlFor="assignee-select" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                アサイニー
              </label>
              <select
                id="assignee-select"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
              >
                <option value="">アサイニーを選択</option>
              </select>
            </div>
          </div>
        </AccordionSection>
      </form>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          className="rounded-md border border-[var(--border)] bg-[var(--secondary)] px-4 py-2 text-sm text-[var(--secondary-foreground)] transition-colors hover:bg-[var(--accent)]"
        >
          下書き保存
        </button>
        <button
          type="button"
          className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm text-[var(--primary-foreground)] transition-colors hover:opacity-90"
        >
          🤖 AIでIssueを生成
        </button>
      </div>
    </section>
  )
}

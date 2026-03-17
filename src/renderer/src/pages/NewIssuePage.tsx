import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  useTemplates,
  useRepositories,
  useLabels,
  useCreateDraft,
  useAiGenerate,
} from '../hooks/queries'

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
  const navigate = useNavigate()

  // Queries
  const { data: templates, isLoading: templatesLoading } = useTemplates()
  const { data: repositories, isLoading: reposLoading } = useRepositories()

  // Form state
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetPage, setTargetPage] = useState('')
  const [figmaUrl, setFigmaUrl] = useState('')
  const [figmaFrame, setFigmaFrame] = useState('')
  const [designNotes, setDesignNotes] = useState('')
  const [relatedIssues, setRelatedIssues] = useState('')
  const [contextUrls, setContextUrls] = useState('')
  const [repositoryId, setRepositoryId] = useState(0)
  const [selectedLabelIds, setSelectedLabelIds] = useState<number[]>([])

  // Labels query (depends on repositoryId)
  const { data: labels, isLoading: labelsLoading } = useLabels(repositoryId)

  // Mutations
  const createDraft = useCreateDraft()
  const aiGenerate = useAiGenerate()

  const isMutating = createDraft.isPending || aiGenerate.isPending

  function parseCommaSeparated(value: string): string[] {
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }

  function handleLabelToggle(labelId: number): void {
    setSelectedLabelIds((prev) =>
      prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId]
    )
  }

  function handleSaveDraft(): void {
    if (!repositoryId || !title) return
    createDraft.mutate(
      {
        repositoryId,
        templateId: templates?.find((t) => t.slug === selectedTemplate)?.id,
        title,
        body: description,
        status: 'draft',
        inputDescription: description || undefined,
        inputTargetPage: targetPage || undefined,
        inputFigmaUrl: figmaUrl || undefined,
        inputFigmaFrame: figmaFrame || undefined,
        inputDesignNotes: designNotes || undefined,
        inputRelatedIssues: parseCommaSeparated(relatedIssues),
        inputContextUrls: parseCommaSeparated(contextUrls),
        labelIds: selectedLabelIds.length > 0 ? selectedLabelIds : undefined,
      },
      {
        onSuccess: () => {
          navigate({ to: '/' })
        },
      }
    )
  }

  function handleAiGenerate(): void {
    if (!selectedTemplate || !description) return
    aiGenerate.mutate(
      {
        templateSlug: selectedTemplate,
        description,
        targetPage: targetPage || undefined,
        figmaUrl: figmaUrl || undefined,
        figmaFrame: figmaFrame || undefined,
        designNotes: designNotes || undefined,
        relatedIssues: parseCommaSeparated(relatedIssues),
        contextUrls: parseCommaSeparated(contextUrls),
      },
      {
        onSuccess: (result) => {
          // Create a draft with AI-generated content
          createDraft.mutate(
            {
              repositoryId: repositoryId || (repositories?.[0]?.id ?? 0),
              templateId: templates?.find((t) => t.slug === selectedTemplate)?.id,
              title: result.title,
              body: result.body,
              status: 'ai_generated',
              inputDescription: description || undefined,
              inputTargetPage: targetPage || undefined,
              inputFigmaUrl: figmaUrl || undefined,
              inputFigmaFrame: figmaFrame || undefined,
              inputDesignNotes: designNotes || undefined,
              inputRelatedIssues: parseCommaSeparated(relatedIssues),
              inputContextUrls: parseCommaSeparated(contextUrls),
              labelIds: selectedLabelIds.length > 0 ? selectedLabelIds : undefined,
            },
            {
              onSuccess: (draft) => {
                navigate({ to: '/drafts/$draftId', params: { draftId: String(draft.id) } })
              },
            }
          )
        },
      }
    )
  }

  return (
    <section aria-label="新規Issue作成">
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-[var(--foreground)]">新規Issue作成</h2>
      </header>

      <div className="mb-6">
        <p className="mb-2 text-sm font-medium text-[var(--foreground)]">テンプレート選択</p>
        <div className="flex gap-2" role="group" aria-label="テンプレート選択">
          {templatesLoading ? (
            <span className="text-sm text-[var(--muted-foreground)]">読み込み中...</span>
          ) : (
            templates?.map((tpl) => (
              <button
                key={tpl.slug}
                type="button"
                aria-pressed={selectedTemplate === tpl.slug}
                onClick={() => setSelectedTemplate(tpl.slug)}
                className={`rounded-md border px-4 py-2 text-sm transition-colors ${
                  selectedTemplate === tpl.slug
                    ? 'border-[var(--ring)] bg-[var(--accent)] text-[var(--accent-foreground)]'
                    : 'border-[var(--border)] bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--accent)]'
                }`}
              >
                {tpl.name}
              </button>
            ))
          )}
        </div>
      </div>

      <form aria-label="Issue入力フォーム" className="rounded-lg border border-[var(--border)]" onSubmit={(e) => e.preventDefault()}>
        <AccordionSection title="基本情報" defaultOpen>
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="issue-title" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                タイトル
              </label>
              <input
                id="issue-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
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
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
                value={targetPage}
                onChange={(e) => setTargetPage(e.target.value)}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                placeholder="対象ページのURLまたはパス"
              />
            </div>
            <div>
              <label htmlFor="repository-select" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                リポジトリ
              </label>
              {reposLoading ? (
                <span className="text-sm text-[var(--muted-foreground)]">読み込み中...</span>
              ) : (
                <select
                  id="repository-select"
                  value={repositoryId}
                  onChange={(e) => {
                    setRepositoryId(Number(e.target.value))
                    setSelectedLabelIds([])
                  }}
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                >
                  <option value={0}>リポジトリを選択</option>
                  {repositories?.map((repo) => (
                    <option key={repo.id} value={repo.id}>
                      {repo.fullName}
                    </option>
                  ))}
                </select>
              )}
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
                value={figmaUrl}
                onChange={(e) => setFigmaUrl(e.target.value)}
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
                value={figmaFrame}
                onChange={(e) => setFigmaFrame(e.target.value)}
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
                value={designNotes}
                onChange={(e) => setDesignNotes(e.target.value)}
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
                value={relatedIssues}
                onChange={(e) => setRelatedIssues(e.target.value)}
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
                value={contextUrls}
                onChange={(e) => setContextUrls(e.target.value)}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                placeholder="https://..."
              />
            </div>
          </div>
        </AccordionSection>

        <AccordionSection title="ラベル・担当">
          <div className="flex flex-col gap-4">
            <div>
              <p className="mb-1 text-sm font-medium text-[var(--foreground)]">ラベル</p>
              {repositoryId === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">リポジトリを選択するとラベルが表示されます</p>
              ) : labelsLoading ? (
                <span className="text-sm text-[var(--muted-foreground)]">読み込み中...</span>
              ) : labels && labels.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {labels.map((label) => (
                    <label key={label.id} className="flex items-center gap-1.5 text-sm text-[var(--foreground)]">
                      <input
                        type="checkbox"
                        checked={selectedLabelIds.includes(label.id)}
                        onChange={() => handleLabelToggle(label.id)}
                        className="rounded border-[var(--border)]"
                      />
                      {label.color && (
                        <span
                          className="inline-block h-3 w-3 rounded-full"
                          style={{ backgroundColor: `#${label.color}` }}
                        />
                      )}
                      {label.name}
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--muted-foreground)]">ラベルがありません</p>
              )}
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
          disabled={isMutating || !repositoryId || !title}
          onClick={handleSaveDraft}
          className="rounded-md border border-[var(--border)] bg-[var(--secondary)] px-4 py-2 text-sm text-[var(--secondary-foreground)] transition-colors hover:bg-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {createDraft.isPending ? '保存中...' : '下書き保存'}
        </button>
        <button
          type="button"
          disabled={isMutating || !selectedTemplate || !description}
          onClick={handleAiGenerate}
          className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm text-[var(--primary-foreground)] transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {aiGenerate.isPending ? '生成中...' : 'AIでIssueを生成'}
        </button>
      </div>
    </section>
  )
}

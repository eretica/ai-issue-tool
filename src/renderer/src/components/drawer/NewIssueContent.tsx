import { useState } from 'react'
import type { GenerationMode } from '@shared/types'
import {
  useTemplates,
  useLabels,
  useCreateDraft,
  useAiGenerateForDraft,
  useAiGeneratePipeline,
  useRepositoryById,
} from '../../hooks/queries'
import { useToast } from '../ui/Toast'

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
        <span aria-hidden="true" className="text-xs">
          {isOpen ? '\u25B2' : '\u25BC'}
        </span>
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

interface NewIssueContentProps {
  repoId: number
  onClose: () => void
}

export function NewIssueContent({ repoId, onClose }: NewIssueContentProps): React.JSX.Element {
  // Queries
  const { data: templates, isLoading: templatesLoading } = useTemplates()

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
  const [selectedLabelIds, setSelectedLabelIds] = useState<number[]>([])
  const [generationMode, setGenerationMode] = useState<GenerationMode>('ai_doc')
  const [usePipeline, setUsePipeline] = useState(false)
  const { toast } = useToast()

  // Labels query (scoped to repo)
  const { data: labels, isLoading: labelsLoading } = useLabels(repoId)
  const { data: repo } = useRepositoryById(repoId)

  // Mutations
  const createDraft = useCreateDraft()
  const aiGenerateForDraft = useAiGenerateForDraft()
  const aiGeneratePipeline = useAiGeneratePipeline()

  const isMutating = createDraft.isPending

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
    if (!title) return
    createDraft.mutate(
      {
        repositoryId: repoId,
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
          toast('下書きを保存しました')
          onClose()
        },
      }
    )
  }

  function handleAiGenerate(): void {
    if (!selectedTemplate || !description) return

    const aiInput = {
      templateSlug: selectedTemplate,
      description,
      generationMode,
      targetPage: targetPage || undefined,
      figmaUrl: figmaUrl || undefined,
      figmaFrame: figmaFrame || undefined,
      designNotes: designNotes || undefined,
      relatedIssues: parseCommaSeparated(relatedIssues),
      contextUrls: parseCommaSeparated(contextUrls),
    }

    const initialStatus = usePipeline ? ('investigating' as const) : ('generating' as const)

    createDraft.mutate(
      {
        repositoryId: repoId,
        templateId: templates?.find((t) => t.slug === selectedTemplate)?.id,
        title: usePipeline ? 'AI調査中...' : 'AI生成中...',
        body: '',
        status: initialStatus,
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
          if (usePipeline) {
            aiGeneratePipeline.mutate({
              draftId: draft.id,
              input: {
                ...aiInput,
                repositoryId: repoId,
              },
            })
            toast('AI調査パイプラインを開始しました')
          } else {
            aiGenerateForDraft.mutate({ draftId: draft.id, input: aiInput })
            toast('AI生成を開始しました')
          }
          onClose()
        },
      }
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-2 text-sm font-medium text-[var(--foreground)]">テンプレート選択</p>
        <div className="flex gap-3" role="group" aria-label="テンプレート選択">
          {templatesLoading ? (
            <span className="text-sm text-[var(--muted-foreground)]">読み込み中...</span>
          ) : (
            templates?.map((tpl) => (
              <button
                key={tpl.slug}
                type="button"
                aria-pressed={selectedTemplate === tpl.slug}
                onClick={() => setSelectedTemplate(tpl.slug)}
                className={`flex flex-1 flex-col items-start rounded-lg border-2 px-4 py-3 text-left transition-all ${
                  selectedTemplate === tpl.slug
                    ? 'border-[var(--ring)] bg-[var(--accent)] shadow-sm'
                    : 'border-[var(--border)] hover:border-[var(--ring)] hover:bg-[var(--muted)]'
                }`}
              >
                <span className="text-sm font-medium text-[var(--foreground)]">{tpl.name}</span>
                {tpl.description && (
                  <span className="mt-0.5 text-xs text-[var(--muted-foreground)]">{tpl.description}</span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-[var(--foreground)]">生成モード</p>
        <div className="flex gap-3" role="radiogroup" aria-label="生成モード">
          <label
            className={`flex flex-1 cursor-pointer items-start gap-3 rounded-lg border-2 p-3 transition-colors ${
              generationMode === 'ai_doc'
                ? 'border-[var(--ring)] bg-[var(--accent)]'
                : 'border-[var(--border)] hover:border-[var(--ring)] hover:bg-[var(--muted)]'
            }`}
          >
            <input
              type="radio"
              name="generationMode"
              value="ai_doc"
              checked={generationMode === 'ai_doc'}
              onChange={() => setGenerationMode('ai_doc')}
              className="mt-0.5"
            />
            <div>
              <span className="block text-sm font-medium text-[var(--foreground)]">AI向けドキュメント</span>
              <span className="block text-xs text-[var(--muted-foreground)]">
                実装計画・ステップ・受け入れ条件を含む詳細な仕様書
              </span>
            </div>
          </label>
          <label
            className={`flex flex-1 cursor-pointer items-start gap-3 rounded-lg border-2 p-3 transition-colors ${
              generationMode === 'human_doc'
                ? 'border-[var(--ring)] bg-[var(--accent)]'
                : 'border-[var(--border)] hover:border-[var(--ring)] hover:bg-[var(--muted)]'
            }`}
          >
            <input
              type="radio"
              name="generationMode"
              value="human_doc"
              checked={generationMode === 'human_doc'}
              onChange={() => setGenerationMode('human_doc')}
              className="mt-0.5"
            />
            <div>
              <span className="block text-sm font-medium text-[var(--foreground)]">人間向けドキュメント</span>
              <span className="block text-xs text-[var(--muted-foreground)]">
                目的・背景・達成条件を簡潔にまとめた仕様書
              </span>
            </div>
          </label>
        </div>
      </div>

      <form
        aria-label="Issue入力フォーム"
        className="rounded-lg border border-[var(--border)]"
        onSubmit={(e) => e.preventDefault()}
      >
        <AccordionSection title="基本情報" defaultOpen>
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="new-issue-title" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                タイトル
              </label>
              <input
                id="new-issue-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                placeholder="Issueのタイトルを入力"
              />
            </div>
            <div>
              <label
                htmlFor="new-issue-description"
                className="mb-1 block text-sm font-medium text-[var(--foreground)]"
              >
                説明
              </label>
              <textarea
                id="new-issue-description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                placeholder="Issueの詳細を入力"
              />
            </div>
            <div>
              <label htmlFor="new-target-page" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                対象ページ
              </label>
              <input
                id="new-target-page"
                type="text"
                value={targetPage}
                onChange={(e) => setTargetPage(e.target.value)}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                placeholder="対象ページのURLまたはパス"
              />
            </div>
          </div>
        </AccordionSection>

        <AccordionSection title="デザイン情報">
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="new-figma-url" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                Figma URL
              </label>
              <input
                id="new-figma-url"
                type="url"
                value={figmaUrl}
                onChange={(e) => setFigmaUrl(e.target.value)}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                placeholder="https://www.figma.com/..."
              />
            </div>
            <div>
              <label htmlFor="new-figma-frame" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                フレーム名
              </label>
              <input
                id="new-figma-frame"
                type="text"
                value={figmaFrame}
                onChange={(e) => setFigmaFrame(e.target.value)}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                placeholder="フレーム名を入力"
              />
            </div>
            <div>
              <label htmlFor="new-design-notes" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                デザインノート
              </label>
              <textarea
                id="new-design-notes"
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
              <label
                htmlFor="new-related-issues"
                className="mb-1 block text-sm font-medium text-[var(--foreground)]"
              >
                関連Issue
              </label>
              <input
                id="new-related-issues"
                type="text"
                value={relatedIssues}
                onChange={(e) => setRelatedIssues(e.target.value)}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                placeholder="#123, #456"
              />
            </div>
            <div>
              <label htmlFor="new-context-urls" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                参考URL
              </label>
              <input
                id="new-context-urls"
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
              {labelsLoading ? (
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
              <label
                htmlFor="new-assignee-select"
                className="mb-1 block text-sm font-medium text-[var(--foreground)]"
              >
                アサイニー
              </label>
              <select
                id="new-assignee-select"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
              >
                <option value="">アサイニーを選択</option>
              </select>
            </div>
          </div>
        </AccordionSection>
      </form>

      {/* Pipeline toggle */}
      <div>
        <div className="flex gap-3" role="radiogroup" aria-label="生成方法">
          <label
            className={`flex flex-1 cursor-pointer items-start gap-3 rounded-lg border-2 p-3 transition-colors ${
              !usePipeline
                ? 'border-[var(--ring)] bg-[var(--accent)]'
                : 'border-[var(--border)] hover:border-[var(--ring)] hover:bg-[var(--muted)]'
            }`}
          >
            <input
              type="radio"
              name="pipelineMode"
              checked={!usePipeline}
              onChange={() => setUsePipeline(false)}
              className="mt-0.5"
            />
            <div>
              <span className="block text-sm font-medium text-[var(--foreground)]">シンプル生成</span>
              <span className="block text-xs text-[var(--muted-foreground)]">従来の単一AI呼び出し</span>
            </div>
          </label>
          <label
            className={`flex flex-1 cursor-pointer items-start gap-3 rounded-lg border-2 p-3 transition-colors ${
              usePipeline
                ? 'border-[var(--ring)] bg-[var(--accent)]'
                : 'border-[var(--border)] hover:border-[var(--ring)] hover:bg-[var(--muted)]'
            }`}
          >
            <input
              type="radio"
              name="pipelineMode"
              checked={usePipeline}
              onChange={() => setUsePipeline(true)}
              className="mt-0.5"
            />
            <div>
              <span className="block text-sm font-medium text-[var(--foreground)]">調査付き生成</span>
              <span className="block text-xs text-[var(--muted-foreground)]">
                リポを調査してから生成{repo?.localPath ? '（推奨）' : ''}
              </span>
            </div>
          </label>
        </div>
      </div>

      <div className="flex items-center justify-between">
        {/* Validation hints */}
        <div className="text-xs text-[var(--muted-foreground)]">
          {!selectedTemplate && !title && !description && (
            <span>テンプレートを選び、情報を入力してください</span>
          )}
          {!selectedTemplate && (title || description) && (
            <span>AI生成にはテンプレートの選択が必要です</span>
          )}
          {selectedTemplate && !description && <span>AI生成には説明の入力が必要です</span>}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={isMutating || !title}
            onClick={handleSaveDraft}
            className="rounded-md border border-[var(--border)] bg-[var(--secondary)] px-4 py-2 text-sm text-[var(--secondary-foreground)] transition-colors hover:bg-[var(--accent)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createDraft.isPending ? '保存中...' : '下書き保存'}
          </button>
          <button
            type="button"
            disabled={isMutating || !selectedTemplate || !description}
            onClick={handleAiGenerate}
            className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm text-[var(--primary-foreground)] transition-colors hover:brightness-110 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createDraft.isPending ? '作成中...' : usePipeline ? '調査付きで生成' : 'AIでIssueを生成'}
          </button>
        </div>
      </div>
    </div>
  )
}

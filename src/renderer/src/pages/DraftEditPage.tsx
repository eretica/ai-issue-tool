import { useState, useEffect } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import {
  useDraftById,
  useUpdateDraft,
  useDeleteDraft,
  useAiGenerate,
  usePublishDraft,
  useTemplates,
} from '../hooks/queries'

export function DraftEditPage(): React.JSX.Element {
  const { draftId } = useParams({ from: '/drafts/$draftId' })
  const navigate = useNavigate()
  const numericId = Number(draftId)

  const { data: draft, isLoading } = useDraftById(numericId)
  const { data: templates } = useTemplates()
  const updateDraft = useUpdateDraft()
  const deleteDraft = useDeleteDraft()
  const aiGenerate = useAiGenerate()
  const publishDraft = usePublishDraft()

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Initialize local state when draft loads
  useEffect(() => {
    if (draft) {
      setTitle(draft.title)
      setBody(draft.body)
    }
  }, [draft])

  // Clear save success message after 2 seconds
  useEffect(() => {
    if (!saveSuccess) return undefined
    const timer = setTimeout(() => setSaveSuccess(false), 2000)
    return () => clearTimeout(timer)
  }, [saveSuccess])

  const isMutating =
    updateDraft.isPending || deleteDraft.isPending || aiGenerate.isPending || publishDraft.isPending

  const handleSave = () => {
    updateDraft.mutate(
      { id: numericId, data: { title, body } },
      {
        onSuccess: () => setSaveSuccess(true),
      }
    )
  }

  const handleAiRewrite = () => {
    // Resolve template slug from templateId
    const template = templates?.find((t) => t.id === draft?.templateId)
    const templateSlug = template?.slug ?? 'bug'

    aiGenerate.mutate(
      {
        templateSlug,
        description: body,
      },
      {
        onSuccess: (result) => {
          setBody(result.body)
          if (result.title) {
            setTitle(result.title)
          }
        },
      }
    )
  }

  const handlePublish = () => {
    publishDraft.mutate(numericId, {
      onSuccess: () => {
        navigate({ to: '/published' })
      },
    })
  }

  const handleDelete = () => {
    deleteDraft.mutate(numericId, {
      onSuccess: () => {
        navigate({ to: '/' })
      },
    })
  }

  if (isLoading) {
    return (
      <section aria-label="ドラフト編集">
        <div className="flex items-center justify-center py-12 text-[var(--muted-foreground)]">
          読み込み中...
        </div>
      </section>
    )
  }

  if (!draft) {
    return (
      <section aria-label="ドラフト編集">
        <div className="flex items-center justify-center py-12 text-[var(--muted-foreground)]">
          ドラフトが見つかりません
        </div>
      </section>
    )
  }

  return (
    <section aria-label="ドラフト編集">
      <header className="mb-4 flex items-center justify-between">
        <input
          type="text"
          aria-label="ドラフトタイトル"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-2xl font-bold text-[var(--foreground)] bg-transparent border-none outline-none focus:ring-2 focus:ring-[var(--ring)] rounded px-1"
        />
        {saveSuccess && (
          <span className="text-sm text-green-600">保存しました</span>
        )}
      </header>

      <div className="flex gap-4" style={{ height: 'calc(100vh - 200px)' }}>
        {/* Markdown Editor Pane */}
        <div className="flex flex-1 flex-col rounded-lg border border-[var(--border)]">
          <div className="border-b border-[var(--border)] px-4 py-2">
            <span className="text-sm font-medium text-[var(--muted-foreground)]">エディタ</span>
          </div>
          <textarea
            aria-label="Markdownエディタ"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="flex-1 resize-none bg-[var(--background)] p-4 font-mono text-sm text-[var(--foreground)] outline-none"
            placeholder="Markdown形式でIssueの内容を記述..."
          />
        </div>

        {/* Preview Pane */}
        <div className="flex flex-1 flex-col rounded-lg border border-[var(--border)]">
          <div className="border-b border-[var(--border)] px-4 py-2">
            <span className="text-sm font-medium text-[var(--muted-foreground)]">プレビュー</span>
          </div>
          <div
            aria-label="Markdownプレビュー"
            className="flex-1 overflow-auto p-4 text-sm text-[var(--muted-foreground)] whitespace-pre-wrap"
          >
            {body || 'プレビューがここに表示されます'}
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-between">
        <button
          type="button"
          disabled={isMutating}
          onClick={handleDelete}
          className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {deleteDraft.isPending ? '削除中...' : '削除'}
        </button>

        <div className="flex gap-3">
          <button
            type="button"
            disabled={isMutating}
            onClick={handleSave}
            className="rounded-md border border-[var(--border)] bg-[var(--secondary)] px-4 py-2 text-sm text-[var(--secondary-foreground)] transition-colors hover:bg-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateDraft.isPending ? '保存中...' : '保存'}
          </button>
          <button
            type="button"
            disabled={isMutating}
            onClick={handleAiRewrite}
            className="rounded-md border border-[var(--border)] bg-[var(--secondary)] px-4 py-2 text-sm text-[var(--secondary-foreground)] transition-colors hover:bg-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {aiGenerate.isPending ? 'AI生成中...' : 'AIリライト'}
          </button>
          <button
            type="button"
            disabled={isMutating}
            onClick={handlePublish}
            className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm text-[var(--primary-foreground)] transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {publishDraft.isPending ? '公開中...' : '公開'}
          </button>
        </div>
      </div>
    </section>
  )
}

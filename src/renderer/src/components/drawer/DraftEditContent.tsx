import { useState, useEffect, useCallback, useRef } from 'react'
import {
  useDraftById,
  useUpdateDraft,
  useDeleteDraft,
  useAiGenerate,
  usePublishDraft,
  useTemplates,
} from '../../hooks/queries'
import { MarkdownPreview } from '../ui/MarkdownPreview'
import { PipelineProgress } from '../ui/PipelineProgress'
import { ScoreBadge } from '../ui/ScoreBadge'
import { useToast } from '../ui/Toast'
import { ConfirmDialog } from '../ui/ConfirmDialog'

interface DraftEditContentProps {
  draftId: number
  onClose: () => void
}

export function DraftEditContent({ draftId, onClose }: DraftEditContentProps): React.JSX.Element {
  const { toast } = useToast()
  const { data: draft, isLoading, refetch } = useDraftById(draftId)

  // Poll while draft is generating or investigating (pipeline)
  const isGenerating = draft?.status === 'generating'
  const isInvestigating = draft?.status === 'investigating'
  const isPipelineActive = isGenerating || isInvestigating
  useEffect(() => {
    if (!isPipelineActive) return
    const id = setInterval(() => refetch(), 3000)
    return () => clearInterval(id)
  }, [isPipelineActive, refetch])

  const { data: templates } = useTemplates()
  const updateDraft = useUpdateDraft()
  const deleteDraft = useDeleteDraft()
  const aiGenerate = useAiGenerate()
  const publishDraft = usePublishDraft()

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [confirmAction, setConfirmAction] = useState<'delete' | 'publish' | 'complete_unpublished' | null>(null)

  // Track saved state for dirty detection
  const savedTitle = useRef('')
  const savedBody = useRef('')
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Initialize local state when draft loads
  useEffect(() => {
    if (draft) {
      setTitle(draft.title)
      setBody(draft.body)
      savedTitle.current = draft.title
      savedBody.current = draft.body
    }
  }, [draft])

  const isDirty = title !== savedTitle.current || body !== savedBody.current

  const isMutating =
    updateDraft.isPending || deleteDraft.isPending || aiGenerate.isPending || publishDraft.isPending

  const handleSave = useCallback(
    (showToast = true) => {
      updateDraft.mutate(
        { id: draftId, data: { title, body } },
        {
          onSuccess: () => {
            savedTitle.current = title
            savedBody.current = body
            if (showToast) toast('保存しました')
          },
        }
      )
    },
    [draftId, title, body, updateDraft, toast]
  )

  // Auto-save: debounced 2s after edits
  useEffect(() => {
    if (!draft) return
    if (!isDirty) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      handleSave(false)
    }, 2000)
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    }
  }, [title, body, isDirty, draft, handleSave])

  // Keyboard shortcut: Cmd+S / Ctrl+S to save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (!isMutating) handleSave(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSave, isMutating])

  const handleAiRewrite = () => {
    const template = templates?.find((t) => t.id === draft?.templateId)
    const templateSlug = template?.slug ?? 'bug'

    aiGenerate.mutate(
      {
        templateSlug,
        description: body,
        generationMode: 'human_doc',
      },
      {
        onSuccess: (result) => {
          setBody(result.body)
          if (result.title) {
            setTitle(result.title)
          }
          toast('AIリライトが完了しました')
        },
      }
    )
  }

  const handlePublish = () => {
    setConfirmAction(null)
    publishDraft.mutate(draftId, {
      onSuccess: () => {
        savedTitle.current = title
        savedBody.current = body
        toast('Issueを公開しました')
        onClose()
      },
    })
  }

  const handleCompleteUnpublished = () => {
    setConfirmAction(null)
    updateDraft.mutate(
      { id: draftId, data: { status: 'completed_unpublished' } },
      {
        onSuccess: () => {
          savedTitle.current = title
          savedBody.current = body
          toast('完了（未公開）にしました')
          onClose()
        },
      }
    )
  }

  const handleDelete = () => {
    setConfirmAction(null)
    deleteDraft.mutate(draftId, {
      onSuccess: () => {
        savedTitle.current = title
        savedBody.current = body
        toast('ドラフトを削除しました')
        onClose()
      },
    })
  }

  const handleCopyToClipboard = async () => {
    try {
      const markdown = `# ${title}\n\n${body}`
      await navigator.clipboard.writeText(markdown)
      toast('クリップボードにコピーしました')
    } catch {
      toast('コピーに失敗しました', 'error')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-[var(--muted-foreground)]">
        読み込み中...
      </div>
    )
  }

  if (!draft) {
    return (
      <div className="flex items-center justify-center py-12 text-[var(--muted-foreground)]">
        ドラフトが見つかりません
      </div>
    )
  }

  const charCount = body.length
  const lineCount = body.split('\n').length

  return (
    <div className="flex h-full flex-col">
      {/* Header with title input */}
      <header className="mb-4 flex items-center gap-3">
        <input
          type="text"
          aria-label="ドラフトタイトル"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 rounded bg-transparent px-1 text-xl font-bold text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--ring)]"
        />
        <ScoreBadge score={draft.qcScore} size="md" />
        <button
          type="button"
          onClick={handleCopyToClipboard}
          className="shrink-0 rounded-md border border-[var(--border)] bg-[var(--secondary)] px-3 py-1.5 text-xs text-[var(--secondary-foreground)] transition-colors hover:bg-[var(--accent)] active:scale-[0.97]"
          title="Markdownをコピー"
        >
          コピー
        </button>
      </header>

      {/* Editor and Preview */}
      <div className="relative flex min-h-0 flex-1 gap-4">
        {isInvestigating && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-[var(--background)]/80 backdrop-blur-sm">
            <div className="flex w-full max-w-md flex-col items-center gap-4 p-6">
              <span className="text-sm font-medium text-[var(--foreground)]">AI調査パイプライン実行中</span>
              <PipelineProgress draftId={draftId} draftTitle={draft.title} />
              <span className="text-xs text-[var(--muted-foreground)]">完了すると自動的に表示されます</span>
            </div>
          </div>
        )}
        {isGenerating && !isInvestigating && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-[var(--background)]/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <span className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-amber-500 border-t-transparent" />
              <span className="text-sm font-medium text-[var(--foreground)]">AIが生成中です...</span>
              <span className="text-xs text-[var(--muted-foreground)]">完了すると自動的に表示されます</span>
            </div>
          </div>
        )}
        {aiGenerate.isPending && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-[var(--background)]/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <span className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-[var(--primary)] border-t-transparent" />
              <span className="text-sm font-medium text-[var(--foreground)]">AIがリライト中...</span>
            </div>
          </div>
        )}
        {/* Markdown Editor Pane */}
        <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-[var(--border)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2">
            <span className="text-sm font-medium text-[var(--muted-foreground)]">エディタ</span>
            <span className="text-xs text-[var(--muted-foreground)]">
              {charCount}文字 / {lineCount}行
            </span>
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
        <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-[var(--border)]">
          <div className="border-b border-[var(--border)] px-4 py-2">
            <span className="text-sm font-medium text-[var(--muted-foreground)]">プレビュー</span>
          </div>
          <div aria-label="Markdownプレビュー" className="flex-1 overflow-auto p-4">
            <MarkdownPreview content={body} />
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={isMutating}
            onClick={() => setConfirmAction('delete')}
            className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700 transition-colors hover:bg-red-100 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleteDraft.isPending ? '削除中...' : '削除'}
          </button>
          {isDirty && (
            <span className="text-xs text-amber-600" aria-label="未保存の変更あり">
              未保存の変更あり
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--muted-foreground)]">Cmd+S で保存</span>
          <button
            type="button"
            disabled={isMutating}
            onClick={() => handleSave()}
            className="rounded-md border border-[var(--border)] bg-[var(--secondary)] px-4 py-2 text-sm text-[var(--secondary-foreground)] transition-colors hover:bg-[var(--accent)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {updateDraft.isPending ? '保存中...' : '保存'}
          </button>
          <button
            type="button"
            disabled={isMutating}
            onClick={handleAiRewrite}
            className="rounded-md border border-[var(--border)] bg-[var(--secondary)] px-4 py-2 text-sm text-[var(--secondary-foreground)] transition-colors hover:bg-[var(--accent)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {aiGenerate.isPending ? 'AI生成中...' : 'AIリライト'}
          </button>
          {(draft.status === 'ai_generated' || draft.status === 'reviewed') && (
            <button
              type="button"
              disabled={isMutating}
              onClick={() => setConfirmAction('complete_unpublished')}
              className="rounded-md border border-teal-300 bg-teal-50 px-4 py-2 text-sm text-teal-700 transition-colors hover:bg-teal-100 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
            >
              完了（未公開）
            </button>
          )}
          {draft.status !== 'completed_unpublished' && (
            <button
              type="button"
              disabled={isMutating}
              onClick={() => setConfirmAction('publish')}
              className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm text-[var(--primary-foreground)] transition-colors hover:brightness-110 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {publishDraft.isPending ? '公開中...' : '公開'}
            </button>
          )}
        </div>
      </div>

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={confirmAction === 'delete'}
        title="ドラフトを削除しますか？"
        description="この操作は取り消せません。ドラフトの内容はすべて失われます。"
        confirmLabel="削除する"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmAction(null)}
      />
      <ConfirmDialog
        open={confirmAction === 'complete_unpublished'}
        title="完了（未公開）にしますか？"
        description="GitHubには公開せず、完了としてクローズします。後から公開に変更することもできます。"
        confirmLabel="完了にする"
        onConfirm={handleCompleteUnpublished}
        onCancel={() => setConfirmAction(null)}
      />
      <ConfirmDialog
        open={confirmAction === 'publish'}
        title="Issueを公開しますか？"
        description="GitHubにIssueとして公開されます。公開後もGitHub上で編集可能です。"
        confirmLabel="公開する"
        onConfirm={handlePublish}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  )
}

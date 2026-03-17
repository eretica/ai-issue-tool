import { useParams } from '@tanstack/react-router'

export function DraftEditPage(): React.JSX.Element {
  const { draftId } = useParams({ from: '/drafts/$draftId' })

  return (
    <section aria-label="ドラフト編集">
      <header className="mb-4 flex items-center justify-between">
        <input
          type="text"
          aria-label="ドラフトタイトル"
          defaultValue={`Draft #${draftId}`}
          className="text-2xl font-bold text-[var(--foreground)] bg-transparent border-none outline-none focus:ring-2 focus:ring-[var(--ring)] rounded px-1"
        />
      </header>

      <div className="flex gap-4" style={{ height: 'calc(100vh - 200px)' }}>
        {/* Markdown Editor Pane */}
        <div className="flex flex-1 flex-col rounded-lg border border-[var(--border)]">
          <div className="border-b border-[var(--border)] px-4 py-2">
            <span className="text-sm font-medium text-[var(--muted-foreground)]">エディタ</span>
          </div>
          <textarea
            aria-label="Markdownエディタ"
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
            className="flex-1 overflow-auto p-4 text-sm text-[var(--muted-foreground)]"
          >
            プレビューがここに表示されます
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-3">
        <button
          type="button"
          className="rounded-md border border-[var(--border)] bg-[var(--secondary)] px-4 py-2 text-sm text-[var(--secondary-foreground)] transition-colors hover:bg-[var(--accent)]"
        >
          保存
        </button>
        <button
          type="button"
          className="rounded-md border border-[var(--border)] bg-[var(--secondary)] px-4 py-2 text-sm text-[var(--secondary-foreground)] transition-colors hover:bg-[var(--accent)]"
        >
          AIリライト
        </button>
        <button
          type="button"
          className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm text-[var(--primary-foreground)] transition-colors hover:opacity-90"
        >
          公開
        </button>
      </div>
    </section>
  )
}

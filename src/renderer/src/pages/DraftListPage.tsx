import { Link } from '@tanstack/react-router'
import type { DraftStatus } from '@shared/types'

const filterTabs: { label: string; value: DraftStatus | 'all' }[] = [
  { label: 'すべて', value: 'all' },
  { label: '下書き', value: 'draft' },
  { label: 'AI生成済み', value: 'ai_generated' },
  { label: 'レビュー済み', value: 'reviewed' },
  { label: '公開済み', value: 'published' },
  { label: 'アーカイブ', value: 'archived' },
]

export function DraftListPage(): React.JSX.Element {
  return (
    <section aria-label="ドラフト一覧">
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-[var(--foreground)]">ドラフト一覧</h2>
      </header>

      <div className="mb-6 flex gap-2" role="tablist" aria-label="ステータスフィルター">
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={tab.value === 'all'}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              tab.value === 'all'
                ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                : 'bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--accent)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border)] py-16">
        <p className="mb-4 text-[var(--muted-foreground)]">
          ドラフトがありません。新しいIssueを作成しましょう。
        </p>
        <Link
          to="/new"
          className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm text-[var(--primary-foreground)] transition-colors hover:opacity-90"
        >
          新規Issue作成
        </Link>
      </div>
    </section>
  )
}

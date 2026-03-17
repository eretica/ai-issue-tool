import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import type { DraftStatus } from '@shared/types'
import { useDrafts, useRepositories } from '../hooks/queries'

const filterTabs: { label: string; value: DraftStatus | 'all' }[] = [
  { label: 'すべて', value: 'all' },
  { label: '下書き', value: 'draft' },
  { label: 'AI生成済み', value: 'ai_generated' },
  { label: 'レビュー済み', value: 'reviewed' },
  { label: '公開済み', value: 'published' },
  { label: 'アーカイブ', value: 'archived' },
]

const statusBadgeStyles: Record<DraftStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  ai_generated: 'bg-blue-100 text-blue-700',
  reviewed: 'bg-green-100 text-green-700',
  published: 'bg-purple-100 text-purple-700',
  archived: 'bg-[var(--muted)] text-[var(--muted-foreground)]',
}

const statusLabels: Record<DraftStatus, string> = {
  draft: '下書き',
  ai_generated: 'AI生成済み',
  reviewed: 'レビュー済み',
  published: '公開済み',
  archived: 'アーカイブ',
}

function formatDate(dateStr: string): string {
  return dateStr.slice(0, 10)
}

export function DraftListPage(): React.JSX.Element {
  const [activeFilter, setActiveFilter] = useState<DraftStatus | 'all'>('all')

  const statusParam = activeFilter === 'all' ? undefined : activeFilter
  const { data: drafts, isLoading } = useDrafts(statusParam)
  const { data: repositories } = useRepositories()

  function getRepoName(repoId: number): string {
    const repo = repositories?.find((r) => r.id === repoId)
    return repo?.fullName ?? ''
  }

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
            aria-selected={activeFilter === tab.value}
            onClick={() => setActiveFilter(tab.value)}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              activeFilter === tab.value
                ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                : 'bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--accent)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <span className="text-sm text-[var(--muted-foreground)]">読み込み中...</span>
        </div>
      ) : drafts && drafts.length > 0 ? (
        <div className="flex flex-col gap-3">
          {drafts.map((draft) => (
            <Link
              key={draft.id}
              to="/drafts/$draftId"
              params={{ draftId: String(draft.id) }}
              className="block rounded-lg border border-[var(--border)] p-4 transition-colors hover:bg-[var(--muted)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="truncate text-sm font-medium text-[var(--foreground)]">
                      {draft.title || '(タイトルなし)'}
                    </h3>
                    <span
                      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeStyles[draft.status]}`}
                    >
                      {statusLabels[draft.status]}
                    </span>
                  </div>
                  {draft.body && (
                    <p className="mb-2 line-clamp-2 text-sm text-[var(--muted-foreground)]">
                      {draft.body.length > 120 ? draft.body.slice(0, 120) + '...' : draft.body}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                    {getRepoName(draft.repositoryId) && (
                      <span>{getRepoName(draft.repositoryId)}</span>
                    )}
                    <span>{formatDate(draft.createdAt)}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
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
      )}
    </section>
  )
}

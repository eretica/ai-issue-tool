import { Link, useParams } from '@tanstack/react-router'
import type { Draft } from '@shared/types'
import { statusBadgeStyles, statusLabels } from './kanban-constants'
import { formatRelativeDate } from '../../lib/draft-utils'
import { ScoreBadge } from '../ui/ScoreBadge'

interface KanbanCardProps {
  draft: Draft
  onClick: () => void
}

export function KanbanCard({ draft, onClick }: KanbanCardProps): React.JSX.Element {
  const { repoId } = useParams({ from: '/repos/$repoId/' })
  const isActive = draft.status === 'generating' || draft.status === 'investigating'
  const hasPipeline = draft.aiModel?.startsWith('pipeline') ||
    draft.status === 'generating' || draft.status === 'investigating'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-lg border p-3 text-left transition-all hover:border-[var(--ring)] hover:shadow-sm ${
        isActive
          ? 'animate-pulse border-amber-300 bg-amber-50/30'
          : 'border-[var(--border)] bg-[var(--background)]'
      }`}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <h4 className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--foreground)]">
          {draft.title || '(タイトルなし)'}
        </h4>
      </div>

      <div className="mb-1.5 flex items-center gap-2">
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeStyles[draft.status]}`}
        >
          {isActive && (
            <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {statusLabels[draft.status]}
        </span>
        <ScoreBadge score={draft.qcScore} size="sm" />
      </div>

      {/* Pipeline progress bar for investigating status */}
      {draft.status === 'investigating' && draft.pipelineCurrentStep && draft.pipelineTotalSteps && (
        <div className="mb-1.5 flex items-center gap-2">
          <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-orange-500 transition-all duration-500"
              style={{ width: `${(draft.pipelineCurrentStep / draft.pipelineTotalSteps) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-orange-700">
            {draft.pipelineCurrentStep}/{draft.pipelineTotalSteps}
          </span>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
        <span>{formatRelativeDate(draft.updatedAt)}</span>
        {draft.aiModel && (
          <span className="rounded bg-[var(--muted)] px-1 py-0.5 text-[10px]">
            {draft.aiModel}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1.5">
          {hasPipeline && (
            <Link
              to={`/repos/${repoId}/pipeline/${draft.id}`}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium text-[var(--primary)] transition-colors hover:bg-[var(--accent)]"
              title="AI会話を見る"
            >
              AI会話
            </Link>
          )}
          {draft.githubIssueUrl && (
            <a
              href={draft.githubIssueUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--accent)]"
              title="GitHubで開く"
            >
              <svg className="h-3 w-3" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              #{draft.githubIssueNumber}
            </a>
          )}
        </span>
      </div>
    </button>
  )
}

import type { Draft } from '@shared/types'
import { KanbanCard } from './KanbanCard'

interface KanbanColumnProps {
  title: string
  drafts: Draft[]
  onCardClick: (draftId: number) => void
}

export function KanbanColumn({ title, drafts, onCardClick }: KanbanColumnProps): React.JSX.Element {
  return (
    <div className="flex min-w-0 flex-1 flex-col rounded-lg bg-[var(--muted)] p-3">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
        <span className="rounded-full bg-[var(--background)] px-2 py-0.5 text-xs font-medium text-[var(--muted-foreground)]">
          {drafts.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {drafts.length === 0 ? (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-[var(--border)] py-8 text-xs text-[var(--muted-foreground)]">
            なし
          </div>
        ) : (
          drafts.map((draft) => (
            <KanbanCard key={draft.id} draft={draft} onClick={() => onCardClick(draft.id)} />
          ))
        )}
      </div>
    </div>
  )
}

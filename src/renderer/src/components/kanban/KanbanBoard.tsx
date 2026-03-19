import type { Draft } from '@shared/types'
import { KANBAN_COLUMNS, getColumnForStatus } from './kanban-constants'
import { KanbanColumn } from './KanbanColumn'

interface KanbanBoardProps {
  drafts: Draft[]
  onCardClick: (draftId: number) => void
}

export function KanbanBoard({ drafts, onCardClick }: KanbanBoardProps): React.JSX.Element {
  // Group drafts by column
  const columnDrafts = KANBAN_COLUMNS.map((col) => ({
    ...col,
    drafts: drafts.filter((d) => getColumnForStatus(d.status) === col.id),
  }))

  return (
    <div className="flex h-full gap-4">
      {columnDrafts.map((col) => (
        <KanbanColumn
          key={col.id}
          title={col.title}
          drafts={col.drafts}
          onCardClick={onCardClick}
        />
      ))}
    </div>
  )
}

import type { DraftStatus } from '@shared/types'

export const KANBAN_COLUMNS = [
  { id: 'wip', title: '作業中', statuses: ['draft', 'generating', 'investigating'] as DraftStatus[] },
  { id: 'review', title: '確認待ち', statuses: ['ai_generated', 'reviewed'] as DraftStatus[] },
  { id: 'done', title: '公開済み', statuses: ['published', 'archived'] as DraftStatus[] },
] as const

export const statusBadgeStyles: Record<DraftStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  generating: 'bg-amber-100 text-amber-700',
  investigating: 'bg-orange-100 text-orange-700',
  ai_generated: 'bg-blue-100 text-blue-700',
  reviewed: 'bg-green-100 text-green-700',
  published: 'bg-purple-100 text-purple-700',
  archived: 'bg-[var(--muted)] text-[var(--muted-foreground)]',
}

export const statusLabels: Record<DraftStatus, string> = {
  draft: '下書き',
  generating: 'AI生成中...',
  investigating: 'AI調査中...',
  ai_generated: 'AI生成済み',
  reviewed: 'レビュー済み',
  published: '公開済み',
  archived: 'アーカイブ',
}

export function getColumnForStatus(status: DraftStatus): string {
  for (const col of KANBAN_COLUMNS) {
    if ((col.statuses as readonly string[]).includes(status)) return col.id
  }
  return 'wip'
}

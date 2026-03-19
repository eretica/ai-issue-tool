import { useState, useEffect } from 'react'
import { useParams } from '@tanstack/react-router'
import {
  useDrafts,
  useRepositoryById,
  useKnowledgeStatus,
  useKnowledgeScan,
  useScanProgress,
} from '../hooks/queries'
import { KanbanBoard } from '../components/kanban/KanbanBoard'
import { DetailDrawer } from '../components/drawer/DetailDrawer'
import { DraftEditContent } from '../components/drawer/DraftEditContent'
import { NewIssueContent } from '../components/drawer/NewIssueContent'
import { KnowledgeStatusBadge } from '../components/ui/KnowledgeStatusBadge'
import { DraftCardSkeleton } from '../components/ui/Skeleton'
import { ErrorState } from '../components/ui/ErrorState'

type DrawerState =
  | { mode: 'closed' }
  | { mode: 'edit'; draftId: number }
  | { mode: 'new' }

export function KanbanPage(): React.JSX.Element {
  const { repoId } = useParams({ from: '/repos/$repoId/' })
  const numericRepoId = Number(repoId)
  const [drawerState, setDrawerState] = useState<DrawerState>({ mode: 'closed' })

  const { data: drafts, isLoading, isError, refetch } = useDrafts(numericRepoId)
  const { data: repo } = useRepositoryById(numericRepoId)

  // Knowledge Base
  const { data: kbStatus, refetch: refetchKb } = useKnowledgeStatus(numericRepoId)
  const scanMutation = useKnowledgeScan()
  const repoFullName = repo?.fullName ?? ''
  const { data: scanProgress } = useScanProgress(
    repoFullName,
    scanMutation.isSuccess || scanMutation.isPending,
  )

  // Stop polling scan progress when done
  useEffect(() => {
    if (scanProgress?.phase === 'done' || scanProgress?.phase === 'error') {
      refetchKb()
    }
  }, [scanProgress?.phase, refetchKb])

  // Poll every 3s while any draft is generating or investigating
  const hasGenerating =
    drafts?.some((d) => d.status === 'generating' || d.status === 'investigating') ?? false
  useEffect(() => {
    if (!hasGenerating) return
    const id = setInterval(() => refetch(), 3000)
    return () => clearInterval(id)
  }, [hasGenerating, refetch])

  const handleCardClick = (draftId: number) => {
    setDrawerState({ mode: 'edit', draftId })
  }

  const handleDrawerClose = () => {
    setDrawerState({ mode: 'closed' })
    // Refetch to reflect any changes made in the drawer
    refetch()
  }

  const drawerOpen = drawerState.mode !== 'closed'
  const drawerTitle =
    drawerState.mode === 'new'
      ? '新規Issue作成'
      : drawerState.mode === 'edit'
        ? 'ドラフト編集'
        : ''

  return (
    <section aria-label="カンバンボード" className="flex h-full flex-col">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-[var(--foreground)]">ボード</h2>
          <KnowledgeStatusBadge
            status={kbStatus ?? null}
            scanProgress={scanProgress ?? null}
            onScan={() => scanMutation.mutate(numericRepoId)}
            isScanning={scanMutation.isPending || (scanProgress !== null && scanProgress !== undefined && scanProgress.phase !== 'done' && scanProgress.phase !== 'error')}
          />
        </div>
        <button
          type="button"
          onClick={() => setDrawerState({ mode: 'new' })}
          className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm text-[var(--primary-foreground)] transition-colors hover:brightness-110 active:scale-[0.97]"
        >
          + 新規Issue作成
        </button>
      </header>

      {isLoading ? (
        <div className="flex gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-1 flex-col gap-2 rounded-lg bg-[var(--muted)] p-3">
              <DraftCardSkeleton />
              <DraftCardSkeleton />
            </div>
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title="ドラフトの読み込みに失敗しました"
          message="データの取得中にエラーが発生しました。"
          onRetry={() => refetch()}
        />
      ) : (
        <div className="min-h-0 flex-1">
          <KanbanBoard drafts={drafts ?? []} onCardClick={handleCardClick} />
        </div>
      )}

      {/* Drawer */}
      <DetailDrawer open={drawerOpen} onClose={handleDrawerClose} title={drawerTitle}>
        {drawerState.mode === 'edit' && (
          <DraftEditContent draftId={drawerState.draftId} onClose={handleDrawerClose} />
        )}
        {drawerState.mode === 'new' && (
          <NewIssueContent repoId={numericRepoId} onClose={handleDrawerClose} />
        )}
      </DetailDrawer>
    </section>
  )
}

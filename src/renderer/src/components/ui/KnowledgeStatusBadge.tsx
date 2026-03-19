import type { KnowledgeStatus, ScanProgress } from '@shared/types'

interface KnowledgeStatusBadgeProps {
  status: KnowledgeStatus | null
  scanProgress: ScanProgress | null
  onScan: () => void
  isScanning: boolean
}

function formatScanDate(iso: string): string {
  const d = new Date(iso)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const hours = String(d.getHours()).padStart(2, '0')
  const mins = String(d.getMinutes()).padStart(2, '0')
  return `${month}/${day} ${hours}:${mins}`
}

export function KnowledgeStatusBadge({
  status,
  scanProgress,
  onScan,
  isScanning,
}: KnowledgeStatusBadgeProps): React.JSX.Element {
  // Scanning in progress
  if (isScanning && scanProgress) {
    const phaseLabels: Record<ScanProgress['phase'], string> = {
      collecting: '収集中...',
      analyzing: '分析中...',
      profiling: 'プロファイル生成中...',
      done: '完了',
      error: 'エラー',
    }

    const progress =
      scanProgress.totalModules > 0
        ? Math.round((scanProgress.completedModules / scanProgress.totalModules) * 100)
        : 0

    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
          <span>{phaseLabels[scanProgress.phase]}</span>
          {scanProgress.phase === 'analyzing' && scanProgress.totalModules > 0 && (
            <span className="tabular-nums">
              {scanProgress.completedModules}/{scanProgress.totalModules} ({progress}%)
            </span>
          )}
        </div>
        {scanProgress.currentModule && (
          <span className="max-w-[120px] truncate text-xs text-[var(--muted-foreground)]">
            {scanProgress.currentModule}
          </span>
        )}
      </div>
    )
  }

  // Scan error
  if (scanProgress?.phase === 'error') {
    return (
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs text-red-700 dark:bg-red-900/40 dark:text-red-300">
          KB: スキャンエラー
        </span>
        <button
          type="button"
          onClick={onScan}
          className="rounded-md px-2 py-0.5 text-xs text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
        >
          再試行
        </button>
      </div>
    )
  }

  // No KB exists yet
  if (!status || !status.exists) {
    return (
      <button
        type="button"
        onClick={onScan}
        disabled={isScanning}
        className="flex items-center gap-1.5 rounded-full border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)] disabled:opacity-50"
      >
        <span>KB: 未構築</span>
        <span aria-hidden="true">&#x2699;</span>
      </button>
    )
  }

  // KB exists — show status
  const meta = status.meta
  const lastScan = meta?.lastFullScanAt ? formatScanDate(meta.lastFullScanAt) : null
  const behind = status.commitsBehind

  return (
    <div className="flex items-center gap-2">
      <span
        className="flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs text-green-700 dark:bg-green-900/40 dark:text-green-300"
        title={
          lastScan
            ? `最終スキャン: ${lastScan}\nモジュール数: ${meta?.moduleCount ?? 0}${behind ? `\n${behind}コミット遅れ` : ''}`
            : undefined
        }
      >
        <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
        <span>KB: {meta?.moduleCount ?? 0}モジュール</span>
        {behind !== null && behind !== undefined && behind > 0 && (
          <span className="text-amber-600 dark:text-amber-400">({behind}遅れ)</span>
        )}
      </span>
      <button
        type="button"
        onClick={onScan}
        disabled={isScanning}
        className="rounded-md px-2 py-0.5 text-xs text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)] disabled:opacity-50"
        title="ナレッジベースを再スキャン"
      >
        &#x21BB;
      </button>
    </div>
  )
}

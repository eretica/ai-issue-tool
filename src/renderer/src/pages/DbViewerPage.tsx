import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

const TABLE_NAMES = [
  'repositories',
  'labels',
  'templates',
  'drafts',
  'draftLabels',
  'attachments',
  'publishedIssues',
  'settings',
] as const

export function DbViewerPage(): React.JSX.Element {
  const [activeTable, setActiveTable] = useState<string>('repositories')
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['db', 'dump'],
    queryFn: () => api.db.dump(),
  })

  const tableData = data?.[activeTable] as Record<string, unknown>[] | undefined
  const columns = tableData && tableData.length > 0 ? Object.keys(tableData[0]) : []

  const formatCell = (value: unknown): string => {
    if (value === null || value === undefined) return '—'
    if (typeof value === 'object') return JSON.stringify(value)
    const str = String(value)
    if (str.length > 80) return str.slice(0, 80) + '…'
    return str
  }

  return (
    <section aria-label="DB Viewer">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--foreground)]">DB Viewer</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            データベースの内容を確認できます
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-md bg-[var(--secondary)] px-3 py-1.5 text-sm text-[var(--secondary-foreground)] transition-colors hover:bg-[var(--accent)] active:scale-[0.97]"
        >
          更新
        </button>
      </header>

      {/* Table tabs */}
      <div className="mb-4 flex flex-wrap gap-1" role="tablist" aria-label="テーブル選択">
        {TABLE_NAMES.map((name) => {
          const count = data?.[name] ? (data[name] as unknown[]).length : 0
          return (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={activeTable === name}
              onClick={() => setActiveTable(name)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTable === name
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                  : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--accent)]'
              }`}
            >
              {name}
              <span className="ml-1 opacity-60">({count})</span>
            </button>
          )
        })}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <span className="text-sm text-[var(--muted-foreground)]">読み込み中...</span>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          データの取得に失敗しました: {String(error)}
        </div>
      ) : !tableData || tableData.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--border)] py-12 text-center">
          <p className="text-sm text-[var(--muted-foreground)]">
            {activeTable} テーブルにデータがありません
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--muted)]">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col}
                    className="whitespace-nowrap px-3 py-2 text-xs font-semibold text-[var(--muted-foreground)]"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--accent)]"
                >
                  {columns.map((col) => (
                    <td
                      key={col}
                      className="whitespace-nowrap px-3 py-2 text-xs text-[var(--foreground)]"
                      title={String(row[col] ?? '')}
                    >
                      {formatCell(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Stats */}
      {data && (
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-[var(--muted-foreground)]">
          {TABLE_NAMES.map((name) => (
            <span key={name}>
              {name}: {(data[name] as unknown[])?.length ?? 0}件
            </span>
          ))}
        </div>
      )}
    </section>
  )
}

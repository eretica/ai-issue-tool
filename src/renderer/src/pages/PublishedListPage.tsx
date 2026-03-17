import { usePublishedIssues, useRepositories } from '../hooks/queries'

export function PublishedListPage(): React.JSX.Element {
  const { data: issues, isLoading: issuesLoading } = usePublishedIssues()
  const { data: repositories } = useRepositories()

  const repoMap = new Map(repositories?.map((r) => [r.id, r]) ?? [])

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  return (
    <section aria-label="公開済みIssue">
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-[var(--foreground)]">公開済みIssue</h2>
      </header>

      <div className="overflow-hidden rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm" aria-label="公開済みIssue一覧">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
              <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">タイトル</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">リポジトリ</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Issue #</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">状態</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">公開日</th>
            </tr>
          </thead>
          <tbody>
            {issuesLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-[var(--muted-foreground)]">
                  読み込み中...
                </td>
              </tr>
            ) : !issues || issues.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-[var(--muted-foreground)]">
                  公開済みのIssueはありません。
                </td>
              </tr>
            ) : (
              issues.map((issue) => {
                const repo = repoMap.get(issue.repositoryId)
                return (
                  <tr
                    key={issue.id}
                    className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--muted)]"
                  >
                    <td className="px-4 py-3 text-[var(--foreground)]">{issue.title}</td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">
                      {repo ? repo.fullName : `repo#${issue.repositoryId}`}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={issue.githubIssueUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--primary)] hover:underline"
                      >
                        #{issue.githubIssueNumber}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          issue.state === 'open'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {issue.state}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">
                      {formatDate(issue.publishedAt)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function PublishedListPage(): React.JSX.Element {
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
            <tr>
              <td colSpan={5} className="px-4 py-12 text-center text-[var(--muted-foreground)]">
                公開済みのIssueはありません。
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}

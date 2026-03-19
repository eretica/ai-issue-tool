import { Link, useRouterState } from '@tanstack/react-router'
import { useRepositories } from '../../hooks/queries'
import { useTheme } from '../../hooks/useTheme'

export function Sidebar(): React.JSX.Element {
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname
  const repoIdMatch = currentPath.match(/^\/repos\/(\d+)/)
  const currentRepoId = repoIdMatch ? Number(repoIdMatch[1]) : null

  const { data: repositories } = useRepositories()
  const { theme, toggleTheme } = useTheme()

  const repoNavItems = currentRepoId
    ? [
        { to: `/repos/${currentRepoId}` as const, label: 'ボード', exact: true },
      ]
    : []

  return (
    <nav
      aria-label="メインナビゲーション"
      className="flex h-full w-[var(--sidebar-width)] flex-shrink-0 flex-col border-r border-[var(--border)] bg-[var(--muted)]"
    >
      <header className="border-b border-[var(--border)] px-4 py-4">
        <h1 className="text-lg font-bold text-[var(--foreground)]">AI Issue Tool</h1>
      </header>

      <div className="flex flex-1 flex-col overflow-y-auto">
        {/* Repository list section */}
        <div className="p-2">
          <span className="mb-1 block px-3 py-1 text-xs font-medium text-[var(--muted-foreground)]">
            リポジトリ
          </span>
          <ul className="flex flex-col gap-0.5" role="list">
            {repositories?.map((repo) => {
              const isActive = currentRepoId === repo.id
              return (
                <li key={repo.id}>
                  <Link
                    to={`/repos/${repo.id}`}
                    aria-current={isActive ? 'page' : undefined}
                    className={`block truncate rounded-md px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? 'bg-[var(--primary)] font-bold text-[var(--primary-foreground)]'
                        : 'text-[var(--foreground)] hover:bg-[var(--accent)]'
                    }`}
                  >
                    {repo.name}
                  </Link>
                </li>
              )
            })}
            <li>
              <Link
                to="/"
                className="block rounded-md px-3 py-2 text-sm text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
              >
                + 追加
              </Link>
            </li>
          </ul>
        </div>

        {/* Repo-scoped navigation (shown only when a repo is selected) */}
        {currentRepoId !== null && (
          <div className="p-2 pt-0">
            <div className="mx-3 mb-2 border-t border-[var(--border)]" />
            <ul className="flex flex-col gap-0.5" role="list">
              {repoNavItems.map((item) => {
                const isActive = item.exact
                  ? currentPath === item.to
                  : currentPath.startsWith(item.to)
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      aria-current={isActive ? 'page' : undefined}
                      className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                        isActive
                          ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                          : 'text-[var(--foreground)] hover:bg-[var(--accent)]'
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Global section */}
        <div className="p-2 pt-0">
          <div className="mx-3 mb-2 border-t border-[var(--border)]" />
          <ul className="flex flex-col gap-0.5" role="list">
            <li>
              <Link
                to="/settings"
                aria-current={currentPath.startsWith('/settings') ? 'page' : undefined}
                className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                  currentPath.startsWith('/settings')
                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                    : 'text-[var(--foreground)] hover:bg-[var(--accent)]'
                }`}
              >
                設定
              </Link>
            </li>
            <li>
              <Link
                to="/db"
                aria-current={currentPath.startsWith('/db') ? 'page' : undefined}
                className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                  currentPath.startsWith('/db')
                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                    : 'text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]'
                }`}
              >
                DB Viewer
              </Link>
            </li>
            <li>
              <button
                type="button"
                onClick={toggleTheme}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--accent)]"
                aria-label={theme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
              >
                <span>{theme === 'dark' ? 'ライトモード' : 'ダークモード'}</span>
                <span className="text-base" aria-hidden="true">{theme === 'dark' ? '\u2600' : '\u263E'}</span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  )
}

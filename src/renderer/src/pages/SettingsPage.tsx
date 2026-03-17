import { Link, Outlet, useRouterState } from '@tanstack/react-router'

export function SettingsPage(): React.JSX.Element {
  const routerState = useRouterState()
  const isSettingsRoot = routerState.location.pathname === '/settings'

  return (
    <section aria-label="設定">
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-[var(--foreground)]">設定</h2>
      </header>

      {isSettingsRoot ? (
        <div className="flex flex-col gap-6">
          {/* API Settings */}
          <div className="rounded-lg border border-[var(--border)] p-6">
            <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">API設定</h3>
            <div className="flex flex-col gap-4">
              <div>
                <label htmlFor="github-token" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                  GitHub Personal Access Token
                </label>
                <input
                  id="github-token"
                  type="password"
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                  placeholder="ghp_xxxxxxxxxxxx"
                />
              </div>
              <div>
                <label htmlFor="claude-api-key" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                  Claude API Key
                </label>
                <input
                  id="claude-api-key"
                  type="password"
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                  placeholder="sk-ant-xxxxxxxxxxxx"
                />
              </div>
            </div>
          </div>

          {/* Repository Management */}
          <div className="rounded-lg border border-[var(--border)] p-6">
            <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">リポジトリ管理</h3>
            <p className="mb-4 text-sm text-[var(--muted-foreground)]">
              Issueを作成するリポジトリを管理します。
            </p>
            <Link
              to="/settings/repositories"
              className="rounded-md bg-[var(--secondary)] px-4 py-2 text-sm text-[var(--secondary-foreground)] transition-colors hover:bg-[var(--accent)]"
            >
              リポジトリ管理を開く
            </Link>
          </div>

          {/* Template Management */}
          <div className="rounded-lg border border-[var(--border)] p-6">
            <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">テンプレート管理</h3>
            <p className="mb-4 text-sm text-[var(--muted-foreground)]">
              Issueのテンプレートをカスタマイズします。
            </p>
            <Link
              to="/settings"
              className="rounded-md bg-[var(--secondary)] px-4 py-2 text-sm text-[var(--secondary-foreground)] transition-colors hover:bg-[var(--accent)]"
            >
              テンプレート一覧を開く
            </Link>
          </div>
        </div>
      ) : (
        <Outlet />
      )}
    </section>
  )
}

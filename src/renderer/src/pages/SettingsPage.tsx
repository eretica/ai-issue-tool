import { useState, useEffect } from 'react'
import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import { useSetting, useSetSetting } from '../hooks/queries'

export function SettingsPage(): React.JSX.Element {
  const routerState = useRouterState()
  const isSettingsRoot = routerState.location.pathname === '/settings'

  const { data: githubToken, isLoading: githubTokenLoading } = useSetting('github_token')
  const { data: claudeApiKey, isLoading: claudeApiKeyLoading } = useSetting('claude_api_key')
  const setSetting = useSetSetting()

  const [localGithubToken, setLocalGithubToken] = useState('')
  const [localClaudeApiKey, setLocalClaudeApiKey] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Initialize local state from loaded settings
  useEffect(() => {
    if (githubToken !== undefined && githubToken !== null) {
      setLocalGithubToken(githubToken)
    }
  }, [githubToken])

  useEffect(() => {
    if (claudeApiKey !== undefined && claudeApiKey !== null) {
      setLocalClaudeApiKey(claudeApiKey)
    }
  }, [claudeApiKey])

  // Clear save success message after 2 seconds
  useEffect(() => {
    if (!saveSuccess) return undefined
    const timer = setTimeout(() => setSaveSuccess(false), 2000)
    return () => clearTimeout(timer)
  }, [saveSuccess])

  const isLoading = githubTokenLoading || claudeApiKeyLoading

  const handleSaveApiSettings = async () => {
    try {
      await Promise.all([
        setSetting.mutateAsync({ key: 'github_token', value: localGithubToken }),
        setSetting.mutateAsync({ key: 'claude_api_key', value: localClaudeApiKey }),
      ])
      setSaveSuccess(true)
    } catch {
      // Error is available via setSetting.error if needed
    }
  }

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
            {isLoading ? (
              <div className="py-4 text-sm text-[var(--muted-foreground)]">読み込み中...</div>
            ) : (
              <div className="flex flex-col gap-4">
                <div>
                  <label htmlFor="github-token" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                    GitHub Personal Access Token
                  </label>
                  <input
                    id="github-token"
                    type="password"
                    value={localGithubToken}
                    onChange={(e) => setLocalGithubToken(e.target.value)}
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
                    value={localClaudeApiKey}
                    onChange={(e) => setLocalClaudeApiKey(e.target.value)}
                    className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                    placeholder="sk-ant-xxxxxxxxxxxx"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={setSetting.isPending}
                    onClick={handleSaveApiSettings}
                    className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm text-[var(--primary-foreground)] transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {setSetting.isPending ? '保存中...' : '保存'}
                  </button>
                  {saveSuccess && (
                    <span className="text-sm text-green-600">保存しました</span>
                  )}
                </div>
              </div>
            )}
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

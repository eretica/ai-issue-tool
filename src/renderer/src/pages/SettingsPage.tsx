import { useState, useEffect } from 'react'
import { useSetting, useSetSetting } from '../hooks/queries'
import { useToast } from '../components/ui/Toast'
import { SettingsSkeleton } from '../components/ui/Skeleton'
import type { GenerationMode } from '@shared/types'

type ModelTier = 'haiku' | 'sonnet' | 'opus'

interface PipelineModels {
  classify: ModelTier
  investigate: ModelTier
  plan: ModelTier
  generate: ModelTier
  qc: ModelTier
}

const DEFAULT_PIPELINE_MODELS: PipelineModels = {
  classify: 'haiku',
  investigate: 'sonnet',
  plan: 'sonnet',
  generate: 'opus',
  qc: 'sonnet',
}

export function SettingsPage(): React.JSX.Element {
  const { data: githubMode, isLoading: githubModeLoading } = useSetting('github_mode')
  const { data: aiMode, isLoading: aiModeLoading } = useSetting('ai_mode')
  const { data: defaultMode, isLoading: defaultModeLoading } = useSetting('default_generation_mode')
  const { data: pipelineSettingsRaw, isLoading: pipelineLoading } = useSetting('pipeline_settings')
  const setSetting = useSetSetting()
  const { toast } = useToast()

  const [localGithubMode, setLocalGithubMode] = useState('gh-cli')
  const [localAiMode, setLocalAiMode] = useState('claude-cli')
  const [localDefaultMode, setLocalDefaultMode] = useState<GenerationMode>('ai_doc')
  const [pipelineModels, setPipelineModels] = useState<PipelineModels>(DEFAULT_PIPELINE_MODELS)
  const [pipelineEnabled, setPipelineEnabled] = useState(false)

  useEffect(() => {
    if (githubMode !== undefined && githubMode !== null) {
      setLocalGithubMode(githubMode)
    }
  }, [githubMode])

  useEffect(() => {
    if (aiMode !== undefined && aiMode !== null) {
      setLocalAiMode(aiMode)
    }
  }, [aiMode])

  useEffect(() => {
    if (defaultMode !== undefined && defaultMode !== null) {
      setLocalDefaultMode(defaultMode as GenerationMode)
    }
  }, [defaultMode])

  useEffect(() => {
    if (pipelineSettingsRaw) {
      try {
        const parsed = JSON.parse(pipelineSettingsRaw)
        if (parsed.models) setPipelineModels({ ...DEFAULT_PIPELINE_MODELS, ...parsed.models })
        if (parsed.enableByDefault !== undefined) setPipelineEnabled(parsed.enableByDefault)
      } catch { /* ignore */ }
    }
  }, [pipelineSettingsRaw])

  const isLoading = githubModeLoading || aiModeLoading || defaultModeLoading || pipelineLoading

  const handleSaveConnectionSettings = async () => {
    try {
      await Promise.all([
        setSetting.mutateAsync({ key: 'github_mode', value: localGithubMode }),
        setSetting.mutateAsync({ key: 'ai_mode', value: localAiMode }),
      ])
      toast('保存しました')
    } catch {
      toast('保存に失敗しました', 'error')
    }
  }

  const handleSaveAiSettings = async () => {
    try {
      await setSetting.mutateAsync({ key: 'default_generation_mode', value: localDefaultMode })
      toast('AI設定を保存しました')
    } catch {
      toast('保存に失敗しました', 'error')
    }
  }

  return (
    <section aria-label="設定">
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-[var(--foreground)]">設定</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          外部ツール連携やAI生成の設定を管理します
        </p>
      </header>

      <div className="flex flex-col gap-6">
        {/* Connection Settings */}
        <div className="rounded-lg border border-[var(--border)] p-6">
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">外部ツール連携</h3>
          {isLoading ? (
            <SettingsSkeleton />
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <label htmlFor="github-mode" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                  GitHub連携
                </label>
                <select
                  id="github-mode"
                  value={localGithubMode}
                  onChange={(e) => setLocalGithubMode(e.target.value)}
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:ring-2 focus:ring-[var(--ring)] focus:outline-none"
                >
                  <option value="mock">Mock（テスト用）</option>
                  <option value="gh-cli">gh CLI（推奨）</option>
                </select>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {localGithubMode === 'gh-cli'
                    ? 'gh CLIがインストール・認証済みである必要があります（gh auth login）。PATは不要です。'
                    : 'Issue公開・ラベル取得をモックで返します。実際のGitHubには接続しません。'}
                </p>
              </div>
              <div>
                <label htmlFor="ai-mode" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                  AI生成エンジン
                </label>
                <select
                  id="ai-mode"
                  value={localAiMode}
                  onChange={(e) => setLocalAiMode(e.target.value)}
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:ring-2 focus:ring-[var(--ring)] focus:outline-none"
                >
                  <option value="mock">Mock（テスト用）</option>
                  <option value="claude-cli">Claude Code CLI（claude -p）</option>
                </select>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {localAiMode === 'claude-cli'
                    ? 'Claude Codeがインストールされている必要があります。MAX PROプランの枠内で利用できます。'
                    : 'テンプレートベースのモック生成を使用します。CLIツール不要。'}
                </p>
              </div>
              <div>
                <button
                  type="button"
                  disabled={setSetting.isPending}
                  onClick={handleSaveConnectionSettings}
                  className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm text-[var(--primary-foreground)] transition-colors hover:brightness-110 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {setSetting.isPending ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* AI Generation Settings */}
        <div className="rounded-lg border border-[var(--border)] p-6">
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">AI生成設定</h3>
          <div className="flex flex-col gap-4">
            <div>
              <p className="mb-2 text-sm font-medium text-[var(--foreground)]">
                デフォルト生成モード
              </p>
              <div className="flex gap-4" role="radiogroup" aria-label="デフォルト生成モード">
                <label className="flex items-center gap-2 text-sm text-[var(--foreground)] cursor-pointer">
                  <input
                    type="radio"
                    name="defaultMode"
                    value="ai_doc"
                    checked={localDefaultMode === 'ai_doc'}
                    onChange={() => setLocalDefaultMode('ai_doc')}
                  />
                  AI向けドキュメント
                </label>
                <label className="flex items-center gap-2 text-sm text-[var(--foreground)] cursor-pointer">
                  <input
                    type="radio"
                    name="defaultMode"
                    value="human_doc"
                    checked={localDefaultMode === 'human_doc'}
                    onChange={() => setLocalDefaultMode('human_doc')}
                  />
                  人間向けドキュメント
                </label>
              </div>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                新規Issue作成時のデフォルトの生成モードを設定します
              </p>
            </div>
            <div>
              <button
                type="button"
                disabled={setSetting.isPending}
                onClick={handleSaveAiSettings}
                className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm text-[var(--primary-foreground)] transition-colors hover:brightness-110 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {setSetting.isPending ? '保存中...' : 'AI設定を保存'}
              </button>
            </div>
          </div>
        </div>

        {/* Pipeline Settings */}
        <div className="rounded-lg border border-[var(--border)] p-6">
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">パイプライン設定</h3>
          <div className="flex flex-col gap-4">
            <label className="flex items-center gap-2 text-sm text-[var(--foreground)] cursor-pointer">
              <input
                type="checkbox"
                checked={pipelineEnabled}
                onChange={(e) => setPipelineEnabled(e.target.checked)}
                className="rounded border-[var(--border)]"
              />
              デフォルトで調査パイプラインを使用
            </label>

            <div>
              <p className="mb-2 text-sm font-medium text-[var(--foreground)]">モデル設定</p>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ['classify', '分類'],
                    ['investigate', '調査'],
                    ['plan', '計画'],
                    ['generate', '生成'],
                    ['qc', 'QC'],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key}>
                    <label htmlFor={`model-${key}`} className="mb-1 block text-xs text-[var(--muted-foreground)]">
                      {label}
                    </label>
                    <select
                      id={`model-${key}`}
                      value={pipelineModels[key]}
                      onChange={(e) =>
                        setPipelineModels((prev) => ({
                          ...prev,
                          [key]: e.target.value as ModelTier,
                        }))
                      }
                      className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm text-[var(--foreground)] focus:ring-2 focus:ring-[var(--ring)] focus:outline-none"
                    >
                      <option value="haiku">Haiku</option>
                      <option value="sonnet">Sonnet</option>
                      <option value="opus">Opus</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <button
                type="button"
                disabled={setSetting.isPending}
                onClick={async () => {
                  try {
                    await setSetting.mutateAsync({
                      key: 'pipeline_settings',
                      value: JSON.stringify({
                        enableByDefault: pipelineEnabled,
                        models: pipelineModels,
                      }),
                    })
                    toast('パイプライン設定を保存しました')
                  } catch {
                    toast('保存に失敗しました', 'error')
                  }
                }}
                className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm text-[var(--primary-foreground)] transition-colors hover:brightness-110 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {setSetting.isPending ? '保存中...' : 'パイプライン設定を保存'}
              </button>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="rounded-lg border border-[var(--border)] p-6">
          <h3 className="mb-2 text-lg font-semibold text-[var(--foreground)]">バージョン情報</h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            AI Issue Tool v1.0.0
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            AIを活用したGitHub Issue作成ツール
          </p>
        </div>
      </div>
    </section>
  )
}

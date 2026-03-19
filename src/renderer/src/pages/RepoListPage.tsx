import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  useRepositories,
  useOpenDirectory,
  useCreateRepository,
  useDeleteRepository,
} from '../hooks/queries'
import { useToast } from '../components/ui/Toast'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'

export function RepoListPage(): React.JSX.Element {
  const { data: repositories, isLoading } = useRepositories()
  const openDirectory = useOpenDirectory()
  const createRepository = useCreateRepository()
  const deleteRepository = useDeleteRepository()
  const { toast } = useToast()

  const [manualInput, setManualInput] = useState('')
  const [manualError, setManualError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; fullName: string } | null>(null)

  const handleAddFromFolder = async (): Promise<void> => {
    try {
      const result = await openDirectory.mutateAsync()
      if (result === null) return
      await createRepository.mutateAsync({
        owner: result.owner,
        name: result.name,
        fullName: result.fullName,
        defaultBranch: result.defaultBranch,
        localPath: result.localPath,
        isDefault: false,
      })
      toast('リポジトリを追加しました')
    } catch {
      toast('リポジトリの追加に失敗しました', 'error')
    }
  }

  const handleManualAdd = async (): Promise<void> => {
    const trimmed = manualInput.trim()
    if (!trimmed) return

    const parts = trimmed.split('/')
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      setManualError('owner/name の形式で入力してください')
      return
    }

    setManualError('')
    try {
      await createRepository.mutateAsync({
        owner: parts[0],
        name: parts[1],
        fullName: trimmed,
        defaultBranch: 'main',
        localPath: null,
        isDefault: false,
      })
      setManualInput('')
      toast('リポジトリを追加しました')
    } catch {
      toast('リポジトリの追加に失敗しました', 'error')
    }
  }

  const handleDelete = (): void => {
    if (!deleteTarget) return
    const { id, fullName } = deleteTarget
    setDeleteTarget(null)
    deleteRepository.mutate(id, {
      onSuccess: () => toast(`${fullName} を削除しました`),
    })
  }

  const truncatePath = (path: string, maxLen = 40): string => {
    if (path.length <= maxLen) return path
    return '...' + path.slice(path.length - maxLen + 3)
  }

  return (
    <section aria-label="リポジトリ一覧">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--foreground)]">リポジトリ</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Issue管理対象のリポジトリ一覧
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddFromFolder}
          disabled={openDirectory.isPending || createRepository.isPending}
          className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm text-[var(--primary-foreground)] transition-colors hover:brightness-110 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {openDirectory.isPending || createRepository.isPending
            ? '追加中...'
            : 'フォルダから追加'}
        </button>
      </header>

      {/* Repository cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <span className="text-sm text-[var(--muted-foreground)]">読み込み中...</span>
        </div>
      ) : repositories && repositories.length > 0 ? (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {repositories.map((repo) => (
            <div
              key={repo.id}
              className="group relative rounded-lg border border-[var(--border)] transition-all hover:border-[var(--ring)] hover:shadow-sm"
            >
              <button
                type="button"
                onClick={() => setDeleteTarget({ id: repo.id, fullName: repo.fullName })}
                disabled={deleteRepository.isPending}
                className="absolute right-3 top-3 rounded-md p-1 text-xs text-[var(--muted-foreground)] opacity-0 transition-all hover:bg-[var(--destructive)] hover:text-white group-hover:opacity-100 disabled:opacity-50"
                aria-label={`${repo.fullName} を削除`}
              >
                削除
              </button>
              <Link
                to={`/repos/${repo.id}`}
                className="block p-4"
              >
                <h3 className="pr-10 text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)]">
                  {repo.fullName}
                </h3>
                <div className="mt-2 flex items-center gap-2">
                  <span className="rounded bg-[var(--muted)] px-1.5 py-0.5 text-xs text-[var(--muted-foreground)]">
                    {repo.defaultBranch}
                  </span>
                  {repo.isDefault && (
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">
                      デフォルト
                    </span>
                  )}
                </div>
                {repo.localPath && (
                  <p
                    className="mt-2 truncate text-xs text-[var(--muted-foreground)]"
                    title={repo.localPath}
                  >
                    {truncatePath(repo.localPath)}
                  </p>
                )}
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="mb-8 flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border)] py-16">
          <p className="text-[var(--muted-foreground)]">
            リポジトリを追加してIssue管理を始めましょう
          </p>
        </div>
      )}

      {/* Manual add form */}
      <div className="border-t border-[var(--border)] pt-6">
        <h3 className="mb-4 text-sm font-medium text-[var(--muted-foreground)]">手動追加</h3>
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => {
                setManualInput(e.target.value)
                if (manualError) setManualError('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleManualAdd()
              }}
              placeholder="owner/name"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:ring-2 focus:ring-[var(--ring)] focus:outline-none"
            />
            {manualError && (
              <p className="mt-1 text-xs text-red-500">{manualError}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleManualAdd}
            disabled={createRepository.isPending || !manualInput.trim()}
            className="rounded-md bg-[var(--secondary)] px-4 py-2 text-sm text-[var(--secondary-foreground)] transition-colors hover:bg-[var(--accent)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createRepository.isPending ? '追加中...' : '追加'}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="リポジトリを削除しますか？"
        description={`${deleteTarget?.fullName ?? ''} をリポジトリ一覧から削除します。ローカルのファイルは削除されません。`}
        confirmLabel="削除する"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </section>
  )
}

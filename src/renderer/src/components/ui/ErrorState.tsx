interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
}

export function ErrorState({
  title = 'エラーが発生しました',
  message = '予期しないエラーが発生しました。もう一度お試しください。',
  onRetry,
}: ErrorStateProps): React.JSX.Element {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 py-12 text-center"
    >
      <div className="mb-2 text-3xl">!</div>
      <h3 className="mb-1 text-lg font-semibold text-red-800">{title}</h3>
      <p className="mb-4 text-sm text-red-600">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md bg-red-600 px-4 py-2 text-sm text-white transition-colors hover:bg-red-700 active:scale-[0.97]"
        >
          再試行
        </button>
      )}
    </div>
  )
}

interface ScoreBadgeProps {
  score: number | null
  size?: 'sm' | 'md'
}

function getScoreColor(score: number): {
  bg: string
  text: string
  ring: string
  fill: string
} {
  if (score >= 80) {
    return {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-300',
      ring: 'stroke-green-500',
      fill: 'text-green-600 dark:text-green-400',
    }
  }
  if (score >= 60) {
    return {
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-700 dark:text-amber-300',
      ring: 'stroke-amber-500',
      fill: 'text-amber-600 dark:text-amber-400',
    }
  }
  return {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    ring: 'stroke-red-500',
    fill: 'text-red-600 dark:text-red-400',
  }
}

export function ScoreBadge({ score, size = 'sm' }: ScoreBadgeProps): React.JSX.Element | null {
  if (score === null || score === undefined) return null

  const colors = getScoreColor(score)

  if (size === 'sm') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums ${colors.bg} ${colors.text}`}
        title={`QC スコア: ${score}/100`}
      >
        {score}
      </span>
    )
  }

  // Medium size with circular progress
  const radius = 18
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 ${colors.bg}`}
      title={`QC スコア: ${score}/100`}
    >
      <div className="relative h-10 w-10">
        <svg className="h-10 w-10 -rotate-90" viewBox="0 0 44 44">
          <circle
            cx="22"
            cy="22"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-gray-200 dark:text-gray-700"
          />
          <circle
            cx="22"
            cy="22"
            r={radius}
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={`transition-all duration-700 ${colors.ring}`}
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums ${colors.fill}`}>
          {score}
        </span>
      </div>
      <div className="flex flex-col">
        <span className={`text-xs font-medium ${colors.text}`}>QC スコア</span>
        <span className="text-[10px] text-[var(--muted-foreground)]">/100</span>
      </div>
    </div>
  )
}

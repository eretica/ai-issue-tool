import { useEffect, useState } from 'react'
import type { PipelineStep, PipelineStepName } from '@shared/types'
import { usePipelineSteps, useCancelPipeline } from '../../hooks/queries'

const STEP_LABELS: Record<PipelineStepName, string> = {
  classify: '分類',
  investigate: '調査',
  plan: '計画',
  generate: '生成',
  qc: 'QC',
}

const STEP_DESCRIPTIONS: Record<PipelineStepName, string> = {
  classify: '複雑度を判定中...',
  investigate: 'コードを調査中...',
  plan: '生成方針を決定中...',
  generate: 'Issue本文を生成中...',
  qc: '品質チェック中...',
}

function StepIcon({ status }: { status: PipelineStep['status'] }): React.JSX.Element {
  switch (status) {
    case 'completed':
      return (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white text-xs">
          &#10003;
        </span>
      )
    case 'running':
      return (
        <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-amber-500">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </span>
      )
    case 'failed':
      return (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white text-xs">
          !
        </span>
      )
    case 'skipped':
      return (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-300 text-gray-500 text-xs">
          -
        </span>
      )
    default:
      return (
        <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--border)] text-[var(--muted-foreground)] text-xs">
          &#9679;
        </span>
      )
  }
}

function formatDuration(ms: number | null): string {
  if (!ms) return ''
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

interface PipelineProgressProps {
  draftId: number
  compact?: boolean
}

export function PipelineProgress({ draftId, compact = false }: PipelineProgressProps): React.JSX.Element | null {
  const { data: steps } = usePipelineSteps(draftId)
  const cancelPipeline = useCancelPipeline()
  const [elapsed, setElapsed] = useState(0)

  // Track elapsed time for running step
  const runningStep = steps?.find((s) => s.status === 'running')
  useEffect(() => {
    if (!runningStep?.startedAt) {
      setElapsed(0)
      return
    }
    const startTime = new Date(runningStep.startedAt).getTime()
    const update = () => setElapsed(Math.floor((Date.now() - startTime) / 1000))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [runningStep?.startedAt])

  if (!steps || steps.length === 0) return null

  const completedCount = steps.filter((s) => s.status === 'completed' || s.status === 'skipped').length
  const totalSteps = steps.length
  const isRunning = steps.some((s) => s.status === 'running')

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-amber-700">
          AI調査中 {completedCount}/{totalSteps}
        </span>
        <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-amber-500 transition-all duration-500"
            style={{ width: `${(completedCount / totalSteps) * 100}%` }}
          />
        </div>
        {runningStep && (
          <span className="text-xs text-[var(--muted-foreground)]">
            {STEP_DESCRIPTIONS[runningStep.stepName as PipelineStepName]}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
      {/* Step indicators */}
      <div className="mb-3 flex items-center justify-between">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <StepIcon status={step.status} />
              <span className="mt-1 text-xs text-[var(--muted-foreground)]">
                {STEP_LABELS[step.stepName as PipelineStepName]}
              </span>
              {step.durationMs && (
                <span className="text-[10px] text-[var(--muted-foreground)]">
                  {formatDuration(step.durationMs)}
                </span>
              )}
            </div>
            {i < steps.length - 1 && (
              <div
                className={`mx-2 h-0.5 w-8 ${
                  step.status === 'completed' || step.status === 'skipped'
                    ? 'bg-green-400'
                    : 'bg-[var(--border)]'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Status description */}
      {runningStep && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-amber-700">
            {STEP_DESCRIPTIONS[runningStep.stepName as PipelineStepName]}
            {runningStep.modelUsed && (
              <span className="ml-1 text-xs text-[var(--muted-foreground)]">
                ({runningStep.modelUsed})
              </span>
            )}
          </span>
          <span className="text-xs text-[var(--muted-foreground)]">
            {elapsed}s
          </span>
        </div>
      )}

      {/* Error display */}
      {steps.some((s) => s.status === 'failed') && (
        <div className="mt-2 rounded bg-red-100 px-3 py-2 text-xs text-red-700">
          {steps.find((s) => s.status === 'failed')?.errorMessage || 'ステップが失敗しました'}
        </div>
      )}

      {/* Cancel button */}
      {isRunning && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            disabled={cancelPipeline.isPending}
            onClick={() => cancelPipeline.mutate(draftId)}
            className="rounded-md border border-[var(--border)] bg-[var(--secondary)] px-3 py-1.5 text-xs text-[var(--secondary-foreground)] transition-colors hover:bg-[var(--accent)] active:scale-[0.97] disabled:opacity-50"
          >
            {cancelPipeline.isPending ? 'キャンセル中...' : 'キャンセル'}
          </button>
        </div>
      )}
    </div>
  )
}

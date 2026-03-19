import { useParams, Link } from '@tanstack/react-router'
import { usePipelineSteps, useDraftById } from '../hooks/queries'
import type { PipelineStep } from '@shared/types'
import { useState, useEffect, useRef } from 'react'

const STEP_LABELS: Record<string, string> = {
  classify: '分類',
  investigate: '調査',
  plan: '計画',
  generate: '生成',
  qc: '品質チェック',
}

const STEP_ICONS: Record<string, string> = {
  classify: '\u{1F50D}',
  investigate: '\u{1F4C2}',
  plan: '\u{1F4CB}',
  generate: '\u{270F}\u{FE0F}',
  qc: '\u{2705}',
}

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  running: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  skipped: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  pending: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
}

function formatDuration(ms: number | null): string {
  if (!ms) return '-'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function CollapsibleText({
  text,
  maxLines = 20,
  label,
}: {
  text: string
  maxLines?: number
  label: string
}): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const lines = text.split('\n')
  const needsCollapse = lines.length > maxLines

  const displayText = expanded || !needsCollapse
    ? text
    : lines.slice(0, maxLines).join('\n') + '\n...'

  return (
    <div>
      <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed">{displayText}</pre>
      {needsCollapse && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-1 text-xs text-[var(--primary)] hover:underline"
        >
          {expanded ? `${label}を折りたたむ` : `${label}を全て表示 (${lines.length}行)`}
        </button>
      )}
    </div>
  )
}

// Clean outputData by removing internal fields for display
function getCleanOutputData(outputData: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!outputData) return null
  const cleaned = { ...outputData }
  delete cleaned._rawResponse
  delete cleaned._reasoning
  return Object.keys(cleaned).length > 0 ? cleaned : null
}

function StepConversation({ step }: { step: PipelineStep }): React.JSX.Element {
  const prompt = (step.inputSummary as any)?.prompt as string | undefined
  const rawResponse = (step.outputData as any)?._rawResponse as string | undefined
  const reasoning = (step.outputData as any)?._reasoning as string | undefined
  const cleanOutput = getCleanOutputData(step.outputData)
  const isSkipped = step.status === 'skipped'

  if (isSkipped) {
    return (
      <div className="py-4 text-center text-sm text-[var(--muted-foreground)]">
        このステップはスキップされました
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 py-3">
      {/* Prompt (User message) */}
      {prompt ? (
        <div className="flex gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-[var(--foreground)]">
            U
          </div>
          <div className="min-w-0 flex-1 rounded-lg rounded-tl-none bg-[var(--accent)] p-3">
            <div className="mb-1 text-xs font-medium text-[var(--muted-foreground)]">
              Prompt to Claude
            </div>
            <CollapsibleText text={prompt} maxLines={15} label="プロンプト" />
          </div>
        </div>
      ) : (
        <div className="py-2 text-sm text-[var(--muted-foreground)]">
          {step.stepName === 'investigate'
            ? 'ローカルリポジトリを直接スキャン（Claude CLI 不使用）'
            : 'プロンプトデータなし（次回のパイプライン実行で記録されます）'}
        </div>
      )}

      {/* Reasoning (AI thinking process) */}
      {reasoning && (
        <div className="flex gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-200 text-sm dark:bg-purple-900/50">
            <svg className="h-4 w-4 text-purple-600 dark:text-purple-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1 rounded-lg rounded-tl-none border border-purple-200 bg-purple-50 p-3 dark:border-purple-800 dark:bg-purple-950/30">
            <div className="mb-1 text-xs font-medium text-purple-600 dark:text-purple-400">
              AI の思考プロセス
            </div>
            <CollapsibleText text={reasoning} maxLines={12} label="思考" />
          </div>
        </div>
      )}

      {/* Parsed Result (structured output) */}
      {cleanOutput && (
        <div className="flex gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-bold text-[var(--primary-foreground)]">
            AI
          </div>
          <div className="min-w-0 flex-1 rounded-lg rounded-tl-none border border-[var(--border)] bg-[var(--card)] p-3">
            <div className="mb-1 text-xs font-medium text-[var(--muted-foreground)]">
              {rawResponse ? '構造化された結果' : 'Parsed Result'}
            </div>
            <StepOutputSummary stepName={step.stepName} data={cleanOutput} />
          </div>
        </div>
      )}

      {/* Raw Response (collapsible, for debugging) */}
      {rawResponse && (
        <details className="ml-11">
          <summary className="cursor-pointer text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
            Raw Response を表示
          </summary>
          <div className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--muted)] p-3">
            <CollapsibleText text={rawResponse} maxLines={30} label="Raw" />
          </div>
        </details>
      )}

      {/* Error */}
      {step.status === 'failed' && step.errorMessage && (
        <div className="flex gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-500 text-sm font-bold text-white">
            !
          </div>
          <div className="min-w-0 flex-1 rounded-lg rounded-tl-none border border-red-300 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
            <div className="mb-1 text-xs font-medium text-red-600 dark:text-red-400">Error</div>
            <pre className="whitespace-pre-wrap break-words text-sm text-red-700 dark:text-red-300">
              {step.errorMessage}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

// User-friendly display of parsed step outputs
function StepOutputSummary({
  stepName,
  data,
}: {
  stepName: string
  data: Record<string, unknown>
}): React.JSX.Element {
  if (stepName === 'classify') {
    return (
      <div className="space-y-1 text-sm">
        <div className="flex gap-4">
          <span className="text-[var(--muted-foreground)]">複雑度:</span>
          <span className="font-medium">{String(data.complexity ?? '-')}</span>
          <span className="text-[var(--muted-foreground)]">Bloom:</span>
          <span className="font-medium">L{String(data.bloomLevel ?? '-')}</span>
        </div>
        <div className="flex gap-4">
          <span className="text-[var(--muted-foreground)]">調査必要:</span>
          <span className="font-medium">{data.investigationNeeded ? 'はい' : 'いいえ'}</span>
        </div>
        {Array.isArray(data.investigationHints) && data.investigationHints.length > 0 && (
          <div>
            <span className="text-[var(--muted-foreground)]">調査ヒント: </span>
            <span>{data.investigationHints.join(', ')}</span>
          </div>
        )}
        {typeof data.estimatedScope === 'string' && data.estimatedScope && (
          <div>
            <span className="text-[var(--muted-foreground)]">影響範囲: </span>
            <span>{data.estimatedScope}</span>
          </div>
        )}
      </div>
    )
  }

  if (stepName === 'investigate') {
    const files = Array.isArray(data.relevantFiles) ? data.relevantFiles : []
    const stack = Array.isArray(data.techStack) ? data.techStack : []
    return (
      <div className="space-y-2 text-sm">
        {stack.length > 0 && (
          <div>
            <span className="text-[var(--muted-foreground)]">技術スタック: </span>
            <span>{stack.join(', ')}</span>
          </div>
        )}
        {files.length > 0 && (
          <div>
            <div className="text-[var(--muted-foreground)]">関連ファイル ({files.length}件):</div>
            <ul className="ml-4 list-disc">
              {files.slice(0, 8).map((f: any, i: number) => (
                <li key={i} className="text-xs">
                  <code className="text-[var(--primary)]">{f.path}</code>
                  <span className="text-[var(--muted-foreground)]"> — {f.reason}</span>
                </li>
              ))}
              {files.length > 8 && (
                <li className="text-xs text-[var(--muted-foreground)]">...他 {files.length - 8} ファイル</li>
              )}
            </ul>
          </div>
        )}
      </div>
    )
  }

  if (stepName === 'plan') {
    const sections = Array.isArray(data.sectionPlan) ? data.sectionPlan : []
    const findings = Array.isArray(data.keyFindings) ? data.keyFindings : []
    return (
      <div className="space-y-2 text-sm">
        <div className="flex gap-4">
          <span className="text-[var(--muted-foreground)]">アプローチ:</span>
          <span className="font-medium">{String(data.approach ?? '-')}</span>
          <span className="text-[var(--muted-foreground)]">生成モデル:</span>
          <span className="font-medium">{String(data.modelForGeneration ?? '-')}</span>
        </div>
        {typeof data.titleGuidance === 'string' && data.titleGuidance && (
          <div>
            <span className="text-[var(--muted-foreground)]">タイトル方針: </span>
            <span>{data.titleGuidance}</span>
          </div>
        )}
        {sections.length > 0 && (
          <div>
            <div className="text-[var(--muted-foreground)]">セクション計画:</div>
            <ul className="ml-4 list-disc">
              {sections.map((s: any, i: number) => (
                <li key={i} className="text-xs">
                  <strong>{s.section}</strong>: {s.guidance}
                </li>
              ))}
            </ul>
          </div>
        )}
        {findings.length > 0 && (
          <div>
            <div className="text-[var(--muted-foreground)]">重要な発見:</div>
            <ul className="ml-4 list-disc">
              {findings.map((f: any, i: number) => (
                <li key={i} className="text-xs">{String(f)}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  if (stepName === 'generate') {
    return (
      <div className="space-y-2 text-sm">
        <div>
          <span className="text-[var(--muted-foreground)]">タイトル: </span>
          <span className="font-medium">{String(data.title ?? '-')}</span>
        </div>
        {typeof data.body === 'string' && data.body && (
          <details>
            <summary className="cursor-pointer text-xs text-[var(--muted-foreground)]">
              本文を表示
            </summary>
            <div className="mt-1 rounded border border-[var(--border)] bg-[var(--muted)] p-2">
              <CollapsibleText text={String(data.body)} maxLines={20} label="本文" />
            </div>
          </details>
        )}
      </div>
    )
  }

  if (stepName === 'qc') {
    const issues = Array.isArray(data.issues) ? data.issues : []
    const suggestions = Array.isArray(data.suggestions) ? data.suggestions : []
    return (
      <div className="space-y-2 text-sm">
        <div className="flex gap-4">
          <span className="text-[var(--muted-foreground)]">合格:</span>
          <span className={`font-medium ${data.passed ? 'text-green-600' : 'text-red-600'}`}>
            {data.passed ? 'PASS' : 'FAIL'}
          </span>
          <span className="text-[var(--muted-foreground)]">スコア:</span>
          <span className="font-medium">{String(data.score ?? '-')}/100</span>
        </div>
        {issues.length > 0 && (
          <div>
            <div className="text-[var(--muted-foreground)]">指摘事項:</div>
            <ul className="ml-4 space-y-0.5">
              {issues.map((issue: any, i: number) => (
                <li key={i} className="flex items-start gap-1.5 text-xs">
                  <span className={`mt-0.5 inline-block h-2 w-2 rounded-full ${
                    issue.severity === 'critical' ? 'bg-red-500' :
                    issue.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                  }`} />
                  <span>{issue.message}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {suggestions.length > 0 && (
          <div>
            <div className="text-[var(--muted-foreground)]">改善提案:</div>
            <ul className="ml-4 list-disc">
              {suggestions.map((s: any, i: number) => (
                <li key={i} className="text-xs">{String(s)}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  // Fallback: show raw JSON
  return (
    <CollapsibleText
      text={JSON.stringify(data, null, 2)}
      maxLines={15}
      label="結果"
    />
  )
}

export function PipelineViewerPage(): React.JSX.Element {
  const { repoId, draftId } = useParams({ from: '/repos/$repoId/pipeline/$draftId' })
  const numericDraftId = Number(draftId)
  const { data: draft } = useDraftById(numericDraftId)

  // Determine if pipeline is still running
  const isRunning = draft?.status === 'generating' || draft?.status === 'investigating'
  const { data: steps, isLoading } = usePipelineSteps(numericDraftId, true)

  // Auto-scroll to the latest active step
  const bottomRef = useRef<HTMLDivElement>(null)
  const prevStepCount = useRef(0)
  useEffect(() => {
    if (!steps) return
    // Scroll when a new step appears or when a step changes status
    const completedCount = steps.filter((s) => s.status === 'completed' || s.status === 'failed').length
    if (completedCount > prevStepCount.current) {
      prevStepCount.current = completedCount
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [steps])

  const hasAnyData = steps && steps.length > 0

  return (
    <section className="flex h-full flex-col">
      <header className="mb-4 flex items-center gap-3">
        <Link
          to={`/repos/${repoId}`}
          className="rounded-md px-2 py-1 text-sm text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
        >
          &#x2190; ボード
        </Link>
        <h2 className="text-xl font-bold text-[var(--foreground)]">
          AI パイプライン会話
        </h2>
        {draft && (
          <span className="truncate text-sm text-[var(--muted-foreground)]">
            — {draft.title || '無題'}
          </span>
        )}
        {isRunning && (
          <span className="flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
            実行中
          </span>
        )}
      </header>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-[var(--muted)]" />
          ))}
        </div>
      ) : !hasAnyData ? (
        <div className="flex flex-1 items-center justify-center text-[var(--muted-foreground)]">
          パイプラインデータがありません
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Timeline */}
          <div className="relative ml-6">
            {/* Vertical line */}
            <div className="absolute left-0 top-0 bottom-0 w-px bg-[var(--border)]" />

            {steps!.map((step, idx) => (
              <div key={step.id} className="relative mb-6 pl-8">
                {/* Timeline dot */}
                <div
                  className={`absolute -left-[5px] top-1 h-[10px] w-[10px] rounded-full border-2 border-[var(--background)] ${
                    step.status === 'completed'
                      ? 'bg-green-500'
                      : step.status === 'failed'
                        ? 'bg-red-500'
                        : step.status === 'running'
                          ? 'bg-blue-500 animate-pulse'
                          : step.status === 'skipped'
                            ? 'bg-gray-400'
                            : 'bg-gray-300'
                  }`}
                />

                {/* Step card */}
                <div className={`rounded-lg border bg-[var(--card)] ${
                  step.status === 'running'
                    ? 'border-blue-300 shadow-sm shadow-blue-100 dark:border-blue-700 dark:shadow-blue-900/20'
                    : 'border-[var(--border)]'
                }`}>
                  {/* Step header */}
                  <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
                    <span className="text-lg" aria-hidden="true">
                      {STEP_ICONS[step.stepName] ?? '\u{2699}'}
                    </span>
                    <div className="flex-1">
                      <span className="font-semibold text-[var(--foreground)]">
                        Step {step.stepNumber}: {STEP_LABELS[step.stepName] ?? step.stepName}
                      </span>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[step.status] ?? ''}`}>
                      {step.status === 'running' ? (
                        <span className="flex items-center gap-1">
                          <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          実行中
                        </span>
                      ) : step.status}
                    </span>
                    {step.durationMs != null && (
                      <span className="text-xs tabular-nums text-[var(--muted-foreground)]">
                        {formatDuration(step.durationMs)}
                      </span>
                    )}
                  </div>

                  {/* Conversation */}
                  <div className="px-4">
                    <StepConversation step={step} />
                  </div>

                  {/* Running indicator: waiting for AI response */}
                  {step.status === 'running' && (step.inputSummary as any)?.prompt && (
                    <div className="border-t border-[var(--border)] px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-bold text-[var(--primary-foreground)]">
                          AI
                        </div>
                        <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                          <span className="inline-flex gap-0.5">
                            <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                            <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                            <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                          </span>
                          <span>Claude が考えています</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Arrow between steps */}
                {idx < steps!.length - 1 && (
                  <div className="my-2 flex justify-center text-[var(--muted-foreground)]">
                    &#x25BC;
                  </div>
                )}
              </div>
            ))}

            {/* Auto-scroll anchor */}
            <div ref={bottomRef} />
          </div>
        </div>
      )}
    </section>
  )
}

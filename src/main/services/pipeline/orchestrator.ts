import { spawn } from 'child_process'
import { writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { getShellEnv } from '../shell-env'
import { repositoryQueries, draftQueries, settingsQueries } from '../../db/queries'
import { pipelineStepQueries } from '../../db/queries'
import type {
  AiPipelineInput,
  PipelineStepName,
  PipelineSettings,
  ClassificationResult,
  InvestigationResult,
  PlanResult,
  GenerateResult,
  QcResult,
  PipelineStep,
} from './types'
import { DEFAULT_PIPELINE_SETTINGS, STEP_TIMEOUTS } from './types'
import { getModelFlagForStep } from './model-router'
import { buildClassifyPrompt, parseClassifyResponse } from './steps/classify'
import { runInvestigation } from './steps/investigate'
import { buildPlanPrompt, parsePlanResponse } from './steps/plan'
import { buildGeneratePrompt, parseGenerateResponse } from './steps/generate'
import { buildQcPrompt, parseQcResponse } from './steps/qc'
import { updateKnowledgeFromInvestigation } from '../knowledge-base'

// Active pipelines for cancellation
const activePipelines = new Map<number, AbortController>()

// Extract <reasoning> block from Claude's response
function extractReasoning(raw: string): string | null {
  const match = raw.match(/<reasoning>([\s\S]*?)<\/reasoning>/)
  return match ? match[1].trim() : null
}

function callClaudeCliWithModel(prompt: string, modelFlag: string, timeout: number, signal?: AbortSignal): Promise<string> {
  const tmpFile = join(tmpdir(), `ai-pipeline-prompt-${Date.now()}.txt`)
  writeFileSync(tmpFile, prompt, 'utf-8')

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      try { unlinkSync(tmpFile) } catch { /* ignore */ }
      reject(new Error('Pipeline cancelled'))
      return
    }

    const env = getShellEnv()
    const proc = spawn('sh', ['-c', `claude -p --output-format text --model "${modelFlag}" --tools "" < "${tmpFile}"`], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout,
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
    proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString() })

    const abortHandler = () => {
      proc.kill('SIGTERM')
      reject(new Error('Pipeline cancelled'))
    }

    signal?.addEventListener('abort', abortHandler, { once: true })

    proc.on('close', (code) => {
      signal?.removeEventListener('abort', abortHandler)
      try { unlinkSync(tmpFile) } catch { /* ignore */ }

      if (signal?.aborted) {
        reject(new Error('Pipeline cancelled'))
      } else if (code !== 0) {
        reject(new Error(`claude CLI error (exit ${code}): ${stderr || stdout.slice(0, 200) || 'no output'}`))
      } else {
        resolve(stdout)
      }
    })

    proc.on('error', (err) => {
      signal?.removeEventListener('abort', abortHandler)
      try { unlinkSync(tmpFile) } catch { /* ignore */ }
      reject(new Error(`claude CLI spawn error: ${err.message}`))
    })
  })
}

function getPipelineSettings(db: BetterSQLite3Database): PipelineSettings {
  const raw = settingsQueries.get(db, 'pipeline_settings')
  if (raw) {
    try {
      return { ...DEFAULT_PIPELINE_SETTINGS, ...JSON.parse(raw) }
    } catch {
      // ignore
    }
  }
  return DEFAULT_PIPELINE_SETTINGS
}

export async function runPipeline(
  db: BetterSQLite3Database,
  draftId: number,
  input: AiPipelineInput,
  aiMode: 'mock' | 'claude-cli'
): Promise<void> {
  const abortController = new AbortController()
  activePipelines.set(draftId, abortController)
  const signal = abortController.signal

  const settings = getPipelineSettings(db)

  // Get repository info
  const repo = repositoryQueries.getById(db, input.repositoryId)

  const stepNames: PipelineStepName[] = ['classify', 'investigate', 'plan', 'generate', 'qc']

  // Initialize pipeline steps
  for (let i = 0; i < stepNames.length; i++) {
    pipelineStepQueries.create(db, {
      draftId,
      stepNumber: i + 1,
      stepName: stepNames[i],
    })
  }

  // Update draft status
  draftQueries.update(db, draftId, {
    status: 'investigating' as any,
  })

  let classification: ClassificationResult | null = null
  let investigation: InvestigationResult | null = null
  let plan: PlanResult | null = null
  let generated: GenerateResult | null = null

  try {
    // Step 1: Classify
    classification = await runStep(db, draftId, 1, 'classify', signal, async (sp) => {
      if (aiMode === 'mock') {
        return {
          complexity: 'moderate' as const,
          bloomLevel: 3,
          investigationNeeded: !!repo?.localPath,
          investigationHints: [input.description.split(/\s+/)[0]],
          suggestedLabels: [input.templateSlug],
          estimatedScope: 'Mock classification',
        }
      }

      const prompt = buildClassifyPrompt(input)
      sp(prompt)
      const modelFlag = getModelFlagForStep('classify', settings)
      const rawResponse = await callClaudeCliWithModel(prompt, modelFlag, STEP_TIMEOUTS.classify, signal)
      return { result: parseClassifyResponse(rawResponse), rawResponse }
    })

    // Step 2: Investigate (may skip)
    if (classification.investigationNeeded && repo) {
      investigation = await runStep(db, draftId, 2, 'investigate', signal, async () => {
        return runInvestigation(input, classification!, repo.localPath, repo.fullName)
      })
    } else {
      pipelineStepQueries.updateStatus(db, draftId, 2, 'skipped')
    }

    // Step 3: Plan
    plan = await runStep(db, draftId, 3, 'plan', signal, async (sp) => {
      if (aiMode === 'mock') {
        return {
          approach: 'standard' as const,
          titleGuidance: `[${input.templateSlug === 'bug' ? 'Bug' : input.templateSlug === 'feature' ? 'Feature' : 'Improvement'}] `,
          sectionPlan: [
            { section: '概要', guidance: '入力説明を拡張' },
            { section: '実装計画', guidance: '調査結果に基づくステップ' },
          ],
          keyFindings: investigation?.relevantFiles.map((f) => `Found: ${f.path}`) ?? [],
          modelForGeneration: 'opus' as const,
        }
      }

      const prompt = buildPlanPrompt(input, classification!, investigation)
      sp(prompt)
      const modelFlag = getModelFlagForStep('plan', settings, classification!.complexity)
      const rawResponse = await callClaudeCliWithModel(prompt, modelFlag, STEP_TIMEOUTS.plan, signal)
      return { result: parsePlanResponse(rawResponse), rawResponse }
    })

    // Step 4: Generate
    generated = await runStep(db, draftId, 4, 'generate', signal, async (sp) => {
      if (aiMode === 'mock') {
        return generateMockResult(input, classification!, investigation, plan!)
      }

      const prompt = buildGeneratePrompt(input, classification!, investigation, plan!)
      sp(prompt)
      const modelFlag = getModelFlagForStep('generate', settings, classification!.complexity)
      const rawResponse = await callClaudeCliWithModel(prompt, modelFlag, STEP_TIMEOUTS.generate, signal)
      return { result: parseGenerateResponse(rawResponse), rawResponse }
    })

    // Step 5: QC
    const qcResult = await runStep<QcResult>(db, draftId, 5, 'qc', signal, async (sp) => {
      if (aiMode === 'mock') {
        return {
          passed: true,
          score: 85,
          issues: [],
          suggestions: ['Mock QC passed'],
        }
      }

      const prompt = buildQcPrompt(input, classification!, investigation, generated!)
      sp(prompt)
      const modelFlag = getModelFlagForStep('qc', settings)
      const rawResponse = await callClaudeCliWithModel(prompt, modelFlag, STEP_TIMEOUTS.qc, signal)
      return { result: parseQcResponse(rawResponse), rawResponse }
    })

    // Incremental knowledge accumulation
    if (investigation && repo) {
      try {
        updateKnowledgeFromInvestigation(
          repo.fullName,
          investigation.relevantFiles,
          investigation.codeSnippets,
          repo.localPath
        )
      } catch { /* non-critical, don't fail pipeline */ }
    }

    // Apply QC revisions if any
    const finalTitle = qcResult.revisedTitle || generated.title
    const finalBody = qcResult.revisedBody || generated.body

    // If QC failed with score < 60 and we have a critical issue, retry generate once
    if (!qcResult.passed && qcResult.score < 60) {
      // Retry Step 4 once
      const retryGenerated = await runStep(db, draftId, 4, 'generate', signal, async (sp) => {
        if (aiMode === 'mock') {
          return generateMockResult(input, classification!, investigation, plan!)
        }
        const prompt = buildGeneratePrompt(input, classification!, investigation, plan!)
        sp(prompt)
        const modelFlag = getModelFlagForStep('generate', settings, classification!.complexity)
        const rawResponse = await callClaudeCliWithModel(prompt, modelFlag, STEP_TIMEOUTS.generate, signal)
        return { result: parseGenerateResponse(rawResponse), rawResponse }
      })

      // Update draft with retry result
      draftQueries.update(db, draftId, {
        title: retryGenerated.title,
        body: retryGenerated.body,
        status: 'ai_generated',
        aiModel: `pipeline (${classification.complexity})`,
        qcScore: qcResult.score,
      } as any)
    } else {
      // Update draft with final result
      draftQueries.update(db, draftId, {
        title: finalTitle,
        body: finalBody,
        status: 'ai_generated',
        aiModel: `pipeline (${classification.complexity})`,
        qcScore: qcResult.score,
      } as any)
    }
  } catch (err) {
    if (signal.aborted) {
      draftQueries.update(db, draftId, {
        status: 'draft',
        body: 'パイプラインがキャンセルされました',
      })
    } else {
      const message = err instanceof Error ? err.message : String(err)
      draftQueries.update(db, draftId, {
        status: 'draft',
        body: `パイプラインエラー: ${message}`,
      })
    }
  } finally {
    activePipelines.delete(draftId)
  }
}

// Extended return type for steps that call Claude CLI
interface StepResultWithTrace<T> {
  result: T
  prompt?: string
  rawResponse?: string
  reasoning?: string | null
}

function isTraced<T>(val: T | StepResultWithTrace<T>): val is StepResultWithTrace<T> {
  return val !== null && typeof val === 'object' && 'result' in (val as any)
    && ('prompt' in (val as any) || 'rawResponse' in (val as any))
}

type StorePromptFn = (prompt: string) => void

async function runStep<T>(
  db: BetterSQLite3Database,
  draftId: number,
  stepNumber: number,
  stepName: PipelineStepName,
  signal: AbortSignal,
  execute: (storePrompt: StorePromptFn) => Promise<T | StepResultWithTrace<T>>
): Promise<T> {
  if (signal.aborted) throw new Error('Pipeline cancelled')

  const startTime = Date.now()
  pipelineStepQueries.updateStatus(db, draftId, stepNumber, 'running')

  // Update draft current step
  draftQueries.update(db, draftId, {
    // @ts-ignore -- pipelineCurrentStep is a new column
    pipelineCurrentStep: stepNumber,
  } as any)

  // Callback to store prompt immediately (before Claude responds)
  const storePrompt: StorePromptFn = (prompt: string) => {
    pipelineStepQueries.updateInputSummary(db, draftId, stepNumber, { prompt })
  }

  try {
    const raw = await execute(storePrompt)
    const durationMs = Date.now() - startTime

    let result: T
    let outputData: Record<string, unknown>

    if (isTraced(raw)) {
      result = raw.result
      const reasoning = raw.rawResponse ? extractReasoning(raw.rawResponse) : null
      outputData = {
        ...(result as any),
        _rawResponse: raw.rawResponse ?? null,
        _reasoning: reasoning,
      }
    } else {
      result = raw
      outputData = result as any
    }

    pipelineStepQueries.complete(db, draftId, stepNumber, {
      outputData,
      durationMs,
      modelUsed: stepName,
    })

    return result
  } catch (err) {
    const durationMs = Date.now() - startTime
    const message = err instanceof Error ? err.message : String(err)

    pipelineStepQueries.fail(db, draftId, stepNumber, message, durationMs)
    throw err
  }
}

function generateMockResult(
  input: AiPipelineInput,
  classification: ClassificationResult,
  investigation: InvestigationResult | null,
  plan: PlanResult
): GenerateResult {
  const prefix =
    input.templateSlug === 'bug' ? '[Bug] ' :
    input.templateSlug === 'feature' ? '[Feature] ' : '[Improvement] '

  const desc = input.description.trim()
  const titleBody = desc.split(/[.!?\n]/)[0].trim()
  const title = prefix + (titleBody.length > 70 ? titleBody.slice(0, 67) + '...' : titleBody)

  const sections: string[] = []
  sections.push(`## 概要\n${input.description}`)
  sections.push(`## 複雑度\n${classification.complexity} (Bloom L${classification.bloomLevel})`)

  if (investigation && investigation.techStack.length > 0) {
    sections.push(`## 技術スタック\n${investigation.techStack.join(', ')}`)
  }

  if (investigation && investigation.relevantFiles.length > 0) {
    sections.push(
      `## 関連ファイル\n${investigation.relevantFiles
        .slice(0, 5)
        .map((f) => `- \`${f.path}\`: ${f.reason}`)
        .join('\n')}`
    )
  }

  if (plan.keyFindings.length > 0) {
    sections.push(`## 調査結果\n${plan.keyFindings.map((f) => `- ${f}`).join('\n')}`)
  }

  if (input.generationMode === 'ai_doc') {
    sections.push(`## 実装計画\n### Phase 1: 調査\n- [ ] 関連コードの確認\n- [ ] 影響範囲の特定\n\n### Phase 2: 実装\n- [ ] コード変更\n- [ ] テスト追加\n\n### Phase 3: 検証\n- [ ] 動作確認\n- [ ] レビュー依頼`)
  }

  sections.push(`## 受け入れ条件\n- [ ] 説明通りに動作する\n- [ ] テストが追加されている\n- [ ] 既存テストが壊れていない`)

  return {
    title,
    body: sections.join('\n\n'),
  }
}

export function cancelPipeline(draftId: number): boolean {
  const controller = activePipelines.get(draftId)
  if (controller) {
    controller.abort()
    return true
  }
  return false
}

export function getPipelineSteps(db: BetterSQLite3Database, draftId: number): PipelineStep[] {
  return pipelineStepQueries.listByDraft(db, draftId) as PipelineStep[]
}

export function retryPipelineFrom(
  db: BetterSQLite3Database,
  draftId: number,
  _stepNumber: number,
  input: AiPipelineInput,
  aiMode: 'mock' | 'claude-cli'
): void {
  // For simplicity, restart the full pipeline
  // TODO: implement partial retry using saved step outputs
  runPipeline(db, draftId, input, aiMode)
}

import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { draftQueries } from '../../db/queries'
import { pipelineStepQueries } from '../../db/queries'
import type { AiPipelineInput, PipelineStepName } from './types'

const STEP_DELAYS: Record<PipelineStepName, number> = {
  classify: 500,
  investigate: 1500,
  plan: 1000,
  generate: 2000,
  qc: 800,
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Mock pipeline for testing and E2E.
 * Simulates all 5 steps with realistic delays.
 */
export async function runMockPipeline(
  db: BetterSQLite3Database,
  draftId: number,
  input: AiPipelineInput
): Promise<void> {
  const stepNames: PipelineStepName[] = ['classify', 'investigate', 'plan', 'generate', 'qc']

  // Initialize steps
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

  try {
    // Step 1: Classify
    await runMockStep(db, draftId, 1, 'classify', () => ({
      complexity: 'moderate',
      bloomLevel: 3,
      investigationNeeded: true,
      investigationHints: ['component', 'handler'],
      suggestedLabels: [input.templateSlug],
      estimatedScope: 'モック分類結果',
    }))

    // Step 2: Investigate
    await runMockStep(db, draftId, 2, 'investigate', () => ({
      repoStructure: ['src/', 'src/main/', 'src/renderer/'],
      relevantFiles: [
        { path: 'src/main/services/ai-service.ts', reason: 'AI service implementation' },
      ],
      codeSnippets: [],
      techStack: ['TypeScript', 'Electron', 'React'],
      relatedIssues: [],
    }))

    // Step 3: Plan
    await runMockStep(db, draftId, 3, 'plan', () => ({
      approach: 'standard',
      titleGuidance: `[${input.templateSlug}] `,
      sectionPlan: [
        { section: '概要', guidance: '入力を反映' },
        { section: '実装計画', guidance: '段階的に' },
      ],
      keyFindings: ['関連ファイル発見'],
      modelForGeneration: 'opus',
    }))

    // Step 4: Generate
    const prefix =
      input.templateSlug === 'bug' ? '[Bug] ' :
      input.templateSlug === 'feature' ? '[Feature] ' : '[Improvement] '

    const titleBody = input.description.split(/[.!?\n]/)[0].trim()
    const title = prefix + (titleBody.length > 70 ? titleBody.slice(0, 67) + '...' : titleBody)

    const body = `## 概要\n${input.description}\n\n## 技術スタック\nTypeScript, Electron, React\n\n## 関連ファイル\n- \`src/main/services/ai-service.ts\`: AI service implementation\n\n## 実装計画\n### Phase 1: 調査\n- [ ] 関連コードの確認\n- [ ] 影響範囲の特定\n\n### Phase 2: 実装\n- [ ] コード変更\n- [ ] テスト追加\n\n## 受け入れ条件\n- [ ] 説明通りに動作する\n- [ ] テストが追加されている`

    await runMockStep(db, draftId, 4, 'generate', () => ({
      title,
      body,
    }))

    // Step 5: QC
    await runMockStep(db, draftId, 5, 'qc', () => ({
      passed: true,
      score: 85,
      issues: [],
      suggestions: ['テスト用モック: 品質チェック通過'],
    }))

    // Update draft
    draftQueries.update(db, draftId, {
      title,
      body,
      status: 'ai_generated',
      aiModel: 'mock-pipeline',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    draftQueries.update(db, draftId, {
      status: 'draft',
      body: `モックパイプラインエラー: ${message}`,
    })
  }
}

async function runMockStep<T>(
  db: BetterSQLite3Database,
  draftId: number,
  stepNumber: number,
  stepName: PipelineStepName,
  produce: () => T
): Promise<T> {
  pipelineStepQueries.updateStatus(db, draftId, stepNumber, 'running')

  draftQueries.update(db, draftId, {
    // @ts-ignore
    pipelineCurrentStep: stepNumber,
  } as any)

  const startTime = Date.now()
  await sleep(STEP_DELAYS[stepName])

  const result = produce()
  const durationMs = Date.now() - startTime

  pipelineStepQueries.complete(db, draftId, stepNumber, {
    outputData: result as any,
    durationMs,
    modelUsed: `mock-${stepName}`,
  })

  return result
}

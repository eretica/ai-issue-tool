// Pipeline types for multi-agent investigation pipeline

export type PipelineStepName = 'classify' | 'investigate' | 'plan' | 'generate' | 'qc'

export type PipelineStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

export type GenerationStrategy = 'pipeline' | 'simple' | 'external_agent'

export type ComplexityLevel = 'simple' | 'moderate' | 'complex'

export type ModelTier = 'haiku' | 'sonnet' | 'opus'

export interface PipelineStep {
  id: number
  draftId: number
  stepNumber: number
  stepName: PipelineStepName
  status: PipelineStepStatus
  modelUsed: string | null
  inputSummary: Record<string, unknown> | null
  outputData: Record<string, unknown> | null
  tokensUsed: number | null
  durationMs: number | null
  errorMessage: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
}

// Step 1: Classification output
export interface ClassificationResult {
  complexity: ComplexityLevel
  bloomLevel: number
  investigationNeeded: boolean
  investigationHints: string[]
  suggestedLabels: string[]
  estimatedScope: string
}

// Step 2: Investigation output
export interface InvestigationResult {
  repoStructure: string[]
  relevantFiles: Array<{ path: string; reason: string }>
  codeSnippets: Array<{ path: string; content: string; startLine: number }>
  techStack: string[]
  relatedIssues: string[]
  knowledgeBase?: string
}

// Step 3: Plan output
export interface PlanResult {
  approach: 'standard' | 'deep_analysis' | 'external_agent'
  titleGuidance: string
  sectionPlan: Array<{ section: string; guidance: string }>
  keyFindings: string[]
  modelForGeneration: ModelTier
  externalAgentConfig?: ExternalAgentConfig
}

// Step 4: Generate output
export interface GenerateResult {
  title: string
  body: string
}

// Step 5: QC output
export interface QcResult {
  passed: boolean
  score: number
  issues: Array<{ severity: 'critical' | 'warning' | 'info'; message: string }>
  suggestions: string[]
  revisedTitle?: string
  revisedBody?: string
}

// External agent configuration
export interface ExternalAgentConfig {
  type: 'claude-skill' | 'custom-command'
  command: string
  inputFormat: 'json' | 'markdown'
  timeout: number
}

// Pipeline input (extends AiGenerateInput)
export interface AiPipelineInput {
  templateSlug: string
  description: string
  generationMode: 'ai_doc' | 'human_doc'
  repositoryId: number
  targetPage?: string
  figmaUrl?: string
  figmaFrame?: string
  designNotes?: string
  relatedIssues?: string[]
  contextUrls?: string[]
}

// Pipeline settings (stored as JSON in settings table)
export interface PipelineSettings {
  enableByDefault: boolean
  models: Record<PipelineStepName, ModelTier>
  externalAgent?: ExternalAgentConfig
}

export const DEFAULT_PIPELINE_SETTINGS: PipelineSettings = {
  enableByDefault: false,
  models: {
    classify: 'haiku',
    investigate: 'sonnet',
    plan: 'sonnet',
    generate: 'opus',
    qc: 'sonnet',
  },
}

// Step timeouts in ms
export const STEP_TIMEOUTS: Record<PipelineStepName, number> = {
  classify: 120000,    // 2 min
  investigate: 300000, // 5 min
  plan: 300000,        // 5 min
  generate: 300000,    // 5 min
  qc: 300000,          // 5 min
}

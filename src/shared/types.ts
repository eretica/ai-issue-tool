// Shared types between main and renderer processes

// ============ Domain Types ============

export interface Repository {
  id: number
  owner: string
  name: string
  fullName: string
  defaultBranch: string
  localPath: string | null
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface DirectoryPickerResult {
  owner: string
  name: string
  fullName: string
  defaultBranch: string
  localPath: string
}

export interface Label {
  id: number
  repositoryId: number
  githubId: number | null
  name: string
  color: string | null
  description: string | null
  syncedAt: string | null
}

export interface Template {
  id: number
  name: string
  slug: string
  description: string | null
  systemPrompt: string
  bodyTemplate: string
  defaultLabels: string[]
  isBuiltIn: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type DraftStatus = 'draft' | 'generating' | 'investigating' | 'ai_generated' | 'reviewed' | 'published' | 'archived'

export interface Draft {
  id: number
  repositoryId: number
  templateId: number | null
  title: string
  body: string
  status: DraftStatus
  inputDescription: string | null
  inputTargetPage: string | null
  inputFigmaUrl: string | null
  inputFigmaFrame: string | null
  inputDesignNotes: string | null
  inputRelatedIssues: string[]
  inputContextUrls: string[]
  assignees: string[]
  githubIssueNumber: number | null
  githubIssueUrl: string | null
  publishedAt: string | null
  aiModel: string | null
  aiTokensUsed: number | null
  pipelineCurrentStep: number | null
  pipelineTotalSteps: number | null
  generationStrategy: 'pipeline' | 'simple' | 'external_agent' | null
  qcScore: number | null
  createdAt: string
  updatedAt: string
}

export type PipelineStepName = 'classify' | 'investigate' | 'plan' | 'generate' | 'qc'
export type PipelineStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

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

export interface Attachment {
  id: number
  draftId: number
  type: 'screenshot' | 'figma_export' | 'pdf' | 'context_file'
  fileName: string
  filePath: string
  mimeType: string | null
  fileSize: number | null
  githubUrl: string | null
  createdAt: string
}

export interface PublishedIssue {
  id: number
  draftId: number | null
  repositoryId: number
  githubIssueNumber: number
  githubIssueUrl: string
  title: string
  state: 'open' | 'closed'
  lastSyncedAt: string | null
  publishedAt: string
}

// ============ Knowledge Base ============

export interface KnowledgeStatus {
  exists: boolean
  meta: {
    repoFullName: string
    lastFullScanAt: string | null
    lastFullScanCommit: string | null
    lastIncrementalAt: string | null
    lastIncrementalCommit: string | null
    moduleCount: number
    profileVersion: number
  } | null
  profile: string | null
  moduleNames: string[]
  currentCommit: string | null
  commitsBehind: number | null
}

export interface ScanProgress {
  phase: 'collecting' | 'analyzing' | 'profiling' | 'done' | 'error'
  totalModules: number
  completedModules: number
  currentModule: string | null
  error: string | null
}

// ============ IPC Channel Types ============

export interface IpcChannels {
  // Repository
  'repo:list': { args: void; result: Repository[] }
  'repo:getById': { args: { id: number }; result: Repository | null }
  'repo:create': { args: Omit<Repository, 'id' | 'createdAt' | 'updatedAt'>; result: Repository }
  'repo:delete': { args: { id: number }; result: void }
  'repo:setDefault': { args: { id: number }; result: void }

  // Dialog
  'dialog:openDirectory': { args: void; result: DirectoryPickerResult | null }

  // Label
  'label:listByRepo': { args: { repositoryId: number }; result: Label[] }
  'label:sync': { args: { repositoryId: number }; result: Label[] }

  // Template
  'template:list': { args: void; result: Template[] }
  'template:getBySlug': { args: { slug: string }; result: Template | null }

  // Draft
  'draft:list': { args: { repositoryId?: number; status?: DraftStatus }; result: Draft[] }
  'draft:getById': { args: { id: number }; result: Draft | null }
  'draft:create': { args: DraftCreateInput; result: Draft }
  'draft:update': { args: { id: number } & Partial<DraftCreateInput>; result: Draft }
  'draft:delete': { args: { id: number }; result: void }

  // AI Generation
  'ai:generate': { args: AiGenerateInput; result: AiGenerateResult }
  'ai:generatePipeline': {
    args: { draftId: number; input: AiPipelineInput }
    result: { started: boolean }
  }

  // Pipeline
  'pipeline:getSteps': { args: { draftId: number }; result: PipelineStep[] }
  'pipeline:cancel': { args: { draftId: number }; result: { cancelled: boolean } }

  // GitHub Publishing
  'github:publish': { args: { draftId: number }; result: PublishedIssue }

  // Settings
  'settings:get': { args: { key: string }; result: string | null }
  'settings:set': { args: { key: string; value: string }; result: void }

  // Knowledge Base
  'knowledge:status': { args: { repoId: number }; result: KnowledgeStatus | null }
  'knowledge:scan': { args: { repoId: number }; result: { started: boolean } }
  'knowledge:scanProgress': { args: { repoFullName: string }; result: ScanProgress | null }
}

// ============ Input Types ============

export interface DraftCreateInput {
  repositoryId: number
  templateId?: number
  title: string
  body: string
  status?: DraftStatus
  inputDescription?: string
  inputTargetPage?: string
  inputFigmaUrl?: string
  inputFigmaFrame?: string
  inputDesignNotes?: string
  inputRelatedIssues?: string[]
  inputContextUrls?: string[]
  assignees?: string[]
  labelIds?: number[]
}

export type GenerationMode = 'ai_doc' | 'human_doc'

export interface AiGenerateInput {
  templateSlug: string
  description: string
  generationMode: GenerationMode
  targetPage?: string
  figmaUrl?: string
  figmaFrame?: string
  designNotes?: string
  relatedIssues?: string[]
  contextUrls?: string[]
}

export interface AiGenerateResult {
  title: string
  body: string
  model: string
  tokensUsed: number
}

export interface AiPipelineInput {
  templateSlug: string
  description: string
  generationMode: GenerationMode
  repositoryId: number
  targetPage?: string
  figmaUrl?: string
  figmaFrame?: string
  designNotes?: string
  relatedIssues?: string[]
  contextUrls?: string[]
}

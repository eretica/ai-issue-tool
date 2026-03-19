import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  AiGenerateInput,
  AiGenerateResult,
  AiPipelineInput,
  DirectoryPickerResult,
  Draft,
  DraftCreateInput,
  DraftStatus,
  KnowledgeStatus,
  Label,
  PipelineStep,
  PublishedIssue,
  Repository,
  ScanProgress,
  Template
} from '../shared/types'

interface ApiRepo {
  list(): Promise<Repository[]>
  getById(id: number): Promise<Repository | null>
  create(data: Omit<Repository, 'id' | 'createdAt' | 'updatedAt'>): Promise<Repository>
  delete(id: number): Promise<void>
  setDefault(id: number): Promise<void>
}

interface ApiLabel {
  listByRepo(repositoryId: number): Promise<Label[]>
  sync(repositoryId: number): Promise<Label[]>
}

interface ApiTemplate {
  list(): Promise<Template[]>
  getBySlug(slug: string): Promise<Template | null>
}

interface ApiDraft {
  list(repositoryId?: number, status?: DraftStatus): Promise<Draft[]>
  getById(id: number): Promise<Draft | null>
  create(data: DraftCreateInput): Promise<Draft>
  update(id: number, data: Partial<DraftCreateInput>): Promise<Draft>
  delete(id: number): Promise<void>
}

interface ApiAi {
  generate(input: AiGenerateInput): Promise<AiGenerateResult>
  generateForDraft(draftId: number, input: AiGenerateInput): Promise<{ started: boolean }>
  generatePipeline(draftId: number, input: AiPipelineInput): Promise<{ started: boolean }>
}

interface ApiPipeline {
  getSteps(draftId: number): Promise<PipelineStep[]>
  cancel(draftId: number): Promise<{ cancelled: boolean }>
}

interface ApiGitHub {
  publish(draftId: number): Promise<PublishedIssue>
}

interface ApiSettings {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
}

interface ApiDialog {
  openDirectory(): Promise<DirectoryPickerResult | null>
}

interface ApiKnowledge {
  status(repoId: number): Promise<KnowledgeStatus | null>
  scan(repoId: number): Promise<{ started: boolean }>
  scanProgress(repoFullName: string): Promise<ScanProgress | null>
}

interface ApiDb {
  dump(): Promise<Record<string, unknown[]>>
}

interface Api {
  repo: ApiRepo
  label: ApiLabel
  template: ApiTemplate
  draft: ApiDraft
  ai: ApiAi
  pipeline: ApiPipeline
  github: ApiGitHub
  settings: ApiSettings
  knowledge: ApiKnowledge
  dialog: ApiDialog
  db: ApiDb
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}

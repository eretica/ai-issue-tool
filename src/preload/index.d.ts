import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  AiGenerateInput,
  AiGenerateResult,
  Draft,
  DraftCreateInput,
  DraftStatus,
  Label,
  PublishedIssue,
  Repository,
  Template
} from '../shared/types'

interface ApiRepo {
  list(): Promise<Repository[]>
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
  list(status?: DraftStatus): Promise<Draft[]>
  getById(id: number): Promise<Draft | null>
  create(data: DraftCreateInput): Promise<Draft>
  update(id: number, data: Partial<DraftCreateInput>): Promise<Draft>
  delete(id: number): Promise<void>
}

interface ApiAi {
  generate(input: AiGenerateInput): Promise<AiGenerateResult>
}

interface ApiGitHub {
  publish(draftId: number): Promise<PublishedIssue>
}

interface ApiSettings {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
}

interface Api {
  repo: ApiRepo
  label: ApiLabel
  template: ApiTemplate
  draft: ApiDraft
  ai: ApiAi
  github: ApiGitHub
  settings: ApiSettings
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}

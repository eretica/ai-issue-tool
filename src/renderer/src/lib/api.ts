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
  Template,
} from '@shared/types'
import { mockStore } from './mock-store'

// ============ Check if running in Electron ============

function getElectronApi(): Window['api'] | null {
  if (typeof window !== 'undefined' && window.api) {
    return window.api
  }
  return null
}

// ============ Exported API ============

export const api = {
  repo: {
    list: async (): Promise<Repository[]> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.repo.list()
      return mockStore.repo.list()
    },
    getById: async (id: number): Promise<Repository | null> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.repo.getById(id)
      return mockStore.repo.getById(id)
    },
    create: async (
      data: Omit<Repository, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<Repository> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.repo.create(data)
      return mockStore.repo.create(data)
    },
    delete: async (id: number): Promise<void> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.repo.delete(id)
      mockStore.repo.delete(id)
    },
    setDefault: async (id: number): Promise<void> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.repo.setDefault(id)
      mockStore.repo.setDefault(id)
    },
  },

  label: {
    listByRepo: async (repositoryId: number): Promise<Label[]> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.label.listByRepo(repositoryId)
      return mockStore.label.listByRepo(repositoryId)
    },
    sync: async (repositoryId: number): Promise<Label[]> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.label.sync(repositoryId)
      return mockStore.label.sync(repositoryId)
    },
  },

  template: {
    list: async (): Promise<Template[]> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.template.list()
      return mockStore.template.list()
    },
    getBySlug: async (slug: string): Promise<Template | null> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.template.getBySlug(slug)
      return mockStore.template.getBySlug(slug)
    },
  },

  draft: {
    list: async (repositoryId?: number, status?: DraftStatus): Promise<Draft[]> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.draft.list(repositoryId, status)
      return mockStore.draft.list(repositoryId, status)
    },
    getById: async (id: number): Promise<Draft | null> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.draft.getById(id)
      return mockStore.draft.getById(id)
    },
    create: async (data: DraftCreateInput): Promise<Draft> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.draft.create(data)
      return mockStore.draft.create(data)
    },
    update: async (id: number, data: Partial<DraftCreateInput>): Promise<Draft> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.draft.update(id, data)
      return mockStore.draft.update(id, data)
    },
    delete: async (id: number): Promise<void> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.draft.delete(id)
      mockStore.draft.delete(id)
    },
  },

  ai: {
    generate: async (input: AiGenerateInput): Promise<AiGenerateResult> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.ai.generate(input)
      return mockStore.ai.generate(input)
    },
    generateForDraft: async (draftId: number, input: AiGenerateInput): Promise<{ started: boolean }> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.ai.generateForDraft(draftId, input)
      // Mock: generate synchronously and update draft
      const result = await mockStore.ai.generate(input)
      const draft = mockStore.draft.getById(draftId)
      if (draft) {
        mockStore.draft.update(draftId, {
          title: result.title,
          body: result.body,
          status: 'ai_generated',
        })
      }
      return { started: true }
    },
    generatePipeline: async (draftId: number, input: AiPipelineInput): Promise<{ started: boolean }> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.ai.generatePipeline(draftId, input)
      // Mock: same as simple generation
      const result = await mockStore.ai.generate(input as any)
      const draft = mockStore.draft.getById(draftId)
      if (draft) {
        mockStore.draft.update(draftId, {
          title: result.title,
          body: result.body,
          status: 'ai_generated',
        })
      }
      return { started: true }
    },
  },

  pipeline: {
    getSteps: async (draftId: number): Promise<PipelineStep[]> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.pipeline.getSteps(draftId)
      return []
    },
    cancel: async (draftId: number): Promise<{ cancelled: boolean }> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.pipeline.cancel(draftId)
      return { cancelled: false }
    },
  },

  github: {
    publish: async (draftId: number): Promise<PublishedIssue> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.github.publish(draftId)
      return mockStore.github.publish(draftId)
    },
    list: async (repositoryId?: number): Promise<PublishedIssue[]> => {
      return mockStore.github.list(repositoryId)
    },
  },

  settings: {
    get: async (key: string): Promise<string | null> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.settings.get(key)
      return mockStore.settings.get(key)
    },
    set: async (key: string, value: string): Promise<void> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.settings.set(key, value)
      mockStore.settings.set(key, value)
    },
  },

  knowledge: {
    status: async (repoId: number): Promise<KnowledgeStatus | null> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.knowledge.status(repoId)
      return null
    },
    scan: async (repoId: number): Promise<{ started: boolean }> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.knowledge.scan(repoId)
      return { started: false }
    },
    scanProgress: async (repoFullName: string): Promise<ScanProgress | null> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.knowledge.scanProgress(repoFullName)
      return null
    },
  },

  dialog: {
    openDirectory: async (): Promise<DirectoryPickerResult | null> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.dialog.openDirectory()
      // Browser mock: return null (manual input fallback)
      return null
    },
  },

  db: {
    dump: async (): Promise<Record<string, unknown[]>> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.db.dump()
      // Browser mock: return mock store data
      return mockStore.db.dump()
    },
  },
}

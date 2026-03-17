import type {
  AiGenerateInput,
  AiGenerateResult,
  Draft,
  DraftCreateInput,
  DraftStatus,
  Label,
  PublishedIssue,
  Repository,
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
    list: async (status?: DraftStatus): Promise<Draft[]> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.draft.list(status)
      return mockStore.draft.list(status)
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
  },

  github: {
    publish: async (draftId: number): Promise<PublishedIssue> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.github.publish(draftId)
      return mockStore.github.publish(draftId)
    },
    list: async (): Promise<PublishedIssue[]> => {
      // Published issues list - not in IPC yet, use mock store
      return mockStore.github.list()
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
}

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
} from '@shared/types'

// ============ Mock fallback data for non-Electron environments ============

const MOCK_REPOSITORIES: Repository[] = [
  {
    id: 1,
    owner: 'example',
    name: 'my-app',
    fullName: 'example/my-app',
    defaultBranch: 'main',
    isDefault: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  }
]

const MOCK_TEMPLATES: Template[] = [
  {
    id: 1,
    name: 'Bug Report',
    slug: 'bug',
    description: 'Report a bug',
    systemPrompt: 'You are a bug report generator.',
    bodyTemplate: '## Bug Report\n\n### Description\n\n### Steps to Reproduce\n\n### Expected Behavior',
    defaultLabels: ['bug'],
    isBuiltIn: true,
    sortOrder: 1,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  },
  {
    id: 2,
    name: 'Feature Request',
    slug: 'feature',
    description: 'Request a new feature',
    systemPrompt: 'You are a feature request generator.',
    bodyTemplate: '## Feature Request\n\n### Summary\n\n### Motivation\n\n### Proposed Solution',
    defaultLabels: ['enhancement'],
    isBuiltIn: true,
    sortOrder: 2,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  },
  {
    id: 3,
    name: 'Improvement',
    slug: 'improvement',
    description: 'Suggest an improvement',
    systemPrompt: 'You are an improvement suggestion generator.',
    bodyTemplate: '## Improvement\n\n### Current Behavior\n\n### Proposed Improvement\n\n### Benefits',
    defaultLabels: ['enhancement'],
    isBuiltIn: true,
    sortOrder: 3,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  }
]

const MOCK_LABELS: Label[] = [
  { id: 1, repositoryId: 1, githubId: 1, name: 'bug', color: 'd73a4a', description: "Something isn't working", syncedAt: null },
  { id: 2, repositoryId: 1, githubId: 2, name: 'enhancement', color: 'a2eeef', description: 'New feature or request', syncedAt: null },
  { id: 3, repositoryId: 1, githubId: 3, name: 'documentation', color: '0075ca', description: 'Improvements or additions to documentation', syncedAt: null }
]

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
      return [...MOCK_REPOSITORIES]
    },
    create: async (
      data: Omit<Repository, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<Repository> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.repo.create(data)
      return {
        ...data,
        id: MOCK_REPOSITORIES.length + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    },
    delete: async (id: number): Promise<void> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.repo.delete(id)
    },
    setDefault: async (id: number): Promise<void> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.repo.setDefault(id)
    }
  },

  label: {
    listByRepo: async (repositoryId: number): Promise<Label[]> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.label.listByRepo(repositoryId)
      return MOCK_LABELS.filter((l) => l.repositoryId === repositoryId)
    },
    sync: async (repositoryId: number): Promise<Label[]> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.label.sync(repositoryId)
      return MOCK_LABELS.filter((l) => l.repositoryId === repositoryId)
    }
  },

  template: {
    list: async (): Promise<Template[]> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.template.list()
      return [...MOCK_TEMPLATES]
    },
    getBySlug: async (slug: string): Promise<Template | null> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.template.getBySlug(slug)
      return MOCK_TEMPLATES.find((t) => t.slug === slug) ?? null
    }
  },

  draft: {
    list: async (status?: DraftStatus): Promise<Draft[]> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.draft.list(status)
      return []
    },
    getById: async (id: number): Promise<Draft | null> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.draft.getById(id)
      return null
    },
    create: async (data: DraftCreateInput): Promise<Draft> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.draft.create(data)
      return {
        id: 1,
        repositoryId: data.repositoryId,
        templateId: data.templateId ?? null,
        title: data.title,
        body: data.body,
        status: data.status ?? 'draft',
        inputDescription: data.inputDescription ?? null,
        inputTargetPage: data.inputTargetPage ?? null,
        inputFigmaUrl: data.inputFigmaUrl ?? null,
        inputFigmaFrame: data.inputFigmaFrame ?? null,
        inputDesignNotes: data.inputDesignNotes ?? null,
        inputRelatedIssues: data.inputRelatedIssues ?? [],
        inputContextUrls: data.inputContextUrls ?? [],
        assignees: data.assignees ?? [],
        githubIssueNumber: null,
        githubIssueUrl: null,
        publishedAt: null,
        aiModel: null,
        aiTokensUsed: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    },
    update: async (id: number, data: Partial<DraftCreateInput>): Promise<Draft> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.draft.update(id, data)
      throw new Error('Not available outside Electron')
    },
    delete: async (id: number): Promise<void> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.draft.delete(id)
    }
  },

  ai: {
    generate: async (input: AiGenerateInput): Promise<AiGenerateResult> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.ai.generate(input)
      // Fallback mock for browser dev
      return {
        title: `[Mock] ${input.description.slice(0, 50)}`,
        body: `## Mock Generated\n\n${input.description}`,
        model: 'mock-browser',
        tokensUsed: 0
      }
    }
  },

  github: {
    publish: async (draftId: number): Promise<PublishedIssue> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.github.publish(draftId)
      return {
        id: 1,
        draftId,
        repositoryId: 1,
        githubIssueNumber: 1,
        githubIssueUrl: 'https://github.com/example/my-app/issues/1',
        title: 'Mock Published Issue',
        state: 'open',
        lastSyncedAt: null,
        publishedAt: new Date().toISOString()
      }
    }
  },

  settings: {
    get: async (key: string): Promise<string | null> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.settings.get(key)
      return null
    },
    set: async (key: string, value: string): Promise<void> => {
      const electronApi = getElectronApi()
      if (electronApi) return electronApi.settings.set(key, value)
    }
  }
}

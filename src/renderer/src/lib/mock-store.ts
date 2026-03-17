import type {
  Draft,
  DraftCreateInput,
  DraftStatus,
  Label,
  PublishedIssue,
  Repository,
  Template,
} from '@shared/types'

// In-memory store for non-Electron environments (dev server, Vitest, Playwright)

let nextId = 100

function genId(): number {
  return nextId++
}

function now(): string {
  return new Date().toISOString()
}

const SEED_REPOSITORIES: Repository[] = [
  {
    id: 1,
    owner: 'example',
    name: 'my-app',
    fullName: 'example/my-app',
    defaultBranch: 'main',
    isDefault: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 2,
    owner: 'example',
    name: 'api-server',
    fullName: 'example/api-server',
    defaultBranch: 'main',
    isDefault: false,
    createdAt: '2025-01-15T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z',
  },
]

const SEED_TEMPLATES: Template[] = [
  {
    id: 1,
    name: 'バグ報告',
    slug: 'bug',
    description: 'バグを報告するテンプレート',
    systemPrompt: 'You are a bug report generator.',
    bodyTemplate:
      '## バグ報告\n\n### 概要\n\n### 再現手順\n\n1. \n\n### 期待する動作\n\n### 実際の動作\n\n### 環境',
    defaultLabels: ['bug'],
    isBuiltIn: true,
    sortOrder: 1,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: '機能要望',
    slug: 'feature',
    description: '新機能の要望テンプレート',
    systemPrompt: 'You are a feature request generator.',
    bodyTemplate:
      '## 機能要望\n\n### 概要\n\n### 動機\n\n### 提案する解決策\n\n### 代替案\n\n### 追加情報',
    defaultLabels: ['enhancement'],
    isBuiltIn: true,
    sortOrder: 2,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 3,
    name: '改善提案',
    slug: 'improvement',
    description: '既存機能の改善提案テンプレート',
    systemPrompt: 'You are an improvement suggestion generator.',
    bodyTemplate:
      '## 改善提案\n\n### 現在の動作\n\n### 提案する改善\n\n### メリット\n\n### 考慮事項',
    defaultLabels: ['enhancement'],
    isBuiltIn: true,
    sortOrder: 3,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
]

const SEED_LABELS: Label[] = [
  { id: 1, repositoryId: 1, githubId: 1, name: 'bug', color: 'd73a4a', description: "Something isn't working", syncedAt: null },
  { id: 2, repositoryId: 1, githubId: 2, name: 'enhancement', color: 'a2eeef', description: 'New feature or request', syncedAt: null },
  { id: 3, repositoryId: 1, githubId: 3, name: 'documentation', color: '0075ca', description: 'Improvements or additions to documentation', syncedAt: null },
  { id: 4, repositoryId: 1, githubId: 4, name: 'good first issue', color: '7057ff', description: 'Good for newcomers', syncedAt: null },
  { id: 5, repositoryId: 2, githubId: 5, name: 'bug', color: 'd73a4a', description: "Something isn't working", syncedAt: null },
  { id: 6, repositoryId: 2, githubId: 6, name: 'enhancement', color: 'a2eeef', description: 'New feature or request', syncedAt: null },
]

interface MockState {
  repositories: Repository[]
  templates: Template[]
  labels: Label[]
  drafts: Draft[]
  publishedIssues: PublishedIssue[]
  settings: Record<string, string>
}

let state: MockState = createInitialState()

function createInitialState(): MockState {
  return {
    repositories: [...SEED_REPOSITORIES],
    templates: [...SEED_TEMPLATES],
    labels: [...SEED_LABELS],
    drafts: [],
    publishedIssues: [],
    settings: {},
  }
}

let issueCounter = 0

export const mockStore = {
  reset(): void {
    state = createInitialState()
    nextId = 100
    issueCounter = 0
  },

  // Repository
  repo: {
    list(): Repository[] {
      return [...state.repositories]
    },
    create(data: Omit<Repository, 'id' | 'createdAt' | 'updatedAt'>): Repository {
      const repo: Repository = {
        ...data,
        id: genId(),
        createdAt: now(),
        updatedAt: now(),
      }
      state.repositories.push(repo)
      return repo
    },
    delete(id: number): void {
      state.repositories = state.repositories.filter((r) => r.id !== id)
    },
    setDefault(id: number): void {
      state.repositories = state.repositories.map((r) => ({
        ...r,
        isDefault: r.id === id,
      }))
    },
  },

  // Label
  label: {
    listByRepo(repositoryId: number): Label[] {
      return state.labels.filter((l) => l.repositoryId === repositoryId)
    },
    sync(repositoryId: number): Label[] {
      return state.labels.filter((l) => l.repositoryId === repositoryId)
    },
  },

  // Template
  template: {
    list(): Template[] {
      return [...state.templates]
    },
    getBySlug(slug: string): Template | null {
      return state.templates.find((t) => t.slug === slug) ?? null
    },
  },

  // Draft
  draft: {
    list(status?: DraftStatus): Draft[] {
      let result = [...state.drafts]
      if (status) {
        result = result.filter((d) => d.status === status)
      }
      return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },
    getById(id: number): Draft | null {
      return state.drafts.find((d) => d.id === id) ?? null
    },
    create(data: DraftCreateInput): Draft {
      const draft: Draft = {
        id: genId(),
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
        createdAt: now(),
        updatedAt: now(),
      }
      state.drafts.push(draft)
      return draft
    },
    update(id: number, data: Partial<DraftCreateInput>): Draft {
      const idx = state.drafts.findIndex((d) => d.id === id)
      if (idx === -1) throw new Error(`Draft ${id} not found`)
      const existing = state.drafts[idx]
      const updated: Draft = {
        ...existing,
        ...data,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: now(),
        templateId: data.templateId !== undefined ? (data.templateId ?? null) : existing.templateId,
        inputDescription: data.inputDescription !== undefined ? (data.inputDescription ?? null) : existing.inputDescription,
        inputTargetPage: data.inputTargetPage !== undefined ? (data.inputTargetPage ?? null) : existing.inputTargetPage,
        inputFigmaUrl: data.inputFigmaUrl !== undefined ? (data.inputFigmaUrl ?? null) : existing.inputFigmaUrl,
        inputFigmaFrame: data.inputFigmaFrame !== undefined ? (data.inputFigmaFrame ?? null) : existing.inputFigmaFrame,
        inputDesignNotes: data.inputDesignNotes !== undefined ? (data.inputDesignNotes ?? null) : existing.inputDesignNotes,
        inputRelatedIssues: data.inputRelatedIssues ?? existing.inputRelatedIssues,
        inputContextUrls: data.inputContextUrls ?? existing.inputContextUrls,
        assignees: data.assignees ?? existing.assignees,
      }
      state.drafts[idx] = updated
      return updated
    },
    delete(id: number): void {
      state.drafts = state.drafts.filter((d) => d.id !== id)
    },
  },

  // AI
  ai: {
    generate(input: { templateSlug: string; description: string }): {
      title: string
      body: string
      model: string
      tokensUsed: number
    } {
      const template = state.templates.find((t) => t.slug === input.templateSlug)
      const templateName = template?.name ?? input.templateSlug
      return {
        title: `[${templateName}] ${input.description.slice(0, 60)}`,
        body: template
          ? template.bodyTemplate.replace('### 概要\n', `### 概要\n${input.description}\n`)
          : `## ${templateName}\n\n${input.description}`,
        model: 'mock-browser',
        tokensUsed: 150,
      }
    },
  },

  // GitHub publish
  github: {
    publish(draftId: number): PublishedIssue {
      const draft = state.drafts.find((d) => d.id === draftId)
      if (!draft) throw new Error(`Draft ${draftId} not found`)

      issueCounter++
      const repo = state.repositories.find((r) => r.id === draft.repositoryId)
      const repoFullName = repo?.fullName ?? 'example/my-app'

      // Update draft status
      const draftIdx = state.drafts.findIndex((d) => d.id === draftId)
      if (draftIdx !== -1) {
        state.drafts[draftIdx] = {
          ...state.drafts[draftIdx],
          status: 'published',
          githubIssueNumber: issueCounter,
          githubIssueUrl: `https://github.com/${repoFullName}/issues/${issueCounter}`,
          publishedAt: now(),
          updatedAt: now(),
        }
      }

      const published: PublishedIssue = {
        id: genId(),
        draftId,
        repositoryId: draft.repositoryId,
        githubIssueNumber: issueCounter,
        githubIssueUrl: `https://github.com/${repoFullName}/issues/${issueCounter}`,
        title: draft.title,
        state: 'open',
        lastSyncedAt: null,
        publishedAt: now(),
      }
      state.publishedIssues.push(published)
      return published
    },
    list(): PublishedIssue[] {
      return [...state.publishedIssues].sort((a, b) =>
        b.publishedAt.localeCompare(a.publishedAt)
      )
    },
  },

  // Settings
  settings: {
    get(key: string): string | null {
      return state.settings[key] ?? null
    },
    set(key: string, value: string): void {
      state.settings[key] = value
    },
  },
}

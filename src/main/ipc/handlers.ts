import { ipcMain } from 'electron'
import type { AiGenerateInput, DraftCreateInput, DraftStatus, IpcChannels } from '@shared/types'
import { createAiService } from '../services/ai-service'
import { createGitHubService } from '../services/github-service'

// Query function types (implemented by another agent in ../db/queries)
export interface QueryFunctions {
  // Repository
  listRepositories(): unknown[]
  createRepository(data: IpcChannels['repo:create']['args']): unknown
  deleteRepository(id: number): void
  setDefaultRepository(id: number): void

  // Label
  listLabelsByRepo(repositoryId: number): unknown[]
  syncLabels(repositoryId: number, labels: unknown[]): unknown[]

  // Template
  listTemplates(): unknown[]
  getTemplateBySlug(slug: string): unknown | null

  // Draft
  listDrafts(status?: DraftStatus): unknown[]
  getDraftById(id: number): unknown | null
  createDraft(data: DraftCreateInput): unknown
  updateDraft(id: number, data: Partial<DraftCreateInput>): unknown
  deleteDraft(id: number): void

  // Published Issue
  createPublishedIssue(data: unknown): unknown

  // Settings
  getSetting(key: string): string | null
  setSetting(key: string, value: string): void
}

interface IpcError {
  error: true
  message: string
  code?: string
}

function makeError(err: unknown): IpcError {
  if (err instanceof Error) {
    return { error: true, message: err.message }
  }
  return { error: true, message: String(err) }
}

/**
 * Try to import query functions from ../db/queries.
 * Returns null if the module is not yet available (being developed by another agent).
 */
function tryLoadQueries(): QueryFunctions | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('../db/queries') as QueryFunctions
  } catch {
    return null
  }
}

export function registerIpcHandlers(db?: unknown): void {
  const queries = tryLoadQueries()
  const aiService = createAiService()
  const githubService = createGitHubService()

  // ============ Repository ============

  ipcMain.handle('repo:list', async () => {
    try {
      if (!queries) return []
      return queries.listRepositories()
    } catch (err) {
      return makeError(err)
    }
  })

  ipcMain.handle('repo:create', async (_event, args: IpcChannels['repo:create']['args']) => {
    try {
      if (!queries) throw new Error('Database not initialized')
      return queries.createRepository(args)
    } catch (err) {
      return makeError(err)
    }
  })

  ipcMain.handle('repo:delete', async (_event, args: { id: number }) => {
    try {
      if (!queries) throw new Error('Database not initialized')
      queries.deleteRepository(args.id)
    } catch (err) {
      return makeError(err)
    }
  })

  ipcMain.handle('repo:setDefault', async (_event, args: { id: number }) => {
    try {
      if (!queries) throw new Error('Database not initialized')
      queries.setDefaultRepository(args.id)
    } catch (err) {
      return makeError(err)
    }
  })

  // ============ Label ============

  ipcMain.handle('label:listByRepo', async (_event, args: { repositoryId: number }) => {
    try {
      if (!queries) return []
      return queries.listLabelsByRepo(args.repositoryId)
    } catch (err) {
      return makeError(err)
    }
  })

  ipcMain.handle('label:sync', async (_event, args: { repositoryId: number }) => {
    try {
      // Fetch labels from GitHub (mock) and sync to DB
      const repo = queries
        ? (queries.listRepositories().find((r: unknown) => {
            const repo = r as { id: number; fullName: string }
            return repo.id === args.repositoryId
          }) as { fullName: string } | undefined)
        : undefined
      const repoName = repo?.fullName || 'owner/repo'
      const githubLabels = await githubService.fetchLabels(repoName)

      if (queries) {
        return queries.syncLabels(args.repositoryId, githubLabels)
      }
      return githubLabels
    } catch (err) {
      return makeError(err)
    }
  })

  // ============ Template ============

  ipcMain.handle('template:list', async () => {
    try {
      if (!queries) return []
      return queries.listTemplates()
    } catch (err) {
      return makeError(err)
    }
  })

  ipcMain.handle('template:getBySlug', async (_event, args: { slug: string }) => {
    try {
      if (!queries) return null
      return queries.getTemplateBySlug(args.slug)
    } catch (err) {
      return makeError(err)
    }
  })

  // ============ Draft ============

  ipcMain.handle('draft:list', async (_event, args: { status?: DraftStatus }) => {
    try {
      if (!queries) return []
      return queries.listDrafts(args?.status)
    } catch (err) {
      return makeError(err)
    }
  })

  ipcMain.handle('draft:getById', async (_event, args: { id: number }) => {
    try {
      if (!queries) return null
      return queries.getDraftById(args.id)
    } catch (err) {
      return makeError(err)
    }
  })

  ipcMain.handle(
    'draft:create',
    async (_event, args: DraftCreateInput) => {
      try {
        if (!queries) throw new Error('Database not initialized')
        return queries.createDraft(args)
      } catch (err) {
        return makeError(err)
      }
    }
  )

  ipcMain.handle(
    'draft:update',
    async (_event, args: { id: number } & Partial<DraftCreateInput>) => {
      try {
        if (!queries) throw new Error('Database not initialized')
        const { id, ...data } = args
        return queries.updateDraft(id, data)
      } catch (err) {
        return makeError(err)
      }
    }
  )

  ipcMain.handle('draft:delete', async (_event, args: { id: number }) => {
    try {
      if (!queries) throw new Error('Database not initialized')
      queries.deleteDraft(args.id)
    } catch (err) {
      return makeError(err)
    }
  })

  // ============ AI Generation ============

  ipcMain.handle('ai:generate', async (_event, args: AiGenerateInput) => {
    try {
      return await aiService.generate(args)
    } catch (err) {
      return makeError(err)
    }
  })

  // ============ GitHub Publishing ============

  ipcMain.handle('github:publish', async (_event, args: { draftId: number }) => {
    try {
      if (!queries) throw new Error('Database not initialized')

      const draft = queries.getDraftById(args.draftId) as {
        id: number
        repositoryId: number
        title: string
        body: string
        assignees: string[]
      } | null
      if (!draft) throw new Error(`Draft ${args.draftId} not found`)

      const repo = queries
        .listRepositories()
        .find((r: unknown) => (r as { id: number }).id === draft.repositoryId) as
        | { id: number; fullName: string }
        | undefined
      if (!repo) throw new Error(`Repository for draft ${args.draftId} not found`)

      const labels = queries
        .listLabelsByRepo(draft.repositoryId)
        .map((l: unknown) => (l as { name: string }).name)

      const result = await githubService.publishIssue(
        repo.fullName,
        draft.title,
        draft.body,
        labels,
        draft.assignees || []
      )

      const publishedIssue = queries.createPublishedIssue({
        draftId: draft.id,
        repositoryId: draft.repositoryId,
        githubIssueNumber: result.number,
        githubIssueUrl: result.url,
        title: draft.title,
        state: 'open',
        publishedAt: new Date().toISOString()
      })

      return publishedIssue
    } catch (err) {
      return makeError(err)
    }
  })

  // ============ Settings ============

  ipcMain.handle('settings:get', async (_event, args: { key: string }) => {
    try {
      if (!queries) return null
      return queries.getSetting(args.key)
    } catch (err) {
      return makeError(err)
    }
  })

  ipcMain.handle('settings:set', async (_event, args: { key: string; value: string }) => {
    try {
      if (!queries) throw new Error('Database not initialized')
      queries.setSetting(args.key, args.value)
    } catch (err) {
      return makeError(err)
    }
  })
}

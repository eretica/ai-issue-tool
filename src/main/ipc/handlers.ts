import { ipcMain } from 'electron'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type { AiGenerateInput, DraftCreateInput, DraftStatus, IpcChannels } from '@shared/types'
import {
  repositoryQueries,
  labelQueries,
  templateQueries,
  draftQueries,
  publishedIssueQueries,
  settingsQueries,
} from '../db/queries'
import { createAiService } from '../services/ai-service'
import { createGitHubService } from '../services/github-service'

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

export function registerIpcHandlers(db: BetterSQLite3Database): void {
  const aiService = createAiService()
  const githubService = createGitHubService()

  // ============ Repository ============

  ipcMain.handle('repo:list', async () => {
    try {
      return repositoryQueries.list(db)
    } catch (err) {
      return makeError(err)
    }
  })

  ipcMain.handle('repo:create', async (_event, args: IpcChannels['repo:create']['args']) => {
    try {
      return repositoryQueries.create(db, args)
    } catch (err) {
      return makeError(err)
    }
  })

  ipcMain.handle('repo:delete', async (_event, args: { id: number }) => {
    try {
      repositoryQueries.delete(db, args.id)
    } catch (err) {
      return makeError(err)
    }
  })

  ipcMain.handle('repo:setDefault', async (_event, args: { id: number }) => {
    try {
      repositoryQueries.setDefault(db, args.id)
    } catch (err) {
      return makeError(err)
    }
  })

  // ============ Label ============

  ipcMain.handle('label:listByRepo', async (_event, args: { repositoryId: number }) => {
    try {
      return labelQueries.listByRepo(db, args.repositoryId)
    } catch (err) {
      return makeError(err)
    }
  })

  ipcMain.handle('label:sync', async (_event, args: { repositoryId: number }) => {
    try {
      // Find the repository to get its fullName for the GitHub API call
      const repos = repositoryQueries.list(db)
      const repo = repos.find((r) => r.id === args.repositoryId)
      const repoName = repo?.fullName || 'owner/repo'

      // Fetch labels from GitHub (mock)
      const githubLabels = await githubService.fetchLabels(repoName)

      // Sync to DB: map GitHub label format to the syncLabels input format
      const labelsData = githubLabels.map((l) => ({
        githubId: l.id,
        name: l.name,
        color: l.color,
        description: l.description,
      }))

      return labelQueries.syncLabels(db, args.repositoryId, labelsData)
    } catch (err) {
      return makeError(err)
    }
  })

  // ============ Template ============

  ipcMain.handle('template:list', async () => {
    try {
      return templateQueries.list(db)
    } catch (err) {
      return makeError(err)
    }
  })

  ipcMain.handle('template:getBySlug', async (_event, args: { slug: string }) => {
    try {
      return templateQueries.getBySlug(db, args.slug)
    } catch (err) {
      return makeError(err)
    }
  })

  // ============ Draft ============

  ipcMain.handle('draft:list', async (_event, args: { status?: DraftStatus }) => {
    try {
      return draftQueries.list(db, args?.status)
    } catch (err) {
      return makeError(err)
    }
  })

  ipcMain.handle('draft:getById', async (_event, args: { id: number }) => {
    try {
      return draftQueries.getById(db, args.id)
    } catch (err) {
      return makeError(err)
    }
  })

  ipcMain.handle('draft:create', async (_event, args: DraftCreateInput) => {
    try {
      return draftQueries.create(db, args)
    } catch (err) {
      return makeError(err)
    }
  })

  ipcMain.handle(
    'draft:update',
    async (_event, args: { id: number } & Partial<DraftCreateInput>) => {
      try {
        const { id, ...data } = args
        return draftQueries.update(db, id, data)
      } catch (err) {
        return makeError(err)
      }
    }
  )

  ipcMain.handle('draft:delete', async (_event, args: { id: number }) => {
    try {
      draftQueries.delete(db, args.id)
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
      // 1. Get the draft
      const draft = draftQueries.getById(db, args.draftId)
      if (!draft) throw new Error(`Draft ${args.draftId} not found`)

      // 2. Get the repository
      const repos = repositoryQueries.list(db)
      const repo = repos.find((r) => r.id === draft.repositoryId)
      if (!repo) throw new Error(`Repository for draft ${args.draftId} not found`)

      // 3. Get labels for the draft
      const draftLabels = labelQueries.listByRepo(db, draft.repositoryId)
      const labelNames = draftLabels.map((l) => l.name)

      // 4. Call GitHub service to publish
      const result = await githubService.publishIssue(
        repo.fullName,
        draft.title,
        draft.body,
        labelNames,
        (draft.assignees as string[]) || []
      )

      // 5. Update draft status to published
      draftQueries.publish(db, draft.id, {
        githubIssueNumber: result.number,
        githubIssueUrl: result.url,
      })

      // 6. Create a published_issues record
      const publishedIssue = publishedIssueQueries.create(db, {
        draftId: draft.id,
        repositoryId: draft.repositoryId,
        githubIssueNumber: result.number,
        githubIssueUrl: result.url,
        title: draft.title,
        state: 'open',
      })

      // 7. Return the published issue
      return publishedIssue
    } catch (err) {
      return makeError(err)
    }
  })

  // ============ Settings ============

  ipcMain.handle('settings:get', async (_event, args: { key: string }) => {
    try {
      return settingsQueries.get(db, args.key)
    } catch (err) {
      return makeError(err)
    }
  })

  ipcMain.handle('settings:set', async (_event, args: { key: string; value: string }) => {
    try {
      settingsQueries.set(db, args.key, args.value)
    } catch (err) {
      return makeError(err)
    }
  })
}

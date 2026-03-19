import { ipcMain, dialog } from 'electron'
import { execSync } from 'child_process'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type { AiGenerateInput, AiPipelineInput, DraftCreateInput, DraftStatus, IpcChannels } from '@shared/types'
import {
  repositoryQueries,
  labelQueries,
  templateQueries,
  draftQueries,
  publishedIssueQueries,
  settingsQueries,
} from '../db/queries'
import { labels, draftLabels, attachments, pipelineSteps, settings as settingsTable } from '../db/schema'
import { createAiService } from '../services/ai-service'
import { createGitHubService, type GitHubMode } from '../services/github-service'
import { runPipeline, cancelPipeline, getPipelineSteps } from '../services/pipeline/orchestrator'
import { runMockPipeline } from '../services/pipeline/mock-pipeline'
import { getKnowledgeStatus } from '../services/knowledge-base'
import { runFullScan, getScanProgress } from '../services/knowledge-scan'

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

function getGitHubMode(db: BetterSQLite3Database): GitHubMode {
  // E2E tests force mock mode via env
  if (process.env.TEST_FORCE_MOCK === '1') return 'mock'
  const mode = settingsQueries.get(db, 'github_mode')
  return mode === 'mock' ? 'mock' : 'gh-cli'
}

function getAiMode(db: BetterSQLite3Database): 'mock' | 'claude-cli' {
  // E2E tests force mock mode via env
  if (process.env.TEST_FORCE_MOCK === '1') return 'mock'
  const mode = settingsQueries.get(db, 'ai_mode')
  return mode === 'mock' ? 'mock' : 'claude-cli'
}

export function registerIpcHandlers(db: BetterSQLite3Database): void {

  // ============ Repository ============

  ipcMain.handle('repo:list', async () => {
    try {
      return repositoryQueries.list(db)
    } catch (err) {
      return makeError(err)
    }
  })

  ipcMain.handle('repo:getById', async (_event, args: { id: number }) => {
    try {
      return repositoryQueries.getById(db, args.id)
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
      const ghMode = getGitHubMode(db)
      const githubService = createGitHubService(ghMode)

      // Find the repository to get its fullName for the GitHub API call
      const repos = repositoryQueries.list(db)
      const repo = repos.find((r) => r.id === args.repositoryId)
      const repoName = repo?.fullName || 'owner/repo'

      // Fetch labels from GitHub
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

  ipcMain.handle('draft:list', async (_event, args: { repositoryId?: number; status?: DraftStatus }) => {
    try {
      return draftQueries.list(db, args?.repositoryId, args?.status)
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
      const mode = getAiMode(db)
      const aiService = createAiService(mode)
      return await aiService.generate(args)
    } catch (err) {
      return makeError(err)
    }
  })

  ipcMain.handle('ai:generateForDraft', async (_event, args: { draftId: number; input: AiGenerateInput }) => {
    try {
      // Return immediately, generate in background
      const draftId = args.draftId
      const input = args.input

      // Fire and forget
      ;(async () => {
        try {
          const mode = getAiMode(db)
          const aiService = createAiService(mode)
          const result = await aiService.generate(input)
          draftQueries.update(db, draftId, {
            title: result.title,
            body: result.body,
            status: 'ai_generated',
            aiModel: result.model,
            aiTokensUsed: result.tokensUsed,
          })
        } catch (err) {
          // On failure, update status back to draft with error info
          draftQueries.update(db, draftId, {
            status: 'draft',
            body: `AI生成に失敗しました: ${err instanceof Error ? err.message : String(err)}`,
          })
        }
      })()

      return { started: true }
    } catch (err) {
      return makeError(err)
    }
  })

  // ============ Pipeline Generation ============

  ipcMain.handle('ai:generatePipeline', async (_event, args: { draftId: number; input: AiPipelineInput }) => {
    try {
      const draftId = args.draftId
      const input = args.input

      const mode = getAiMode(db)

      // Fire and forget - pipeline runs in background
      if (mode === 'mock' || process.env.TEST_FORCE_MOCK === '1') {
        runMockPipeline(db, draftId, input)
      } else {
        runPipeline(db, draftId, input, mode)
      }

      return { started: true }
    } catch (err) {
      return makeError(err)
    }
  })

  ipcMain.handle('pipeline:getSteps', async (_event, args: { draftId: number }) => {
    try {
      return getPipelineSteps(db, args.draftId)
    } catch (err) {
      return makeError(err)
    }
  })

  ipcMain.handle('pipeline:cancel', async (_event, args: { draftId: number }) => {
    try {
      const cancelled = cancelPipeline(args.draftId)
      if (!cancelled) {
        // Pipeline might already be done, just reset draft status
        draftQueries.update(db, args.draftId, { status: 'draft' })
      }
      return { cancelled: true }
    } catch (err) {
      return makeError(err)
    }
  })

  // ============ GitHub Publishing ============

  ipcMain.handle('github:publish', async (_event, args: { draftId: number }) => {
    try {
      const ghMode = getGitHubMode(db)
      const githubService = createGitHubService(ghMode)

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

  // ============ DB Viewer ============

  ipcMain.handle('db:dump', async () => {
    try {
      return {
        repositories: repositoryQueries.list(db),
        labels: db.select().from(labels).all(),
        templates: templateQueries.list(db),
        drafts: draftQueries.list(db),
        draftLabels: db.select().from(draftLabels).all(),
        attachments: db.select().from(attachments).all(),
        pipelineSteps: db.select().from(pipelineSteps).all(),
        publishedIssues: publishedIssueQueries.list(db),
        settings: db.select().from(settingsTable).all(),
      }
    } catch (err) {
      return makeError(err)
    }
  })

  // ============ Knowledge Base ============

  ipcMain.handle('knowledge:status', async (_event, args: { repoId: number }) => {
    try {
      const repo = repositoryQueries.getById(db, args.repoId)
      if (!repo) return null
      return getKnowledgeStatus(repo.fullName, repo.localPath)
    } catch (err) {
      return makeError(err)
    }
  })

  ipcMain.handle('knowledge:scan', async (_event, args: { repoId: number }) => {
    try {
      const repo = repositoryQueries.getById(db, args.repoId)
      if (!repo) throw new Error('Repository not found')
      if (!repo.localPath) throw new Error('Repository has no local path')

      const mode = getAiMode(db)

      // Fire and forget
      runFullScan(repo.fullName, repo.localPath, mode)

      return { started: true }
    } catch (err) {
      return makeError(err)
    }
  })

  ipcMain.handle('knowledge:scanProgress', async (_event, args: { repoFullName: string }) => {
    try {
      return getScanProgress(args.repoFullName)
    } catch (err) {
      return makeError(err)
    }
  })

  // ============ Dialog ============

  ipcMain.handle('dialog:openDirectory', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'リポジトリのディレクトリを選択',
      })

      if (result.canceled || result.filePaths.length === 0) return null

      const dirPath = result.filePaths[0]

      try {
        const remote = execSync('git remote get-url origin', {
          cwd: dirPath,
          encoding: 'utf-8',
        }).trim()

        // Parse GitHub URL: https://github.com/owner/repo.git or git@github.com:owner/repo.git
        const match = remote.match(/github\.com[:/]([^/]+)\/([^/.]+)/)
        if (!match) return null

        let defaultBranch = 'main'
        try {
          defaultBranch = execSync('git symbolic-ref --short HEAD', {
            cwd: dirPath,
            encoding: 'utf-8',
          }).trim()
        } catch {
          // fallback to 'main'
        }

        return {
          owner: match[1],
          name: match[2],
          fullName: `${match[1]}/${match[2]}`,
          defaultBranch,
          localPath: dirPath,
        }
      } catch {
        return null
      }
    } catch (err) {
      return makeError(err)
    }
  })
}

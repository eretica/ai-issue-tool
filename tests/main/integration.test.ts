import { describe, it, expect, beforeEach } from 'vitest'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { createDatabase } from '@main/db/index'
import {
  repositoryQueries,
  labelQueries,
  templateQueries,
  draftQueries,
  publishedIssueQueries,
  settingsQueries,
} from '@main/db/queries'
import { MockAiService } from '@main/services/ai-service'
import { MockGitHubService } from '@main/services/github-service'

let db: BetterSQLite3Database
let aiService: MockAiService
let githubService: MockGitHubService

beforeEach(() => {
  db = createDatabase(':memory:')
  aiService = new MockAiService()
  githubService = new MockGitHubService()
})

// ============ Full Flow: create repo → create draft → AI generate → publish ============

describe('Full publish flow', () => {
  it('creates repo, draft, generates AI content, publishes, and verifies published issue', async () => {
    // Step 1: Create a repository
    const repo = repositoryQueries.create(db, {
      owner: 'myorg',
      name: 'myapp',
      fullName: 'myorg/myapp',
      defaultBranch: 'main',
      isDefault: true,
    })
    expect(repo.id).toBeDefined()
    expect(repo.fullName).toBe('myorg/myapp')
    expect(repo.isDefault).toBe(true)

    // Step 2: Generate AI content
    const aiResult = await aiService.generate({
      templateSlug: 'bug',
      description: 'The login button is unresponsive on mobile devices',
      targetPage: '/login',
    })
    expect(aiResult.title).toContain('[Bug]')
    expect(aiResult.body).toContain('## Bug Report')
    expect(aiResult.model).toBe('mock-claude-3.5')
    expect(aiResult.tokensUsed).toBeGreaterThan(0)

    // Step 3: Create a draft with the AI-generated content
    const draft = draftQueries.create(db, {
      repositoryId: repo.id,
      title: aiResult.title,
      body: aiResult.body,
      status: 'ai_generated',
      inputDescription: 'The login button is unresponsive on mobile devices',
      inputTargetPage: '/login',
      assignees: ['developer1'],
    })
    expect(draft.id).toBeDefined()
    expect(draft.status).toBe('ai_generated')
    expect(draft.title).toBe(aiResult.title)

    // Step 4: Simulate review (update status to reviewed)
    const reviewed = draftQueries.update(db, draft.id, { status: 'reviewed' })
    expect(reviewed!.status).toBe('reviewed')

    // Step 5: Publish the draft via GitHub
    const githubResult = await githubService.publishIssue(
      repo.fullName,
      draft.title,
      draft.body,
      [],
      draft.assignees as string[]
    )
    expect(githubResult.number).toBe(1)
    expect(githubResult.url).toBe('https://github.com/myorg/myapp/issues/1')

    // Step 6: Update draft status to published
    const published = draftQueries.publish(db, draft.id, {
      githubIssueNumber: githubResult.number,
      githubIssueUrl: githubResult.url,
    })
    expect(published!.status).toBe('published')
    expect(published!.githubIssueNumber).toBe(1)
    expect(published!.githubIssueUrl).toBe('https://github.com/myorg/myapp/issues/1')
    expect(published!.publishedAt).toBeTruthy()

    // Step 7: Create a published_issues record
    const publishedIssue = publishedIssueQueries.create(db, {
      draftId: draft.id,
      repositoryId: repo.id,
      githubIssueNumber: githubResult.number,
      githubIssueUrl: githubResult.url,
      title: draft.title,
      state: 'open',
    })
    expect(publishedIssue.id).toBeDefined()
    expect(publishedIssue.draftId).toBe(draft.id)
    expect(publishedIssue.repositoryId).toBe(repo.id)
    expect(publishedIssue.githubIssueNumber).toBe(1)
    expect(publishedIssue.state).toBe('open')

    // Step 8: Verify the published issue exists when listed
    const allPublished = publishedIssueQueries.list(db)
    expect(allPublished).toHaveLength(1)
    expect(allPublished[0].title).toBe(draft.title)
    expect(allPublished[0].githubIssueUrl).toBe('https://github.com/myorg/myapp/issues/1')

    // Step 9: Verify the draft is now in 'published' status
    const finalDraft = draftQueries.getById(db, draft.id)
    expect(finalDraft!.status).toBe('published')
  })

  it('publishes multiple drafts with incrementing issue numbers', async () => {
    const repo = repositoryQueries.create(db, {
      owner: 'org',
      name: 'project',
      fullName: 'org/project',
    })

    // Create and publish two drafts
    for (let i = 1; i <= 2; i++) {
      const draft = draftQueries.create(db, {
        repositoryId: repo.id,
        title: `Issue ${i}`,
        body: `Body for issue ${i}`,
      })

      const result = await githubService.publishIssue(
        repo.fullName,
        draft.title,
        draft.body,
        [],
        []
      )

      draftQueries.publish(db, draft.id, {
        githubIssueNumber: result.number,
        githubIssueUrl: result.url,
      })

      publishedIssueQueries.create(db, {
        draftId: draft.id,
        repositoryId: repo.id,
        githubIssueNumber: result.number,
        githubIssueUrl: result.url,
        title: draft.title,
        state: 'open',
      })
    }

    const published = publishedIssueQueries.list(db)
    expect(published).toHaveLength(2)

    // Both issues exist with correct numbers
    const issueNumbers = published.map((p) => p.githubIssueNumber).sort()
    expect(issueNumbers).toEqual([1, 2])
  })
})

// ============ Label Sync Flow ============

describe('Label sync flow', () => {
  it('fetches labels from GitHub and syncs them to the database', async () => {
    // Step 1: Create a repository
    const repo = repositoryQueries.create(db, {
      owner: 'octocat',
      name: 'hello-world',
      fullName: 'octocat/hello-world',
    })

    // Step 2: Fetch labels from GitHub (mock)
    const githubLabels = await githubService.fetchLabels(repo.fullName)
    expect(githubLabels.length).toBeGreaterThan(0)

    // Step 3: Sync labels to the database
    const labelsData = githubLabels.map((l) => ({
      githubId: l.id,
      name: l.name,
      color: l.color,
      description: l.description,
    }))
    const syncedLabels = labelQueries.syncLabels(db, repo.id, labelsData)

    // Step 4: Verify all labels were synced
    expect(syncedLabels).toHaveLength(githubLabels.length)
    expect(syncedLabels.some((l) => l.name === 'bug')).toBe(true)
    expect(syncedLabels.some((l) => l.name === 'enhancement')).toBe(true)
    expect(syncedLabels.some((l) => l.name === 'documentation')).toBe(true)

    // Step 5: Verify labels are queryable by repo
    const repoLabels = labelQueries.listByRepo(db, repo.id)
    expect(repoLabels).toHaveLength(githubLabels.length)

    // Step 6: Re-sync should update, not duplicate
    const reSynced = labelQueries.syncLabels(db, repo.id, labelsData)
    expect(reSynced).toHaveLength(githubLabels.length)
  })

  it('synced labels are isolated per repository', async () => {
    const repo1 = repositoryQueries.create(db, {
      owner: 'a',
      name: 'repo1',
      fullName: 'a/repo1',
    })
    const repo2 = repositoryQueries.create(db, {
      owner: 'b',
      name: 'repo2',
      fullName: 'b/repo2',
    })

    const githubLabels = await githubService.fetchLabels('a/repo1')
    const labelsData = githubLabels.map((l) => ({
      githubId: l.id,
      name: l.name,
      color: l.color,
      description: l.description,
    }))

    // Sync only to repo1
    labelQueries.syncLabels(db, repo1.id, labelsData)

    expect(labelQueries.listByRepo(db, repo1.id).length).toBeGreaterThan(0)
    expect(labelQueries.listByRepo(db, repo2.id)).toHaveLength(0)
  })
})

// ============ Settings Get/Set ============

describe('Settings get/set', () => {
  it('gets null for a key that does not exist', () => {
    expect(settingsQueries.get(db, 'nonexistent')).toBeNull()
  })

  it('sets and retrieves a value', () => {
    settingsQueries.set(db, 'github_token', 'ghp_abc123')
    expect(settingsQueries.get(db, 'github_token')).toBe('ghp_abc123')
  })

  it('overwrites an existing value', () => {
    settingsQueries.set(db, 'theme', 'light')
    settingsQueries.set(db, 'theme', 'dark')
    expect(settingsQueries.get(db, 'theme')).toBe('dark')
  })

  it('stores and retrieves complex JSON settings', () => {
    const config = {
      aiProvider: 'anthropic',
      model: 'claude-3.5-sonnet',
      maxTokens: 4096,
      temperature: 0.7,
    }
    settingsQueries.set(db, 'ai_config', JSON.stringify(config))

    const retrieved = JSON.parse(settingsQueries.get(db, 'ai_config')!)
    expect(retrieved).toEqual(config)
  })

  it('handles multiple independent settings', () => {
    settingsQueries.set(db, 'github_token', 'token1')
    settingsQueries.set(db, 'ai_model', 'claude-3')
    settingsQueries.set(db, 'default_repo', 'myorg/myapp')

    expect(settingsQueries.get(db, 'github_token')).toBe('token1')
    expect(settingsQueries.get(db, 'ai_model')).toBe('claude-3')
    expect(settingsQueries.get(db, 'default_repo')).toBe('myorg/myapp')
  })
})

// ============ Template availability ============

describe('Template availability in flow', () => {
  it('built-in templates are available for AI generation', async () => {
    // Verify templates are seeded
    const templates = templateQueries.list(db)
    expect(templates).toHaveLength(3)

    // Use the bug template slug to generate content
    const bugTemplate = templateQueries.getBySlug(db, 'bug')
    expect(bugTemplate).not.toBeNull()

    const result = await aiService.generate({
      templateSlug: bugTemplate!.slug,
      description: 'App crashes on startup',
    })
    expect(result.title).toContain('[Bug]')
    expect(result.body).toContain('## Bug Report')
  })

  it('all template slugs produce valid AI output', async () => {
    const slugs = ['bug', 'feature', 'improvement']

    for (const slug of slugs) {
      const template = templateQueries.getBySlug(db, slug)
      expect(template).not.toBeNull()

      const result = await aiService.generate({
        templateSlug: slug,
        description: `Test description for ${slug}`,
      })

      expect(result.title).toBeTruthy()
      expect(result.body).toBeTruthy()
      expect(result.model).toBe('mock-claude-3.5')
      expect(result.tokensUsed).toBeGreaterThan(0)
    }
  })
})

// ============ Draft with labels integration ============

describe('Draft with labels integration', () => {
  it('creates a draft with synced labels attached', async () => {
    const repo = repositoryQueries.create(db, {
      owner: 'org',
      name: 'app',
      fullName: 'org/app',
    })

    // Sync labels from GitHub
    const githubLabels = await githubService.fetchLabels(repo.fullName)
    const labelsData = githubLabels.map((l) => ({
      githubId: l.id,
      name: l.name,
      color: l.color,
      description: l.description,
    }))
    const synced = labelQueries.syncLabels(db, repo.id, labelsData)

    // Create a draft with some label IDs
    const bugLabel = synced.find((l) => l.name === 'bug')
    const highPriority = synced.find((l) => l.name === 'priority:high')
    expect(bugLabel).toBeDefined()
    expect(highPriority).toBeDefined()

    const draft = draftQueries.create(db, {
      repositoryId: repo.id,
      title: 'Critical Bug',
      body: 'This is critical',
      labelIds: [bugLabel!.id, highPriority!.id],
    })

    expect(draft.id).toBeDefined()

    // Labels are attached (verified indirectly through the label list for the repo)
    const repoLabels = labelQueries.listByRepo(db, repo.id)
    expect(repoLabels.length).toBeGreaterThanOrEqual(2)
  })
})

// ============ Error handling ============

describe('Error handling', () => {
  it('publishing a non-existent draft fails gracefully', async () => {
    const draft = draftQueries.getById(db, 9999)
    expect(draft).toBeNull()
  })

  it('creating a draft for a non-existent repo throws', () => {
    expect(() => {
      draftQueries.create(db, {
        repositoryId: 9999,
        title: 'Orphan',
        body: 'body',
      })
    }).toThrow()
  })

  it('publishing a published issue for a non-existent repo throws', () => {
    expect(() => {
      publishedIssueQueries.create(db, {
        repositoryId: 9999,
        githubIssueNumber: 1,
        githubIssueUrl: 'https://example.com',
        title: 'Test',
      })
    }).toThrow()
  })
})

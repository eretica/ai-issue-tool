import { describe, it, expect, beforeEach } from 'vitest'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { createDatabase } from '@main/db/index'
import {
  repositoryQueries,
  labelQueries,
  templateQueries,
  draftQueries,
  attachmentQueries,
  publishedIssueQueries,
  settingsQueries,
} from '@main/db/queries'
import { seedTemplates } from '@main/db/seed'
import { sql } from 'drizzle-orm'

let db: BetterSQLite3Database

beforeEach(() => {
  db = createDatabase(':memory:')
})

// ============ Schema Creation ============

describe('Schema creation', () => {
  it('creates all expected tables', () => {
    const tables = db
      .all<{ name: string }>(
        sql`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
      )
      .map((r) => r.name)

    expect(tables).toContain('repositories')
    expect(tables).toContain('labels')
    expect(tables).toContain('templates')
    expect(tables).toContain('drafts')
    expect(tables).toContain('draft_labels')
    expect(tables).toContain('attachments')
    expect(tables).toContain('published_issues')
    expect(tables).toContain('settings')
  })

  it('enables foreign keys', () => {
    const result = db.all<{ foreign_keys: number }>(sql`PRAGMA foreign_keys`)
    expect(result[0].foreign_keys).toBe(1)
  })
})

// ============ Repository Queries ============

describe('repositoryQueries', () => {
  it('list returns empty array initially', () => {
    const repos = repositoryQueries.list(db)
    expect(repos).toEqual([])
  })

  it('create inserts a repository', () => {
    const repo = repositoryQueries.create(db, {
      owner: 'octocat',
      name: 'hello-world',
      fullName: 'octocat/hello-world',
    })

    expect(repo.id).toBe(1)
    expect(repo.owner).toBe('octocat')
    expect(repo.name).toBe('hello-world')
    expect(repo.fullName).toBe('octocat/hello-world')
    expect(repo.defaultBranch).toBe('main')
    expect(repo.isDefault).toBe(false)
    expect(repo.createdAt).toBeTruthy()
    expect(repo.updatedAt).toBeTruthy()
  })

  it('create with custom default branch', () => {
    const repo = repositoryQueries.create(db, {
      owner: 'octocat',
      name: 'hello-world',
      fullName: 'octocat/hello-world',
      defaultBranch: 'develop',
    })

    expect(repo.defaultBranch).toBe('develop')
  })

  it('list returns all repositories', () => {
    repositoryQueries.create(db, {
      owner: 'a',
      name: 'repo1',
      fullName: 'a/repo1',
    })
    repositoryQueries.create(db, {
      owner: 'b',
      name: 'repo2',
      fullName: 'b/repo2',
    })

    const repos = repositoryQueries.list(db)
    expect(repos).toHaveLength(2)
  })

  it('delete removes a repository', () => {
    const repo = repositoryQueries.create(db, {
      owner: 'a',
      name: 'repo1',
      fullName: 'a/repo1',
    })

    repositoryQueries.delete(db, repo.id)
    const repos = repositoryQueries.list(db)
    expect(repos).toHaveLength(0)
  })

  it('setDefault makes one repo default and clears others', () => {
    const repo1 = repositoryQueries.create(db, {
      owner: 'a',
      name: 'repo1',
      fullName: 'a/repo1',
      isDefault: true,
    })
    const repo2 = repositoryQueries.create(db, {
      owner: 'b',
      name: 'repo2',
      fullName: 'b/repo2',
    })

    repositoryQueries.setDefault(db, repo2.id)

    const defaultRepo = repositoryQueries.getDefault(db)
    expect(defaultRepo).not.toBeNull()
    expect(defaultRepo!.id).toBe(repo2.id)
    expect(defaultRepo!.isDefault).toBe(true)

    // repo1 should no longer be default
    const repos = repositoryQueries.list(db)
    const r1 = repos.find((r) => r.id === repo1.id)
    expect(r1!.isDefault).toBe(false)
  })

  it('getDefault returns null when no default exists', () => {
    repositoryQueries.create(db, {
      owner: 'a',
      name: 'repo1',
      fullName: 'a/repo1',
    })

    const result = repositoryQueries.getDefault(db)
    expect(result).toBeNull()
  })

  it('rejects duplicate fullName', () => {
    repositoryQueries.create(db, {
      owner: 'a',
      name: 'repo1',
      fullName: 'a/repo1',
    })

    expect(() => {
      repositoryQueries.create(db, {
        owner: 'a',
        name: 'repo1',
        fullName: 'a/repo1',
      })
    }).toThrow()
  })
})

// ============ Label Queries ============

describe('labelQueries', () => {
  let repoId: number

  beforeEach(() => {
    const repo = repositoryQueries.create(db, {
      owner: 'octocat',
      name: 'hello-world',
      fullName: 'octocat/hello-world',
    })
    repoId = repo.id
  })

  it('listByRepo returns empty array initially', () => {
    const result = labelQueries.listByRepo(db, repoId)
    expect(result).toEqual([])
  })

  it('syncLabels inserts new labels', () => {
    const result = labelQueries.syncLabels(db, repoId, [
      { githubId: 101, name: 'bug', color: 'fc2929', description: 'Something is broken' },
      { githubId: 102, name: 'enhancement', color: '84b6eb', description: null },
    ])

    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('bug')
    expect(result[0].color).toBe('fc2929')
    expect(result[1].name).toBe('enhancement')
  })

  it('syncLabels updates existing labels (upsert)', () => {
    labelQueries.syncLabels(db, repoId, [
      { githubId: 101, name: 'bug', color: 'fc2929', description: 'Old desc' },
    ])

    const result = labelQueries.syncLabels(db, repoId, [
      { githubId: 101, name: 'bug', color: '00ff00', description: 'New desc' },
    ])

    expect(result).toHaveLength(1)
    expect(result[0].color).toBe('00ff00')
    expect(result[0].description).toBe('New desc')
  })

  it('deleteByRepo removes all labels for a repo', () => {
    labelQueries.syncLabels(db, repoId, [
      { githubId: 101, name: 'bug', color: 'fc2929', description: null },
      { githubId: 102, name: 'feature', color: '84b6eb', description: null },
    ])

    labelQueries.deleteByRepo(db, repoId)
    expect(labelQueries.listByRepo(db, repoId)).toHaveLength(0)
  })

  it('labels are cascade deleted when repository is deleted', () => {
    labelQueries.syncLabels(db, repoId, [
      { githubId: 101, name: 'bug', color: 'fc2929', description: null },
    ])

    repositoryQueries.delete(db, repoId)
    expect(labelQueries.listByRepo(db, repoId)).toHaveLength(0)
  })
})

// ============ Template Queries ============

describe('templateQueries', () => {
  it('built-in templates are seeded', () => {
    const tmpls = templateQueries.list(db)
    expect(tmpls).toHaveLength(3)

    const slugs = tmpls.map((t) => t.slug)
    expect(slugs).toContain('bug')
    expect(slugs).toContain('feature')
    expect(slugs).toContain('improvement')
  })

  it('templates are ordered by sortOrder', () => {
    const tmpls = templateQueries.list(db)
    expect(tmpls[0].slug).toBe('bug')
    expect(tmpls[1].slug).toBe('feature')
    expect(tmpls[2].slug).toBe('improvement')
  })

  it('getBySlug returns the correct template', () => {
    const tmpl = templateQueries.getBySlug(db, 'bug')
    expect(tmpl).not.toBeNull()
    expect(tmpl!.name).toBe('バグ報告')
    expect(tmpl!.isBuiltIn).toBe(true)
    expect(tmpl!.systemPrompt).toContain('バグ報告')
    expect(tmpl!.defaultLabels).toEqual(['bug'])
  })

  it('getBySlug returns null for non-existent slug', () => {
    const result = templateQueries.getBySlug(db, 'nonexistent')
    expect(result).toBeNull()
  })

  it('seeding is idempotent (no duplicates on second createDatabase)', () => {
    // createDatabase already seeded in beforeEach; calling seedTemplates again
    // should not duplicate
    seedTemplates(db)

    const tmpls = templateQueries.list(db)
    expect(tmpls).toHaveLength(3)
  })
})

// ============ Draft Queries ============

describe('draftQueries', () => {
  let repoId: number

  beforeEach(() => {
    const repo = repositoryQueries.create(db, {
      owner: 'octocat',
      name: 'hello-world',
      fullName: 'octocat/hello-world',
    })
    repoId = repo.id
  })

  it('list returns empty array initially', () => {
    expect(draftQueries.list(db)).toEqual([])
  })

  it('create inserts a draft with defaults', () => {
    const draft = draftQueries.create(db, {
      repositoryId: repoId,
      title: 'Test Issue',
      body: 'Issue body',
    })

    expect(draft.id).toBe(1)
    expect(draft.title).toBe('Test Issue')
    expect(draft.body).toBe('Issue body')
    expect(draft.status).toBe('draft')
    expect(draft.repositoryId).toBe(repoId)
    expect(draft.templateId).toBeNull()
    expect(draft.inputRelatedIssues).toEqual([])
    expect(draft.inputContextUrls).toEqual([])
    expect(draft.assignees).toEqual([])
    expect(draft.createdAt).toBeTruthy()
  })

  it('create with all optional fields', () => {
    const tmpl = templateQueries.getBySlug(db, 'bug')
    const draft = draftQueries.create(db, {
      repositoryId: repoId,
      templateId: tmpl!.id,
      title: 'Full Draft',
      body: 'Full body',
      status: 'ai_generated',
      inputDescription: 'description',
      inputTargetPage: '/login',
      inputFigmaUrl: 'https://figma.com/...',
      inputFigmaFrame: 'frame-1',
      inputDesignNotes: 'notes',
      inputRelatedIssues: ['#1', '#2'],
      inputContextUrls: ['https://example.com'],
      assignees: ['user1', 'user2'],
    })

    expect(draft.status).toBe('ai_generated')
    expect(draft.templateId).toBe(tmpl!.id)
    expect(draft.inputDescription).toBe('description')
    expect(draft.inputTargetPage).toBe('/login')
    expect(draft.inputRelatedIssues).toEqual(['#1', '#2'])
    expect(draft.assignees).toEqual(['user1', 'user2'])
  })

  it('getById returns a draft', () => {
    const created = draftQueries.create(db, {
      repositoryId: repoId,
      title: 'Get Test',
      body: 'body',
    })

    const found = draftQueries.getById(db, created.id)
    expect(found).not.toBeNull()
    expect(found!.title).toBe('Get Test')
  })

  it('getById returns null for non-existent id', () => {
    expect(draftQueries.getById(db, 999)).toBeNull()
  })

  it('update modifies a draft', () => {
    const created = draftQueries.create(db, {
      repositoryId: repoId,
      title: 'Original',
      body: 'body',
    })

    const updated = draftQueries.update(db, created.id, {
      title: 'Updated Title',
      status: 'reviewed',
    })

    expect(updated).not.toBeNull()
    expect(updated!.title).toBe('Updated Title')
    expect(updated!.status).toBe('reviewed')
    expect(updated!.body).toBe('body') // unchanged fields preserved
    expect(updated!.updatedAt).toBeTruthy()
    expect(updated!.createdAt).toBe(created.createdAt) // createdAt never changes
  })

  it('delete removes a draft', () => {
    const created = draftQueries.create(db, {
      repositoryId: repoId,
      title: 'To Delete',
      body: 'body',
    })

    draftQueries.delete(db, created.id)
    expect(draftQueries.getById(db, created.id)).toBeNull()
  })

  it('list with status filter', () => {
    draftQueries.create(db, {
      repositoryId: repoId,
      title: 'Draft 1',
      body: 'body',
      status: 'draft',
    })
    draftQueries.create(db, {
      repositoryId: repoId,
      title: 'Reviewed 1',
      body: 'body',
      status: 'reviewed',
    })
    draftQueries.create(db, {
      repositoryId: repoId,
      title: 'Draft 2',
      body: 'body',
      status: 'draft',
    })

    const draftsOnly = draftQueries.list(db, 'draft')
    expect(draftsOnly).toHaveLength(2)
    expect(draftsOnly.every((d) => d.status === 'draft')).toBe(true)

    const reviewedOnly = draftQueries.list(db, 'reviewed')
    expect(reviewedOnly).toHaveLength(1)
  })

  it('publish updates status and sets github info', () => {
    const created = draftQueries.create(db, {
      repositoryId: repoId,
      title: 'To Publish',
      body: 'body',
    })

    const published = draftQueries.publish(db, created.id, {
      githubIssueNumber: 42,
      githubIssueUrl: 'https://github.com/octocat/hello-world/issues/42',
    })

    expect(published!.status).toBe('published')
    expect(published!.githubIssueNumber).toBe(42)
    expect(published!.githubIssueUrl).toBe(
      'https://github.com/octocat/hello-world/issues/42'
    )
    expect(published!.publishedAt).toBeTruthy()
  })

  it('status transitions: draft -> ai_generated -> reviewed -> published', () => {
    const d = draftQueries.create(db, {
      repositoryId: repoId,
      title: 'Flow',
      body: 'body',
    })
    expect(d.status).toBe('draft')

    draftQueries.update(db, d.id, { status: 'ai_generated' })
    expect(draftQueries.getById(db, d.id)!.status).toBe('ai_generated')

    draftQueries.update(db, d.id, { status: 'reviewed' })
    expect(draftQueries.getById(db, d.id)!.status).toBe('reviewed')

    draftQueries.publish(db, d.id, {
      githubIssueNumber: 1,
      githubIssueUrl: 'https://example.com/issues/1',
    })
    expect(draftQueries.getById(db, d.id)!.status).toBe('published')
  })

  it('drafts are cascade deleted when repository is deleted', () => {
    draftQueries.create(db, {
      repositoryId: repoId,
      title: 'Cascade Test',
      body: 'body',
    })

    repositoryQueries.delete(db, repoId)
    expect(draftQueries.list(db)).toHaveLength(0)
  })

  it('create with labelIds inserts draft_labels', () => {
    const syncedLabels = labelQueries.syncLabels(db, repoId, [
      { githubId: 101, name: 'bug', color: 'fc2929', description: null },
      { githubId: 102, name: 'feature', color: '84b6eb', description: null },
    ])

    const draft = draftQueries.create(db, {
      repositoryId: repoId,
      title: 'Labeled Draft',
      body: 'body',
      labelIds: syncedLabels.map((l) => l.id),
    })

    // Verify draft_labels were created by querying raw SQL
    const dls = db.all<{ draft_id: number; label_id: number }>(
      sql`SELECT draft_id, label_id FROM draft_labels WHERE draft_id = ${draft.id}`
    )
    expect(dls).toHaveLength(2)
  })
})

// ============ Attachment Queries ============

describe('attachmentQueries', () => {
  let repoId: number
  let draftId: number

  beforeEach(() => {
    const repo = repositoryQueries.create(db, {
      owner: 'a',
      name: 'repo',
      fullName: 'a/repo',
    })
    repoId = repo.id

    const draft = draftQueries.create(db, {
      repositoryId: repoId,
      title: 'Draft',
      body: 'body',
    })
    draftId = draft.id
  })

  it('listByDraft returns empty initially', () => {
    expect(attachmentQueries.listByDraft(db, draftId)).toEqual([])
  })

  it('create inserts an attachment', () => {
    const att = attachmentQueries.create(db, {
      draftId,
      type: 'screenshot',
      fileName: 'screen.png',
      filePath: '/tmp/screen.png',
      mimeType: 'image/png',
      fileSize: 12345,
    })

    expect(att.id).toBe(1)
    expect(att.type).toBe('screenshot')
    expect(att.fileName).toBe('screen.png')
    expect(att.mimeType).toBe('image/png')
    expect(att.fileSize).toBe(12345)
    expect(att.createdAt).toBeTruthy()
  })

  it('listByDraft returns all attachments for a draft', () => {
    attachmentQueries.create(db, {
      draftId,
      type: 'screenshot',
      fileName: 'a.png',
      filePath: '/tmp/a.png',
    })
    attachmentQueries.create(db, {
      draftId,
      type: 'pdf',
      fileName: 'b.pdf',
      filePath: '/tmp/b.pdf',
    })

    const result = attachmentQueries.listByDraft(db, draftId)
    expect(result).toHaveLength(2)
  })

  it('delete removes an attachment', () => {
    const att = attachmentQueries.create(db, {
      draftId,
      type: 'screenshot',
      fileName: 'a.png',
      filePath: '/tmp/a.png',
    })

    attachmentQueries.delete(db, att.id)
    expect(attachmentQueries.listByDraft(db, draftId)).toHaveLength(0)
  })

  it('attachments are cascade deleted when draft is deleted', () => {
    attachmentQueries.create(db, {
      draftId,
      type: 'screenshot',
      fileName: 'a.png',
      filePath: '/tmp/a.png',
    })
    attachmentQueries.create(db, {
      draftId,
      type: 'pdf',
      fileName: 'b.pdf',
      filePath: '/tmp/b.pdf',
    })

    draftQueries.delete(db, draftId)
    expect(attachmentQueries.listByDraft(db, draftId)).toHaveLength(0)
  })

  it('attachments are cascade deleted when repository is deleted', () => {
    attachmentQueries.create(db, {
      draftId,
      type: 'screenshot',
      fileName: 'a.png',
      filePath: '/tmp/a.png',
    })

    repositoryQueries.delete(db, repoId)
    expect(attachmentQueries.listByDraft(db, draftId)).toHaveLength(0)
  })
})

// ============ Cascade Delete: draft_labels ============

describe('cascade delete: draft_labels', () => {
  it('draft_labels are deleted when draft is deleted', () => {
    const repo = repositoryQueries.create(db, {
      owner: 'a',
      name: 'r',
      fullName: 'a/r',
    })
    const syncedLabels = labelQueries.syncLabels(db, repo.id, [
      { githubId: 1, name: 'bug', color: null, description: null },
    ])
    const draft = draftQueries.create(db, {
      repositoryId: repo.id,
      title: 'D',
      body: 'B',
      labelIds: [syncedLabels[0].id],
    })

    draftQueries.delete(db, draft.id)

    const dls = db.all(sql`SELECT * FROM draft_labels WHERE draft_id = ${draft.id}`)
    expect(dls).toHaveLength(0)
  })

  it('draft_labels are deleted when label is deleted', () => {
    const repo = repositoryQueries.create(db, {
      owner: 'a',
      name: 'r',
      fullName: 'a/r',
    })
    const syncedLabels = labelQueries.syncLabels(db, repo.id, [
      { githubId: 1, name: 'bug', color: null, description: null },
    ])
    draftQueries.create(db, {
      repositoryId: repo.id,
      title: 'D',
      body: 'B',
      labelIds: [syncedLabels[0].id],
    })

    labelQueries.deleteByRepo(db, repo.id)

    const dls = db.all(sql`SELECT * FROM draft_labels`)
    expect(dls).toHaveLength(0)
  })
})

// ============ Published Issue Queries ============

describe('publishedIssueQueries', () => {
  let repoId: number

  beforeEach(() => {
    const repo = repositoryQueries.create(db, {
      owner: 'a',
      name: 'repo',
      fullName: 'a/repo',
    })
    repoId = repo.id
  })

  it('list returns empty initially', () => {
    expect(publishedIssueQueries.list(db)).toEqual([])
  })

  it('create inserts a published issue', () => {
    const pi = publishedIssueQueries.create(db, {
      repositoryId: repoId,
      githubIssueNumber: 42,
      githubIssueUrl: 'https://github.com/a/repo/issues/42',
      title: 'Published Issue',
    })

    expect(pi.id).toBe(1)
    expect(pi.githubIssueNumber).toBe(42)
    expect(pi.title).toBe('Published Issue')
    expect(pi.state).toBe('open')
    expect(pi.publishedAt).toBeTruthy()
  })

  it('create with draftId links to a draft', () => {
    const draft = draftQueries.create(db, {
      repositoryId: repoId,
      title: 'Draft',
      body: 'body',
    })

    const pi = publishedIssueQueries.create(db, {
      draftId: draft.id,
      repositoryId: repoId,
      githubIssueNumber: 1,
      githubIssueUrl: 'https://github.com/a/repo/issues/1',
      title: 'Issue from Draft',
    })

    expect(pi.draftId).toBe(draft.id)
  })

  it('list returns published issues ordered by publishedAt desc', () => {
    // Insert with explicit different timestamps to test ordering
    const pi1 = publishedIssueQueries.create(db, {
      repositoryId: repoId,
      githubIssueNumber: 1,
      githubIssueUrl: 'https://github.com/a/repo/issues/1',
      title: 'First',
    })
    // Manually set the first one to an earlier timestamp
    db.run(
      sql`UPDATE published_issues SET published_at = '2024-01-01T00:00:00.000Z' WHERE id = ${pi1.id}`
    )

    publishedIssueQueries.create(db, {
      repositoryId: repoId,
      githubIssueNumber: 2,
      githubIssueUrl: 'https://github.com/a/repo/issues/2',
      title: 'Second',
    })

    const result = publishedIssueQueries.list(db)
    expect(result).toHaveLength(2)
    // Most recent first
    expect(result[0].githubIssueNumber).toBe(2)
    expect(result[1].githubIssueNumber).toBe(1)
  })

  it('published_issues are cascade deleted when repository is deleted', () => {
    publishedIssueQueries.create(db, {
      repositoryId: repoId,
      githubIssueNumber: 1,
      githubIssueUrl: 'https://github.com/a/repo/issues/1',
      title: 'Issue',
    })

    repositoryQueries.delete(db, repoId)
    expect(publishedIssueQueries.list(db)).toHaveLength(0)
  })
})

// ============ Settings Queries ============

describe('settingsQueries', () => {
  it('get returns null for non-existent key', () => {
    expect(settingsQueries.get(db, 'nonexistent')).toBeNull()
  })

  it('set and get a value', () => {
    settingsQueries.set(db, 'theme', 'dark')
    expect(settingsQueries.get(db, 'theme')).toBe('dark')
  })

  it('set overwrites existing value (upsert)', () => {
    settingsQueries.set(db, 'lang', 'en')
    settingsQueries.set(db, 'lang', 'ja')
    expect(settingsQueries.get(db, 'lang')).toBe('ja')
  })

  it('set multiple independent keys', () => {
    settingsQueries.set(db, 'key1', 'value1')
    settingsQueries.set(db, 'key2', 'value2')
    expect(settingsQueries.get(db, 'key1')).toBe('value1')
    expect(settingsQueries.get(db, 'key2')).toBe('value2')
  })

  it('can store JSON strings', () => {
    const json = JSON.stringify({ api_key: 'sk-xxx', model: 'claude-3' })
    settingsQueries.set(db, 'ai_config', json)
    expect(JSON.parse(settingsQueries.get(db, 'ai_config')!)).toEqual({
      api_key: 'sk-xxx',
      model: 'claude-3',
    })
  })
})

// ============ Edge Cases ============

describe('edge cases', () => {
  it('creating draft with non-existent repository fails due to foreign key', () => {
    expect(() => {
      draftQueries.create(db, {
        repositoryId: 9999,
        title: 'No Repo',
        body: 'body',
      })
    }).toThrow()
  })

  it('creating attachment with non-existent draft fails due to foreign key', () => {
    expect(() => {
      attachmentQueries.create(db, {
        draftId: 9999,
        type: 'screenshot',
        fileName: 'test.png',
        filePath: '/tmp/test.png',
      })
    }).toThrow()
  })

  it('creating published issue with non-existent repository fails', () => {
    expect(() => {
      publishedIssueQueries.create(db, {
        repositoryId: 9999,
        githubIssueNumber: 1,
        githubIssueUrl: 'https://example.com',
        title: 'Test',
      })
    }).toThrow()
  })

  it('template defaultLabels is stored and retrieved as JSON array', () => {
    const tmpl = templateQueries.getBySlug(db, 'bug')
    expect(Array.isArray(tmpl!.defaultLabels)).toBe(true)
    expect(tmpl!.defaultLabels).toEqual(['bug'])
  })

  it('draft JSON arrays are stored and retrieved correctly', () => {
    const repo = repositoryQueries.create(db, {
      owner: 'x',
      name: 'y',
      fullName: 'x/y',
    })

    const draft = draftQueries.create(db, {
      repositoryId: repo.id,
      title: 'JSON Test',
      body: 'body',
      assignees: ['alice', 'bob'],
      inputRelatedIssues: ['#10', '#20'],
      inputContextUrls: ['https://a.com', 'https://b.com'],
    })

    const fetched = draftQueries.getById(db, draft.id)
    expect(fetched!.assignees).toEqual(['alice', 'bob'])
    expect(fetched!.inputRelatedIssues).toEqual(['#10', '#20'])
    expect(fetched!.inputContextUrls).toEqual(['https://a.com', 'https://b.com'])
  })

  it('draft update with JSON array fields', () => {
    const repo = repositoryQueries.create(db, {
      owner: 'x',
      name: 'y',
      fullName: 'x/y',
    })

    const draft = draftQueries.create(db, {
      repositoryId: repo.id,
      title: 'Update JSON',
      body: 'body',
    })

    draftQueries.update(db, draft.id, {
      assignees: ['charlie'],
    })

    const updated = draftQueries.getById(db, draft.id)
    expect(updated!.assignees).toEqual(['charlie'])
  })

  it('template slug uniqueness is enforced', () => {
    // Built-in 'bug' already exists; inserting another with same slug should fail
    expect(() => {
      db.run(
        sql`INSERT INTO templates (name, slug, system_prompt, body_template, default_labels, created_at, updated_at)
            VALUES ('Dup', 'bug', 'prompt', 'body', '[]', '2024-01-01', '2024-01-01')`
      )
    }).toThrow()
  })
})

import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { eq, and, desc, sql } from 'drizzle-orm'
import {
  repositories,
  labels,
  templates,
  drafts,
  draftLabels,
  attachments,
  publishedIssues,
  settings,
} from './schema'
import type { DraftStatus } from '../../shared/types'

// ============ Utility ============

function now(): string {
  return new Date().toISOString()
}

// ============ Repository Queries ============

export const repositoryQueries = {
  list(db: BetterSQLite3Database) {
    return db.select().from(repositories).all()
  },

  create(
    db: BetterSQLite3Database,
    data: {
      owner: string
      name: string
      fullName: string
      defaultBranch?: string
      isDefault?: boolean
    }
  ) {
    const timestamp = now()
    const result = db
      .insert(repositories)
      .values({
        owner: data.owner,
        name: data.name,
        fullName: data.fullName,
        defaultBranch: data.defaultBranch ?? 'main',
        isDefault: data.isDefault ?? false,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .returning()
      .get()

    return result
  },

  delete(db: BetterSQLite3Database, id: number) {
    db.delete(repositories).where(eq(repositories.id, id)).run()
  },

  setDefault(db: BetterSQLite3Database, id: number) {
    const timestamp = now()
    // Clear all defaults first
    db.update(repositories)
      .set({ isDefault: false, updatedAt: timestamp })
      .run()
    // Set the specified one as default
    db.update(repositories)
      .set({ isDefault: true, updatedAt: timestamp })
      .where(eq(repositories.id, id))
      .run()
  },

  getDefault(db: BetterSQLite3Database) {
    return (
      db
        .select()
        .from(repositories)
        .where(eq(repositories.isDefault, true))
        .get() ?? null
    )
  },
}

// ============ Label Queries ============

export const labelQueries = {
  listByRepo(db: BetterSQLite3Database, repositoryId: number) {
    return db
      .select()
      .from(labels)
      .where(eq(labels.repositoryId, repositoryId))
      .all()
  },

  syncLabels(
    db: BetterSQLite3Database,
    repositoryId: number,
    labelsData: Array<{
      githubId: number | null
      name: string
      color: string | null
      description: string | null
    }>
  ) {
    const timestamp = now()

    for (const label of labelsData) {
      // Try to find existing label by name and repo
      const existing = db
        .select()
        .from(labels)
        .where(and(eq(labels.repositoryId, repositoryId), eq(labels.name, label.name)))
        .get()

      if (existing) {
        // Update existing label
        db.update(labels)
          .set({
            githubId: label.githubId,
            color: label.color,
            description: label.description,
            syncedAt: timestamp,
          })
          .where(eq(labels.id, existing.id))
          .run()
      } else {
        // Insert new label
        db.insert(labels)
          .values({
            repositoryId,
            githubId: label.githubId,
            name: label.name,
            color: label.color,
            description: label.description,
            syncedAt: timestamp,
          })
          .run()
      }
    }

    return db
      .select()
      .from(labels)
      .where(eq(labels.repositoryId, repositoryId))
      .all()
  },

  deleteByRepo(db: BetterSQLite3Database, repositoryId: number) {
    db.delete(labels).where(eq(labels.repositoryId, repositoryId)).run()
  },
}

// ============ Template Queries ============

export const templateQueries = {
  list(db: BetterSQLite3Database) {
    return db.select().from(templates).orderBy(templates.sortOrder).all()
  },

  getBySlug(db: BetterSQLite3Database, slug: string) {
    return db.select().from(templates).where(eq(templates.slug, slug)).get() ?? null
  },
}

// ============ Draft Queries ============

export const draftQueries = {
  list(db: BetterSQLite3Database, status?: DraftStatus) {
    if (status) {
      return db
        .select()
        .from(drafts)
        .where(eq(drafts.status, status))
        .orderBy(desc(drafts.updatedAt))
        .all()
    }
    return db.select().from(drafts).orderBy(desc(drafts.updatedAt)).all()
  },

  getById(db: BetterSQLite3Database, id: number) {
    return db.select().from(drafts).where(eq(drafts.id, id)).get() ?? null
  },

  create(
    db: BetterSQLite3Database,
    data: {
      repositoryId: number
      templateId?: number
      title: string
      body: string
      status?: DraftStatus
      inputDescription?: string
      inputTargetPage?: string
      inputFigmaUrl?: string
      inputFigmaFrame?: string
      inputDesignNotes?: string
      inputRelatedIssues?: string[]
      inputContextUrls?: string[]
      assignees?: string[]
      labelIds?: number[]
    }
  ) {
    const timestamp = now()
    const result = db
      .insert(drafts)
      .values({
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
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .returning()
      .get()

    // Insert draft_labels if provided
    if (data.labelIds && data.labelIds.length > 0) {
      for (const labelId of data.labelIds) {
        db.insert(draftLabels)
          .values({ draftId: result.id, labelId })
          .run()
      }
    }

    return result
  },

  update(
    db: BetterSQLite3Database,
    id: number,
    data: Partial<{
      repositoryId: number
      templateId: number | null
      title: string
      body: string
      status: DraftStatus
      inputDescription: string | null
      inputTargetPage: string | null
      inputFigmaUrl: string | null
      inputFigmaFrame: string | null
      inputDesignNotes: string | null
      inputRelatedIssues: string[]
      inputContextUrls: string[]
      assignees: string[]
      githubIssueNumber: number | null
      githubIssueUrl: string | null
      publishedAt: string | null
      aiModel: string | null
      aiTokensUsed: number | null
    }>
  ) {
    db.update(drafts)
      .set({ ...data, updatedAt: now() })
      .where(eq(drafts.id, id))
      .run()

    return db.select().from(drafts).where(eq(drafts.id, id)).get() ?? null
  },

  delete(db: BetterSQLite3Database, id: number) {
    db.delete(drafts).where(eq(drafts.id, id)).run()
  },

  publish(
    db: BetterSQLite3Database,
    id: number,
    data: {
      githubIssueNumber: number
      githubIssueUrl: string
    }
  ) {
    const timestamp = now()
    db.update(drafts)
      .set({
        status: 'published',
        githubIssueNumber: data.githubIssueNumber,
        githubIssueUrl: data.githubIssueUrl,
        publishedAt: timestamp,
        updatedAt: timestamp,
      })
      .where(eq(drafts.id, id))
      .run()

    return db.select().from(drafts).where(eq(drafts.id, id)).get() ?? null
  },
}

// ============ Attachment Queries ============

export const attachmentQueries = {
  listByDraft(db: BetterSQLite3Database, draftId: number) {
    return db
      .select()
      .from(attachments)
      .where(eq(attachments.draftId, draftId))
      .all()
  },

  create(
    db: BetterSQLite3Database,
    data: {
      draftId: number
      type: 'screenshot' | 'figma_export' | 'pdf' | 'context_file'
      fileName: string
      filePath: string
      mimeType?: string
      fileSize?: number
    }
  ) {
    return db
      .insert(attachments)
      .values({
        draftId: data.draftId,
        type: data.type,
        fileName: data.fileName,
        filePath: data.filePath,
        mimeType: data.mimeType ?? null,
        fileSize: data.fileSize ?? null,
        createdAt: now(),
      })
      .returning()
      .get()
  },

  delete(db: BetterSQLite3Database, id: number) {
    db.delete(attachments).where(eq(attachments.id, id)).run()
  },
}

// ============ Published Issue Queries ============

export const publishedIssueQueries = {
  list(db: BetterSQLite3Database) {
    return db
      .select()
      .from(publishedIssues)
      .orderBy(desc(publishedIssues.publishedAt))
      .all()
  },

  create(
    db: BetterSQLite3Database,
    data: {
      draftId?: number
      repositoryId: number
      githubIssueNumber: number
      githubIssueUrl: string
      title: string
      state?: 'open' | 'closed'
    }
  ) {
    return db
      .insert(publishedIssues)
      .values({
        draftId: data.draftId ?? null,
        repositoryId: data.repositoryId,
        githubIssueNumber: data.githubIssueNumber,
        githubIssueUrl: data.githubIssueUrl,
        title: data.title,
        state: data.state ?? 'open',
        publishedAt: now(),
      })
      .returning()
      .get()
  },
}

// ============ Settings Queries ============

export const settingsQueries = {
  get(db: BetterSQLite3Database, key: string): string | null {
    const row = db.select().from(settings).where(eq(settings.key, key)).get()
    return row?.value ?? null
  },

  set(db: BetterSQLite3Database, key: string, value: string) {
    // Upsert: insert or update on conflict
    db.insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value },
      })
      .run()
  },
}

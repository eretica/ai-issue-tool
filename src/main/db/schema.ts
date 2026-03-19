import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

// ============ repositories ============

export const repositories = sqliteTable('repositories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  owner: text('owner').notNull(),
  name: text('name').notNull(),
  fullName: text('full_name').notNull().unique(),
  defaultBranch: text('default_branch').notNull().default('main'),
  localPath: text('local_path'),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

// ============ labels ============

export const labels = sqliteTable('labels', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  repositoryId: integer('repository_id')
    .notNull()
    .references(() => repositories.id, { onDelete: 'cascade' }),
  githubId: integer('github_id'),
  name: text('name').notNull(),
  color: text('color'),
  description: text('description'),
  syncedAt: text('synced_at'),
})

// ============ templates ============

export const templates = sqliteTable('templates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  systemPrompt: text('system_prompt').notNull(),
  bodyTemplate: text('body_template').notNull(),
  defaultLabels: text('default_labels', { mode: 'json' }).notNull().$type<string[]>(),
  isBuiltIn: integer('is_built_in', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

// ============ drafts ============

export const drafts = sqliteTable('drafts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  repositoryId: integer('repository_id')
    .notNull()
    .references(() => repositories.id, { onDelete: 'cascade' }),
  templateId: integer('template_id').references(() => templates.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  body: text('body').notNull(),
  status: text('status').notNull().default('draft'),
  inputDescription: text('input_description'),
  inputTargetPage: text('input_target_page'),
  inputFigmaUrl: text('input_figma_url'),
  inputFigmaFrame: text('input_figma_frame'),
  inputDesignNotes: text('input_design_notes'),
  inputRelatedIssues: text('input_related_issues', { mode: 'json' })
    .notNull()
    .$type<string[]>()
    .default([]),
  inputContextUrls: text('input_context_urls', { mode: 'json' })
    .notNull()
    .$type<string[]>()
    .default([]),
  assignees: text('assignees', { mode: 'json' }).notNull().$type<string[]>().default([]),
  githubIssueNumber: integer('github_issue_number'),
  githubIssueUrl: text('github_issue_url'),
  publishedAt: text('published_at'),
  aiModel: text('ai_model'),
  aiTokensUsed: integer('ai_tokens_used'),
  pipelineCurrentStep: integer('pipeline_current_step'),
  pipelineTotalSteps: integer('pipeline_total_steps').default(5),
  generationStrategy: text('generation_strategy'),
  qcScore: integer('qc_score'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

// ============ draft_labels (join table) ============

export const draftLabels = sqliteTable('draft_labels', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  draftId: integer('draft_id')
    .notNull()
    .references(() => drafts.id, { onDelete: 'cascade' }),
  labelId: integer('label_id')
    .notNull()
    .references(() => labels.id, { onDelete: 'cascade' }),
})

// ============ attachments ============

export const attachments = sqliteTable('attachments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  draftId: integer('draft_id')
    .notNull()
    .references(() => drafts.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  fileName: text('file_name').notNull(),
  filePath: text('file_path').notNull(),
  mimeType: text('mime_type'),
  fileSize: integer('file_size'),
  githubUrl: text('github_url'),
  createdAt: text('created_at').notNull(),
})

// ============ published_issues ============

export const publishedIssues = sqliteTable('published_issues', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  draftId: integer('draft_id').references(() => drafts.id, { onDelete: 'set null' }),
  repositoryId: integer('repository_id')
    .notNull()
    .references(() => repositories.id, { onDelete: 'cascade' }),
  githubIssueNumber: integer('github_issue_number').notNull(),
  githubIssueUrl: text('github_issue_url').notNull(),
  title: text('title').notNull(),
  state: text('state').notNull().default('open'),
  lastSyncedAt: text('last_synced_at'),
  publishedAt: text('published_at').notNull(),
})

// ============ pipeline_steps ============

export const pipelineSteps = sqliteTable('pipeline_steps', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  draftId: integer('draft_id')
    .notNull()
    .references(() => drafts.id, { onDelete: 'cascade' }),
  stepNumber: integer('step_number').notNull(),
  stepName: text('step_name').notNull(),
  status: text('status').notNull().default('pending'),
  modelUsed: text('model_used'),
  inputSummary: text('input_summary', { mode: 'json' }).$type<Record<string, unknown>>(),
  outputData: text('output_data', { mode: 'json' }).$type<Record<string, unknown>>(),
  tokensUsed: integer('tokens_used'),
  durationMs: integer('duration_ms'),
  errorMessage: text('error_message'),
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
  createdAt: text('created_at').notNull(),
})

// ============ settings ============

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})

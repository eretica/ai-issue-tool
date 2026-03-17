import { existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'
import Database from 'better-sqlite3'
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { sql } from 'drizzle-orm'
import * as schema from './schema'
import { seedTemplates } from './seed'

/**
 * Creates all tables using raw SQL.
 * This avoids requiring Drizzle migration files during development/testing.
 */
function createTables(db: BetterSQLite3Database): void {
  db.run(sql`
    CREATE TABLE IF NOT EXISTS repositories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner TEXT NOT NULL,
      name TEXT NOT NULL,
      full_name TEXT NOT NULL UNIQUE,
      default_branch TEXT NOT NULL DEFAULT 'main',
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  db.run(sql`
    CREATE TABLE IF NOT EXISTS labels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repository_id INTEGER NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
      github_id INTEGER,
      name TEXT NOT NULL,
      color TEXT,
      description TEXT,
      synced_at TEXT
    )
  `)

  db.run(sql`
    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      system_prompt TEXT NOT NULL,
      body_template TEXT NOT NULL,
      default_labels TEXT NOT NULL DEFAULT '[]',
      is_built_in INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  db.run(sql`
    CREATE TABLE IF NOT EXISTS drafts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repository_id INTEGER NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
      template_id INTEGER REFERENCES templates(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      input_description TEXT,
      input_target_page TEXT,
      input_figma_url TEXT,
      input_figma_frame TEXT,
      input_design_notes TEXT,
      input_related_issues TEXT NOT NULL DEFAULT '[]',
      input_context_urls TEXT NOT NULL DEFAULT '[]',
      assignees TEXT NOT NULL DEFAULT '[]',
      github_issue_number INTEGER,
      github_issue_url TEXT,
      published_at TEXT,
      ai_model TEXT,
      ai_tokens_used INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  db.run(sql`
    CREATE TABLE IF NOT EXISTS draft_labels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      draft_id INTEGER NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
      label_id INTEGER NOT NULL REFERENCES labels(id) ON DELETE CASCADE
    )
  `)

  db.run(sql`
    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      draft_id INTEGER NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      mime_type TEXT,
      file_size INTEGER,
      github_url TEXT,
      created_at TEXT NOT NULL
    )
  `)

  db.run(sql`
    CREATE TABLE IF NOT EXISTS published_issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      draft_id INTEGER REFERENCES drafts(id) ON DELETE SET NULL,
      repository_id INTEGER NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
      github_issue_number INTEGER NOT NULL,
      github_issue_url TEXT NOT NULL,
      title TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'open',
      last_synced_at TEXT,
      published_at TEXT NOT NULL
    )
  `)

  db.run(sql`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `)
}

/**
 * Creates a new database instance with all tables and seed data.
 *
 * @param dbPath - Path to the SQLite database file, or ':memory:' for in-memory
 * @returns The initialized Drizzle database instance
 */
export function createDatabase(dbPath: string): BetterSQLite3Database {
  // Create directory for DB file if it doesn't exist (skip for in-memory)
  if (dbPath !== ':memory:') {
    const dir = dirname(dbPath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  }

  const sqlite = new Database(dbPath)

  // Enable WAL mode for better concurrent read performance
  sqlite.pragma('journal_mode = WAL')
  // Enable foreign key constraint enforcement
  sqlite.pragma('foreign_keys = ON')

  const db = drizzle(sqlite, { schema })

  // Create tables
  createTables(db)

  // Seed built-in templates
  seedTemplates(db)

  return db
}

export { schema }

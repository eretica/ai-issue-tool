/**
 * Knowledge Base service — reads/writes per-repository knowledge files.
 *
 * Storage layout (git-tracked, inside this project):
 *   knowledge/{owner}_{repo}/
 *     profile.md     — Hot Memory (always injected into pipeline)
 *     meta.json      — Scan state (commit hash, timestamps)
 *     modules/       — Cold Memory (searched on demand)
 *       src-main.md
 *       src-renderer.md
 *       ...
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'fs'
import { join, resolve } from 'path'
import { execSync } from 'child_process'

// knowledge/ lives at the project root of ai-issue-tool
// Built output: out/main/index.js → __dirname = out/main/ → ../../knowledge = project root
const KNOWLEDGE_ROOT = resolve(__dirname, '..', '..', 'knowledge')

export interface KnowledgeMeta {
  repoFullName: string
  lastFullScanAt: string | null
  lastFullScanCommit: string | null
  lastIncrementalAt: string | null
  lastIncrementalCommit: string | null
  moduleCount: number
  profileVersion: number
}

export interface KnowledgeStatus {
  exists: boolean
  meta: KnowledgeMeta | null
  profile: string | null
  moduleNames: string[]
  currentCommit: string | null
  commitsBehind: number | null
}

// ─── Path helpers ───

function repoDir(repoFullName: string): string {
  return join(KNOWLEDGE_ROOT, repoFullName.replace('/', '_'))
}

function profilePath(repoFullName: string): string {
  return join(repoDir(repoFullName), 'profile.md')
}

function metaPath(repoFullName: string): string {
  return join(repoDir(repoFullName), 'meta.json')
}

function modulesDir(repoFullName: string): string {
  return join(repoDir(repoFullName), 'modules')
}

function modulePath(repoFullName: string, moduleName: string): string {
  return join(modulesDir(repoFullName), `${moduleName}.md`)
}

// ─── Read operations ───

export function getKnowledgeStatus(repoFullName: string, localPath: string | null): KnowledgeStatus {
  const dir = repoDir(repoFullName)
  const exists = existsSync(dir) && existsSync(profilePath(repoFullName))

  let meta: KnowledgeMeta | null = null
  let profile: string | null = null
  let moduleNames: string[] = []
  let currentCommit: string | null = null
  let commitsBehind: number | null = null

  if (exists) {
    try {
      meta = JSON.parse(readFileSync(metaPath(repoFullName), 'utf-8'))
    } catch { /* ignore */ }

    try {
      profile = readFileSync(profilePath(repoFullName), 'utf-8')
    } catch { /* ignore */ }

    try {
      const mDir = modulesDir(repoFullName)
      if (existsSync(mDir)) {
        moduleNames = readdirSync(mDir)
          .filter((f) => f.endsWith('.md'))
          .map((f) => f.replace('.md', ''))
      }
    } catch { /* ignore */ }
  }

  if (localPath) {
    try {
      currentCommit = execSync('git rev-parse --short HEAD', {
        cwd: localPath,
        encoding: 'utf-8',
        timeout: 5000,
      }).trim()
    } catch { /* ignore */ }

    if (meta?.lastFullScanCommit && currentCommit) {
      try {
        const count = execSync(
          `git rev-list --count ${meta.lastFullScanCommit}..HEAD`,
          { cwd: localPath, encoding: 'utf-8', timeout: 5000 }
        ).trim()
        commitsBehind = parseInt(count, 10)
      } catch {
        commitsBehind = null
      }
    }
  }

  return { exists, meta, profile, moduleNames, currentCommit, commitsBehind }
}

export function loadProfile(repoFullName: string): string | null {
  const p = profilePath(repoFullName)
  if (!existsSync(p)) return null
  return readFileSync(p, 'utf-8')
}

export function loadModule(repoFullName: string, moduleName: string): string | null {
  const p = modulePath(repoFullName, moduleName)
  if (!existsSync(p)) return null
  return readFileSync(p, 'utf-8')
}

export function loadModulesForPaths(repoFullName: string, filePaths: string[]): string {
  const mDir = modulesDir(repoFullName)
  if (!existsSync(mDir)) return ''

  const moduleFiles = readdirSync(mDir).filter((f) => f.endsWith('.md'))
  const matchedModules = new Set<string>()

  for (const filePath of filePaths) {
    for (const mf of moduleFiles) {
      const moduleName = mf.replace('.md', '')
      // Module name like "src-main" matches paths starting with "src/main"
      const dirPattern = moduleName.replace(/-/g, '/')
      if (filePath.startsWith(dirPattern) || filePath.startsWith('./' + dirPattern)) {
        matchedModules.add(moduleName)
      }
    }
  }

  if (matchedModules.size === 0) return ''

  const parts: string[] = []
  for (const name of matchedModules) {
    const content = loadModule(repoFullName, name)
    if (content) {
      parts.push(`### Module: ${name}\n${content}`)
    }
  }
  return parts.join('\n\n')
}

// ─── Write operations ───

export function ensureKnowledgeDir(repoFullName: string): void {
  const dir = repoDir(repoFullName)
  mkdirSync(dir, { recursive: true })
  mkdirSync(modulesDir(repoFullName), { recursive: true })
}

export function saveProfile(repoFullName: string, content: string): void {
  ensureKnowledgeDir(repoFullName)
  writeFileSync(profilePath(repoFullName), content, 'utf-8')
}

export function saveModule(repoFullName: string, moduleName: string, content: string): void {
  ensureKnowledgeDir(repoFullName)
  writeFileSync(modulePath(repoFullName, moduleName), content, 'utf-8')
}

export function saveMeta(repoFullName: string, meta: KnowledgeMeta): void {
  ensureKnowledgeDir(repoFullName)
  writeFileSync(metaPath(repoFullName), JSON.stringify(meta, null, 2), 'utf-8')
}

export function appendToModule(repoFullName: string, moduleName: string, addition: string): void {
  ensureKnowledgeDir(repoFullName)
  const p = modulePath(repoFullName, moduleName)
  const existing = existsSync(p) ? readFileSync(p, 'utf-8') : ''
  writeFileSync(p, existing + '\n\n' + addition, 'utf-8')
}

// ─── Incremental update ───

export function updateKnowledgeFromInvestigation(
  repoFullName: string,
  relevantFiles: Array<{ path: string; reason: string }>,
  codeSnippets: Array<{ path: string; content: string; startLine: number }>,
  localPath: string | null
): void {
  if (relevantFiles.length === 0 && codeSnippets.length === 0) return
  if (!existsSync(profilePath(repoFullName))) return // No KB yet, skip incremental

  // Group findings by module directory
  const moduleFindings = new Map<string, string[]>()

  for (const file of relevantFiles) {
    const modName = pathToModuleName(file.path)
    if (!moduleFindings.has(modName)) moduleFindings.set(modName, [])
    moduleFindings.get(modName)!.push(`- \`${file.path}\`: ${file.reason}`)
  }

  for (const snippet of codeSnippets) {
    const modName = pathToModuleName(snippet.path)
    if (!moduleFindings.has(modName)) moduleFindings.set(modName, [])
    moduleFindings.get(modName)!.push(
      `- \`${snippet.path}\` (L${snippet.startLine}): discovered via pipeline`
    )
  }

  const timestamp = new Date().toISOString()

  for (const [modName, findings] of moduleFindings) {
    const addition = `#### Incremental Discovery (${timestamp.slice(0, 10)})\n${findings.join('\n')}`
    appendToModule(repoFullName, modName, addition)
  }

  // Update meta
  try {
    const metaFile = metaPath(repoFullName)
    const meta: KnowledgeMeta = existsSync(metaFile)
      ? JSON.parse(readFileSync(metaFile, 'utf-8'))
      : { repoFullName, lastFullScanAt: null, lastFullScanCommit: null, lastIncrementalAt: null, lastIncrementalCommit: null, moduleCount: 0, profileVersion: 0 }

    meta.lastIncrementalAt = timestamp

    if (localPath) {
      try {
        meta.lastIncrementalCommit = execSync('git rev-parse --short HEAD', {
          cwd: localPath,
          encoding: 'utf-8',
          timeout: 5000,
        }).trim()
      } catch { /* ignore */ }
    }

    saveMeta(repoFullName, meta)
  } catch { /* ignore */ }
}

function pathToModuleName(filePath: string): string {
  const clean = filePath.replace(/^\.\//, '')
  const parts = clean.split('/')
  // Use first 2 directory levels as module name: "src/main/foo.ts" → "src-main"
  if (parts.length >= 3) return `${parts[0]}-${parts[1]}`
  if (parts.length === 2) return parts[0]
  return 'root'
}

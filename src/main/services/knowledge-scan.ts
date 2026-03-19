/**
 * Full-scan service — builds comprehensive knowledge base for a repository.
 *
 * Spawns multiple Claude CLI calls in parallel (one per module), then
 * generates a unified profile.md from the results.
 */

import { execSync } from 'child_process'
import { existsSync, readFileSync, statSync } from 'fs'
import { join } from 'path'
import { spawn } from 'child_process'
import { writeFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { getShellEnv } from './shell-env'
import {
  ensureKnowledgeDir,
  saveProfile,
  saveModule,
  saveMeta,
  type KnowledgeMeta,
} from './knowledge-base'

// ─── Types ───

export interface ScanProgress {
  phase: 'collecting' | 'analyzing' | 'profiling' | 'done' | 'error'
  totalModules: number
  completedModules: number
  currentModule: string | null
  error: string | null
}

interface ModuleInfo {
  name: string
  dirPath: string   // relative to repo root
  files: string[]
  keyFiles: Array<{ path: string; preview: string }>
}

// Active scans for progress tracking
const activeScans = new Map<string, ScanProgress>()

export function getScanProgress(repoFullName: string): ScanProgress | null {
  return activeScans.get(repoFullName) ?? null
}

// ─── Full scan orchestrator ───

export async function runFullScan(
  repoFullName: string,
  localPath: string,
  aiMode: 'mock' | 'claude-cli'
): Promise<void> {
  const progress: ScanProgress = {
    phase: 'collecting',
    totalModules: 0,
    completedModules: 0,
    currentModule: null,
    error: null,
  }
  activeScans.set(repoFullName, progress)

  try {
    ensureKnowledgeDir(repoFullName)

    // Phase 1: Collect repository structure
    const repoInfo = collectRepoInfo(localPath)
    const modules = identifyModules(localPath, repoInfo.tree)

    progress.phase = 'analyzing'
    progress.totalModules = modules.length

    // Phase 2: Analyze each module in parallel
    const moduleResults = await Promise.allSettled(
      modules.map(async (mod) => {
        progress.currentModule = mod.name
        const content = await analyzeModule(mod, localPath, repoInfo, aiMode)
        saveModule(repoFullName, mod.name, content)
        progress.completedModules++
        return { name: mod.name, content }
      })
    )

    const successfulModules = moduleResults
      .filter((r): r is PromiseFulfilledResult<{ name: string; content: string }> =>
        r.status === 'fulfilled'
      )
      .map((r) => r.value)

    // Phase 3: Generate unified profile
    progress.phase = 'profiling'
    progress.currentModule = null

    const profileContent = await generateProfile(
      repoFullName,
      localPath,
      repoInfo,
      successfulModules,
      aiMode
    )
    saveProfile(repoFullName, profileContent)

    // Save meta
    let currentCommit: string | null = null
    try {
      currentCommit = execSync('git rev-parse --short HEAD', {
        cwd: localPath,
        encoding: 'utf-8',
        timeout: 5000,
      }).trim()
    } catch { /* ignore */ }

    const meta: KnowledgeMeta = {
      repoFullName,
      lastFullScanAt: new Date().toISOString(),
      lastFullScanCommit: currentCommit,
      lastIncrementalAt: null,
      lastIncrementalCommit: null,
      moduleCount: successfulModules.length,
      profileVersion: 1,
    }
    saveMeta(repoFullName, meta)

    progress.phase = 'done'
  } catch (err) {
    progress.phase = 'error'
    progress.error = err instanceof Error ? err.message : String(err)
    throw err
  } finally {
    // Keep progress for a while for UI polling, then clean up
    setTimeout(() => activeScans.delete(repoFullName), 30000)
  }
}

// ─── Phase 1: Collect repo info ───

interface RepoInfo {
  tree: string[]
  techStack: string[]
  packageJson: Record<string, unknown> | null
  configFiles: Array<{ name: string; content: string }>
}

function collectRepoInfo(localPath: string): RepoInfo {
  // Get full tree (depth 5, excluding common non-source dirs)
  let treeOutput = ''
  try {
    treeOutput = execSync(
      'find . -maxdepth 5 -type f ' +
      '-not -path "*/node_modules/*" ' +
      '-not -path "*/.git/*" ' +
      '-not -path "*/dist/*" ' +
      '-not -path "*/build/*" ' +
      '-not -path "*/.next/*" ' +
      '-not -path "*/out/*" ' +
      '-not -path "*/__pycache__/*" ' +
      '-not -path "*/vendor/*" ' +
      '-not -path "*/.venv/*" ' +
      '-not -path "*/target/*" ' +
      '| sort',
      { cwd: localPath, encoding: 'utf-8', timeout: 30000 }
    ).trim()
  } catch { /* ignore */ }

  const tree = treeOutput.split('\n').filter(Boolean)

  // Tech stack detection
  const techStack = detectTechStackFull(localPath)

  // Read package.json if exists
  let packageJson: Record<string, unknown> | null = null
  const pkgPath = join(localPath, 'package.json')
  if (existsSync(pkgPath)) {
    try {
      packageJson = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    } catch { /* ignore */ }
  }

  // Read key config files
  const configNames = [
    'tsconfig.json', 'pyproject.toml', 'Cargo.toml', 'go.mod',
    'docker-compose.yml', 'Dockerfile',
    '.eslintrc.js', '.eslintrc.json', 'eslint.config.mjs',
  ]
  const configFiles: Array<{ name: string; content: string }> = []
  for (const name of configNames) {
    const p = join(localPath, name)
    if (existsSync(p)) {
      try {
        const content = readFileSync(p, 'utf-8').slice(0, 2000)
        configFiles.push({ name, content })
      } catch { /* ignore */ }
    }
  }

  return { tree, techStack, packageJson, configFiles }
}

function detectTechStackFull(localPath: string): string[] {
  const stack: string[] = []
  const checks: Array<[string, string]> = [
    ['package.json', 'Node.js'],
    ['tsconfig.json', 'TypeScript'],
    ['pyproject.toml', 'Python'],
    ['Cargo.toml', 'Rust'],
    ['go.mod', 'Go'],
    ['Gemfile', 'Ruby'],
    ['pom.xml', 'Java/Maven'],
    ['build.gradle', 'Java/Gradle'],
    ['composer.json', 'PHP'],
    ['Dockerfile', 'Docker'],
    ['docker-compose.yml', 'Docker Compose'],
    ['.github/workflows', 'GitHub Actions'],
    ['next.config.js', 'Next.js'], ['next.config.ts', 'Next.js'],
    ['vite.config.ts', 'Vite'], ['vite.config.js', 'Vite'],
    ['tailwind.config.ts', 'TailwindCSS'], ['tailwind.config.js', 'TailwindCSS'],
    ['drizzle.config.ts', 'Drizzle ORM'],
    ['prisma/schema.prisma', 'Prisma'],
    ['electron-builder.yml', 'Electron'],
    ['playwright.config.ts', 'Playwright'],
    ['vitest.config.ts', 'Vitest'],
    ['jest.config.ts', 'Jest'], ['jest.config.js', 'Jest'],
  ]

  for (const [file, tech] of checks) {
    if (existsSync(join(localPath, file))) stack.push(tech)
  }

  const pkgPath = join(localPath, 'package.json')
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies }
      const depsChecks: Array<[string, string]> = [
        ['react', 'React'], ['vue', 'Vue'], ['@angular/core', 'Angular'],
        ['express', 'Express'], ['fastify', 'Fastify'], ['hono', 'Hono'],
        ['drizzle-orm', 'Drizzle ORM'], ['@prisma/client', 'Prisma'],
        ['@tanstack/react-query', 'TanStack Query'],
        ['@tanstack/react-router', 'TanStack Router'],
        ['zustand', 'Zustand'], ['jotai', 'Jotai'], ['@reduxjs/toolkit', 'Redux Toolkit'],
      ]
      for (const [dep, tech] of depsChecks) {
        if (allDeps[dep]) stack.push(tech)
      }
    } catch { /* ignore */ }
  }

  return [...new Set(stack)]
}

// ─── Phase 1b: Identify modules ───

function identifyModules(localPath: string, tree: string[]): ModuleInfo[] {
  // Group files by first 2 directory levels
  const groups = new Map<string, string[]>()

  for (const file of tree) {
    const clean = file.replace(/^\.\//, '')
    const parts = clean.split('/')
    let groupKey: string

    if (parts.length >= 3) {
      groupKey = `${parts[0]}/${parts[1]}`
    } else if (parts.length === 2) {
      groupKey = parts[0]
    } else {
      groupKey = 'root'
    }

    if (!groups.has(groupKey)) groups.set(groupKey, [])
    groups.get(groupKey)!.push(clean)
  }

  // Filter out groups with very few files or non-source directories
  const skipDirs = new Set(['node_modules', '.git', 'dist', 'build', 'out', '.next', '__pycache__'])

  const modules: ModuleInfo[] = []
  for (const [dirPath, files] of groups) {
    const topDir = dirPath.split('/')[0]
    if (skipDirs.has(topDir)) continue
    if (files.length < 2 && dirPath !== 'root') continue

    // Read key files (first 80 lines of important files)
    const sourceExts = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.rb', '.java']
    const keyFiles: Array<{ path: string; preview: string }> = []

    const importantFiles = files
      .filter((f) => sourceExts.some((ext) => f.endsWith(ext)))
      .slice(0, 10)

    for (const file of importantFiles) {
      const fullPath = join(localPath, file)
      try {
        if (!existsSync(fullPath)) continue
        const stat = statSync(fullPath)
        if (stat.size > 50000) continue // skip large files
        const content = readFileSync(fullPath, 'utf-8')
        const lines = content.split('\n').slice(0, 80)
        keyFiles.push({ path: file, preview: lines.join('\n') })
      } catch { /* ignore */ }
    }

    modules.push({
      name: dirPath.replace(/\//g, '-'),
      dirPath,
      files,
      keyFiles,
    })
  }

  return modules
}

// ─── Phase 2: Analyze module (parallel) ───

async function analyzeModule(
  mod: ModuleInfo,
  _localPath: string,
  repoInfo: RepoInfo,
  aiMode: 'mock' | 'claude-cli'
): Promise<string> {
  if (aiMode === 'mock') {
    return generateMockModuleAnalysis(mod)
  }

  const fileList = mod.files.slice(0, 50).map((f) => `  ${f}`).join('\n')
  const keyFileContents = mod.keyFiles
    .slice(0, 5)
    .map((f) => `### ${f.path}\n\`\`\`\n${f.preview.slice(0, 1500)}\n\`\`\``)
    .join('\n\n')

  const prompt = `あなたはコードベース分析の専門家です。
以下のモジュール（ディレクトリ）を分析し、構造化されたMarkdownドキュメントを生成してください。

## 対象モジュール: ${mod.dirPath}
## 技術スタック: ${repoInfo.techStack.join(', ')}

## ファイル一覧
${fileList}

## 主要ファイルの内容
${keyFileContents}

## 出力形式（このMarkdown形式で出力してください）

# ${mod.dirPath}

## 役割
（このディレクトリの責務を1-2文で）

## 主要ファイル
| ファイル | 責務 |
|---------|------|
| path/to/file.ts | 何をするか |

## 公開API・Interface
（exportされている主要な関数・クラス・型を列挙）

## 依存関係
（このモジュールが依存する他モジュールやライブラリ）

## パターン・慣習
（このモジュールで使われているコーディングパターン）

## 注意事項
（開発者が知っておくべき注意点、既知の制約）

---
Markdownのみを出力してください。説明や前置きは不要です。`

  return await callClaude(prompt, 'claude-opus-4-6', 180000)
}

function generateMockModuleAnalysis(mod: ModuleInfo): string {
  const fileTable = mod.files
    .slice(0, 10)
    .map((f) => `| \`${f}\` | - |`)
    .join('\n')

  return `# ${mod.dirPath}

## 役割
このディレクトリは ${mod.dirPath} に関するコードを含みます。

## 主要ファイル
| ファイル | 責務 |
|---------|------|
${fileTable}

## 公開API・Interface
（モック: 実際のスキャンで生成されます）

## 依存関係
（モック: 実際のスキャンで生成されます）

## パターン・慣習
（モック: 実際のスキャンで生成されます）
`
}

// ─── Phase 3: Generate unified profile ───

async function generateProfile(
  repoFullName: string,
  _localPath: string,
  repoInfo: RepoInfo,
  modules: Array<{ name: string; content: string }>,
  aiMode: 'mock' | 'claude-cli'
): Promise<string> {
  if (aiMode === 'mock') {
    return generateMockProfile(repoFullName, repoInfo, modules)
  }

  const moduleSummaries = modules
    .map((m) => `### ${m.name}\n${m.content.slice(0, 500)}`)
    .join('\n\n')

  const configSummaries = repoInfo.configFiles
    .map((c) => `### ${c.name}\n\`\`\`\n${c.content.slice(0, 800)}\n\`\`\``)
    .join('\n\n')

  const treePreview = repoInfo.tree.slice(0, 80).join('\n')

  const prompt = `あなたはソフトウェアアーキテクトです。
リポジトリ全体の分析結果を統合し、高品質なプロファイルドキュメントを作成してください。
このドキュメントはAIがIssueを作成する際の知識ベースとして使用されます。

## リポジトリ: ${repoFullName}
## 技術スタック: ${repoInfo.techStack.join(', ')}

## ディレクトリ構造（一部）
\`\`\`
${treePreview}
\`\`\`

## 設定ファイル
${configSummaries}

## モジュール分析結果
${moduleSummaries}

## 出力形式（このMarkdown形式で出力してください）

# ${repoFullName} — Repository Profile

## 概要
（プロジェクトの目的と概要を2-3文で）

## 技術スタック
（使用技術の一覧と各技術の役割）

## アーキテクチャ
（レイヤー構成、データフロー、主要コンポーネントの関係）

## ディレクトリ構造
\`\`\`
（主要ディレクトリとその役割をツリー形式で）
\`\`\`

## 命名規約・コーディングパターン
（ファイル名、関数名、コンポーネント等の規約）

## データフロー
（リクエスト→処理→レスポンスなどの主要なデータフロー）

## 外部依存
（主要な外部ライブラリ・サービスとその用途）

## Issue作成時の注意点
（AIがIssueを作成する際に考慮すべき、このリポジトリ固有の事項）

---
Markdownのみを出力してください。説明や前置きは不要です。`

  return await callClaude(prompt, 'claude-opus-4-6', 300000)
}

function generateMockProfile(
  repoFullName: string,
  repoInfo: RepoInfo,
  modules: Array<{ name: string; content: string }>
): string {
  const treePreview = repoInfo.tree.slice(0, 30).join('\n')

  return `# ${repoFullName} — Repository Profile

## 概要
（モック: 実際のスキャンで生成されます）

## 技術スタック
${repoInfo.techStack.map((t) => `- ${t}`).join('\n')}

## アーキテクチャ
（モック: 実際のスキャンで生成されます）

## ディレクトリ構造
\`\`\`
${treePreview}
\`\`\`

## モジュール一覧
${modules.map((m) => `- **${m.name}**`).join('\n')}

## 命名規約・コーディングパターン
（モック: 実際のスキャンで生成されます）

## Issue作成時の注意点
（モック: 実際のスキャンで生成されます）
`
}

// ─── Claude CLI helper ───

function callClaude(prompt: string, model: string, timeout: number): Promise<string> {
  const tmpFile = join(tmpdir(), `kb-scan-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`)
  writeFileSync(tmpFile, prompt, 'utf-8')

  return new Promise((resolve, reject) => {
    const env = getShellEnv()
    const proc = spawn(
      'sh',
      ['-c', `claude -p --output-format text --model "${model}" --tools "" < "${tmpFile}"`],
      { env, stdio: ['ignore', 'pipe', 'pipe'], timeout }
    )

    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
    proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString() })

    proc.on('close', (code) => {
      try { unlinkSync(tmpFile) } catch { /* ignore */ }
      if (code !== 0) {
        reject(new Error(`claude CLI error (exit ${code}): ${stderr || stdout.slice(0, 200) || 'no output'}`))
      } else {
        resolve(stdout)
      }
    })

    proc.on('error', (err) => {
      try { unlinkSync(tmpFile) } catch { /* ignore */ }
      reject(new Error(`claude CLI spawn error: ${err.message}`))
    })
  })
}

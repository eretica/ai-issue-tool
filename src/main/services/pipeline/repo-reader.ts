import { execSync } from 'child_process'
import { existsSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

export interface RepoReadResult {
  structure: string[]
  relevantFiles: Array<{ path: string; reason: string }>
  codeSnippets: Array<{ path: string; content: string; startLine: number }>
  techStack: string[]
}

function execGit(cmd: string, cwd: string): string {
  try {
    return execSync(cmd, { cwd, encoding: 'utf-8', timeout: 30000 }).trim()
  } catch {
    return ''
  }
}

function detectTechStack(localPath: string): string[] {
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
    ['next.config.js', 'Next.js'],
    ['next.config.ts', 'Next.js'],
    ['vite.config.ts', 'Vite'],
    ['tailwind.config.ts', 'TailwindCSS'],
    ['tailwind.config.js', 'TailwindCSS'],
  ]

  for (const [file, tech] of checks) {
    if (existsSync(join(localPath, file))) {
      stack.push(tech)
    }
  }

  // Check package.json for frameworks
  const pkgPath = join(localPath, 'package.json')
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies }
      if (allDeps['react']) stack.push('React')
      if (allDeps['vue']) stack.push('Vue')
      if (allDeps['@angular/core']) stack.push('Angular')
      if (allDeps['express']) stack.push('Express')
      if (allDeps['fastify']) stack.push('Fastify')
      if (allDeps['electron']) stack.push('Electron')
      if (allDeps['drizzle-orm']) stack.push('Drizzle ORM')
      if (allDeps['prisma'] || allDeps['@prisma/client']) stack.push('Prisma')
    } catch {
      // ignore
    }
  }

  return [...new Set(stack)]
}

function getRepoStructure(localPath: string): string[] {
  // Get top-level directory listing
  const output = execGit(
    'find . -maxdepth 3 -type f -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*" -not -path "*/build/*" | sort | head -100',
    localPath
  )
  return output.split('\n').filter(Boolean)
}

function searchFiles(localPath: string, pattern: string, maxResults = 10): Array<{ path: string; line: string; lineNum: number }> {
  const output = execGit(
    `grep -rn --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.py" --include="*.go" --include="*.rs" -l "${pattern}" . 2>/dev/null | head -${maxResults}`,
    localPath
  )
  const files = output.split('\n').filter(Boolean)
  const results: Array<{ path: string; line: string; lineNum: number }> = []

  for (const file of files) {
    const grepOutput = execGit(
      `grep -n "${pattern}" "${file}" | head -3`,
      localPath
    )
    for (const match of grepOutput.split('\n').filter(Boolean)) {
      const colonIdx = match.indexOf(':')
      if (colonIdx > 0) {
        results.push({
          path: file.replace(/^\.\//, ''),
          line: match.slice(colonIdx + 1),
          lineNum: parseInt(match.slice(0, colonIdx), 10),
        })
      }
    }
  }

  return results
}

function readFileSnippet(localPath: string, filePath: string, startLine: number, lines = 30): string {
  const fullPath = join(localPath, filePath)
  if (!existsSync(fullPath)) return ''

  try {
    const stat = statSync(fullPath)
    if (stat.size > 100000) return '(file too large, skipped)'

    const content = readFileSync(fullPath, 'utf-8')
    const allLines = content.split('\n')
    const start = Math.max(0, startLine - 1)
    const end = Math.min(allLines.length, start + lines)
    return allLines.slice(start, end).join('\n')
  } catch {
    return ''
  }
}

export interface InvestigationStrategy {
  searchPatterns: string[]
  filePatterns: string[]
  focusAreas: string[]
}

function getStrategyForTemplate(templateSlug: string, hints: string[]): InvestigationStrategy {
  const basePatterns = hints.filter(Boolean)

  switch (templateSlug) {
    case 'bug':
      return {
        searchPatterns: [...basePatterns, 'throw new Error', 'catch', 'console.error', 'logger.error'],
        filePatterns: ['middleware', 'handler', 'route', 'controller'],
        focusAreas: ['error handling', 'input validation', 'edge cases'],
      }
    case 'feature':
      return {
        searchPatterns: [...basePatterns, 'interface', 'export function', 'export class'],
        filePatterns: ['model', 'schema', 'api', 'service', 'component'],
        focusAreas: ['data models', 'API endpoints', 'UI components'],
      }
    case 'improvement':
      return {
        searchPatterns: [...basePatterns, 'TODO', 'FIXME', 'HACK', 'performance'],
        filePatterns: ['test', 'spec', 'config'],
        focusAreas: ['test coverage', 'performance', 'code quality'],
      }
    default:
      return {
        searchPatterns: basePatterns,
        filePatterns: [],
        focusAreas: [],
      }
  }
}

export function investigateRepo(
  localPath: string,
  templateSlug: string,
  investigationHints: string[]
): RepoReadResult {
  const strategy = getStrategyForTemplate(templateSlug, investigationHints)
  const structure = getRepoStructure(localPath)
  const techStack = detectTechStack(localPath)

  const relevantFiles: Array<{ path: string; reason: string }> = []
  const codeSnippets: Array<{ path: string; content: string; startLine: number }> = []
  const seenFiles = new Set<string>()

  // Search for each pattern
  for (const pattern of strategy.searchPatterns) {
    if (!pattern) continue
    const results = searchFiles(localPath, pattern, 5)
    for (const result of results) {
      if (!seenFiles.has(result.path)) {
        seenFiles.add(result.path)
        relevantFiles.push({
          path: result.path,
          reason: `Matches pattern: "${pattern}"`,
        })
        // Read snippet around the match
        const snippet = readFileSnippet(localPath, result.path, result.lineNum)
        if (snippet && snippet !== '(file too large, skipped)') {
          codeSnippets.push({
            path: result.path,
            content: snippet,
            startLine: Math.max(1, result.lineNum),
          })
        }
      }
    }

    // Limit total files
    if (relevantFiles.length >= 15) break
  }

  return {
    structure,
    relevantFiles: relevantFiles.slice(0, 15),
    codeSnippets: codeSnippets.slice(0, 10),
    techStack,
  }
}

// GitHub API fallback (when localPath is not available)
export async function investigateRepoViaGithub(
  fullName: string,
  _templateSlug: string,
  _investigationHints: string[]
): Promise<RepoReadResult> {
  // Use gh API to get basic repo info
  try {
    const treeOutput = execGit(
      `gh api repos/${fullName}/git/trees/HEAD?recursive=1 --jq '.tree[] | select(.type=="blob") | .path' 2>/dev/null | head -100`,
      process.cwd()
    )
    const structure = treeOutput.split('\n').filter(Boolean)

    return {
      structure,
      relevantFiles: [],
      codeSnippets: [],
      techStack: [],
    }
  } catch {
    return {
      structure: [],
      relevantFiles: [],
      codeSnippets: [],
      techStack: [],
    }
  }
}

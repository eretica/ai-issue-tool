export interface GitHubService {
  publishIssue(
    repo: string,
    title: string,
    body: string,
    labels: string[],
    assignees: string[]
  ): Promise<{ number: number; url: string }>

  fetchLabels(
    repo: string
  ): Promise<Array<{ id: number; name: string; color: string; description: string | null }>>
}

const DEFAULT_LABELS: Array<{
  id: number
  name: string
  color: string
  description: string | null
}> = [
  { id: 1, name: 'bug', color: 'd73a4a', description: "Something isn't working" },
  { id: 2, name: 'enhancement', color: 'a2eeef', description: 'New feature or request' },
  { id: 3, name: 'documentation', color: '0075ca', description: 'Improvements or additions to documentation' },
  { id: 4, name: 'good first issue', color: '7057ff', description: 'Good for newcomers' },
  { id: 5, name: 'help wanted', color: '008672', description: 'Extra attention is needed' },
  { id: 6, name: 'duplicate', color: 'cfd3d7', description: 'This issue or pull request already exists' },
  { id: 7, name: 'invalid', color: 'e4e669', description: "This doesn't seem right" },
  { id: 8, name: 'wontfix', color: 'ffffff', description: 'This will not be worked on' },
  { id: 9, name: 'priority:high', color: 'b60205', description: 'High priority' },
  { id: 10, name: 'priority:low', color: 'c2e0c6', description: 'Low priority' }
]

export class MockGitHubService implements GitHubService {
  private nextIssueNumber = 1

  async publishIssue(
    repo: string,
    title: string,
    _body: string,
    _labels: string[],
    _assignees: string[]
  ): Promise<{ number: number; url: string }> {
    const issueNumber = this.nextIssueNumber++
    return {
      number: issueNumber,
      url: `https://github.com/${repo}/issues/${issueNumber}`
    }
  }

  async fetchLabels(
    _repo: string
  ): Promise<Array<{ id: number; name: string; color: string; description: string | null }>> {
    return [...DEFAULT_LABELS]
  }

  /** Reset internal state (useful for tests) */
  reset(): void {
    this.nextIssueNumber = 1
  }
}

// ============ gh CLI Service ============

import { execFile } from 'child_process'
import { getShellEnv } from './shell-env'

function runGh(args: string[], stdin?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = execFile(
      'gh',
      args,
      { timeout: 30000, maxBuffer: 1024 * 1024, env: getShellEnv() },
      (err, stdout, stderr) => {
        if (err) {
          reject(new Error(`gh CLI error: ${err.message}${stderr ? ` | ${stderr.trim()}` : ''}`))
        } else {
          resolve(stdout.trim())
        }
      }
    )
    if (stdin) {
      proc.stdin?.write(stdin)
      proc.stdin?.end()
    }
  })
}

export class GhCliGitHubService implements GitHubService {
  async publishIssue(
    repo: string,
    title: string,
    body: string,
    labels: string[],
    assignees: string[]
  ): Promise<{ number: number; url: string }> {
    const args = [
      'issue', 'create',
      '--repo', repo,
      '--title', title,
      '--body', body,
    ]

    for (const label of labels) {
      args.push('--label', label)
    }
    for (const assignee of assignees) {
      args.push('--assignee', assignee)
    }

    // gh issue create returns the URL of the created issue
    const url = await runGh(args)

    // Extract issue number from URL: https://github.com/owner/repo/issues/123
    const match = url.match(/\/issues\/(\d+)/)
    const number = match ? parseInt(match[1], 10) : 0

    return { number, url }
  }

  async fetchLabels(
    repo: string
  ): Promise<Array<{ id: number; name: string; color: string; description: string | null }>> {
    const json = await runGh([
      'label', 'list',
      '--repo', repo,
      '--json', 'name,color,description',
      '--limit', '100',
    ])

    const labels = JSON.parse(json) as Array<{
      name: string
      color: string
      description: string
    }>

    return labels.map((l, i) => ({
      id: i + 1,
      name: l.name,
      color: l.color,
      description: l.description || null,
    }))
  }
}

export type GitHubMode = 'mock' | 'gh-cli'

export function createGitHubService(mode: GitHubMode = 'mock'): GitHubService {
  if (mode === 'gh-cli') {
    return new GhCliGitHubService()
  }
  return new MockGitHubService()
}

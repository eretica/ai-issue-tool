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

export function createGitHubService(): GitHubService {
  return new MockGitHubService()
}

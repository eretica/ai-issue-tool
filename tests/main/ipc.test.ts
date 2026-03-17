import { describe, it, expect, beforeEach } from 'vitest'
import { MockAiService } from '@main/services/ai-service'
import { MockGitHubService } from '@main/services/github-service'
import type { AiGenerateInput } from '@shared/types'

// ============ MockAiService Tests ============

describe('MockAiService', () => {
  let service: MockAiService

  beforeEach(() => {
    service = new MockAiService()
  })

  it('generates a bug report with correct structure', async () => {
    const input: AiGenerateInput = {
      templateSlug: 'bug',
      description: 'The login button does not respond when clicked'
    }
    const result = await service.generate(input)

    expect(result.title).toBe('[Bug] The login button does not respond when clicked')
    expect(result.body).toContain('## Bug Report')
    expect(result.body).toContain('### Description')
    expect(result.body).toContain('### Steps to Reproduce')
    expect(result.body).toContain('### Expected Behavior')
    expect(result.body).toContain('### Actual Behavior')
    expect(result.body).toContain('The login button does not respond when clicked')
    expect(result.model).toBe('mock-claude-3.5')
    expect(result.tokensUsed).toBeGreaterThan(0)
  })

  it('generates a feature request with correct structure', async () => {
    const input: AiGenerateInput = {
      templateSlug: 'feature',
      description: 'Add dark mode support to the settings page',
      targetPage: '/settings',
      figmaUrl: 'https://figma.com/file/abc123',
      figmaFrame: 'Dark Mode Settings'
    }
    const result = await service.generate(input)

    expect(result.title).toBe('[Feature] Add dark mode support to the settings page')
    expect(result.body).toContain('## Feature Request')
    expect(result.body).toContain('### Summary')
    expect(result.body).toContain('### Motivation')
    expect(result.body).toContain('### Proposed Solution')
    expect(result.body).toContain('### Acceptance Criteria')
    expect(result.body).toContain('Add dark mode support to the settings page')
    expect(result.body).toContain('/settings')
    expect(result.body).toContain('https://figma.com/file/abc123')
    expect(result.body).toContain('Dark Mode Settings')
  })

  it('generates an improvement with correct structure', async () => {
    const input: AiGenerateInput = {
      templateSlug: 'improvement',
      description: 'Optimize the dashboard loading time',
      designNotes: 'Consider lazy loading components'
    }
    const result = await service.generate(input)

    expect(result.title).toBe('[Improvement] Optimize the dashboard loading time')
    expect(result.body).toContain('## Improvement')
    expect(result.body).toContain('### Current Behavior')
    expect(result.body).toContain('### Proposed Improvement')
    expect(result.body).toContain('### Benefits')
    expect(result.body).toContain('### Implementation Notes')
    expect(result.body).toContain('Optimize the dashboard loading time')
    expect(result.body).toContain('Consider lazy loading components')
  })

  it('falls back to feature template for unknown slugs', async () => {
    const input: AiGenerateInput = {
      templateSlug: 'unknown-template',
      description: 'Some description'
    }
    const result = await service.generate(input)

    // Unknown template uses feature body structure
    expect(result.body).toContain('## Feature Request')
  })

  it('truncates long descriptions in the title', async () => {
    const longDescription =
      'This is a very long description that should be truncated in the title because it exceeds the maximum allowed character limit for issue titles'
    const input: AiGenerateInput = {
      templateSlug: 'bug',
      description: longDescription
    }
    const result = await service.generate(input)

    // Title should be truncated (prefix + 67 chars + ...)
    expect(result.title.length).toBeLessThanOrEqual(80)
    expect(result.title).toContain('...')
  })

  it('includes related issues in the body when provided', async () => {
    const input: AiGenerateInput = {
      templateSlug: 'bug',
      description: 'A bug description',
      relatedIssues: ['#42', '#100']
    }
    const result = await service.generate(input)

    expect(result.body).toContain('## Related Issues')
    expect(result.body).toContain('- #42')
    expect(result.body).toContain('- #100')
  })

  it('returns deterministic output for the same input', async () => {
    const input: AiGenerateInput = {
      templateSlug: 'feature',
      description: 'Add search functionality'
    }
    const result1 = await service.generate(input)
    const result2 = await service.generate(input)

    expect(result1.title).toBe(result2.title)
    expect(result1.body).toBe(result2.body)
    expect(result1.model).toBe(result2.model)
    expect(result1.tokensUsed).toBe(result2.tokensUsed)
  })
})

// ============ MockGitHubService Tests ============

describe('MockGitHubService', () => {
  let service: MockGitHubService

  beforeEach(() => {
    service = new MockGitHubService()
  })

  it('returns incrementing issue numbers for publishIssue', async () => {
    const result1 = await service.publishIssue('owner/repo', 'Title 1', 'Body 1', [], [])
    const result2 = await service.publishIssue('owner/repo', 'Title 2', 'Body 2', [], [])
    const result3 = await service.publishIssue('owner/repo', 'Title 3', 'Body 3', [], [])

    expect(result1.number).toBe(1)
    expect(result2.number).toBe(2)
    expect(result3.number).toBe(3)
  })

  it('returns correct URL format for publishIssue', async () => {
    const result = await service.publishIssue(
      'myorg/myrepo',
      'Test Issue',
      'Test body',
      ['bug'],
      ['user1']
    )

    expect(result.url).toBe('https://github.com/myorg/myrepo/issues/1')
  })

  it('returns a preset list of labels for fetchLabels', async () => {
    const labels = await service.fetchLabels('owner/repo')

    expect(labels.length).toBeGreaterThan(0)
    expect(labels.some((l) => l.name === 'bug')).toBe(true)
    expect(labels.some((l) => l.name === 'enhancement')).toBe(true)
    expect(labels.some((l) => l.name === 'documentation')).toBe(true)

    // Check label structure
    for (const label of labels) {
      expect(label).toHaveProperty('id')
      expect(label).toHaveProperty('name')
      expect(label).toHaveProperty('color')
      expect(label).toHaveProperty('description')
      expect(typeof label.id).toBe('number')
      expect(typeof label.name).toBe('string')
      expect(typeof label.color).toBe('string')
    }
  })

  it('returns a new array each time for fetchLabels (no mutation)', async () => {
    const labels1 = await service.fetchLabels('owner/repo')
    const labels2 = await service.fetchLabels('owner/repo')

    expect(labels1).not.toBe(labels2)
    expect(labels1).toEqual(labels2)
  })

  it('resets state correctly', async () => {
    await service.publishIssue('owner/repo', 'Title 1', 'Body', [], [])
    await service.publishIssue('owner/repo', 'Title 2', 'Body', [], [])

    service.reset()

    const result = await service.publishIssue('owner/repo', 'Title 3', 'Body', [], [])
    expect(result.number).toBe(1)
  })
})

// ============ IPC Handler Registration Tests ============

describe('IPC Handler Registration', () => {
  it('registerIpcHandlers exports a function', async () => {
    const handlers = await import('@main/ipc/handlers')
    expect(typeof handlers.registerIpcHandlers).toBe('function')
  })
})

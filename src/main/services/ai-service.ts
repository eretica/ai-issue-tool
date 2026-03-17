import type { AiGenerateInput, AiGenerateResult } from '@shared/types'

export interface AiService {
  generate(input: AiGenerateInput): Promise<AiGenerateResult>
}

function generateBugBody(input: AiGenerateInput): string {
  const page = input.targetPage ? `**Page**: ${input.targetPage}` : ''
  const figma = input.figmaUrl ? `**Figma**: ${input.figmaUrl}` : ''
  const related =
    input.relatedIssues && input.relatedIssues.length > 0
      ? `## Related Issues\n${input.relatedIssues.map((i) => `- ${i}`).join('\n')}`
      : ''

  return `## Bug Report

### Description
${input.description}

### Steps to Reproduce
1. Navigate to the affected area
2. Perform the action described above
3. Observe the unexpected behavior

### Expected Behavior
The feature should work as documented without errors.

### Actual Behavior
${input.description}

### Environment
- OS: (to be filled)
- Browser/App version: (to be filled)

${page}
${figma}

${related}`.trim()
}

function generateFeatureBody(input: AiGenerateInput): string {
  const page = input.targetPage ? `**Target Page**: ${input.targetPage}` : ''
  const figma = input.figmaUrl
    ? `## Design\n- Figma: ${input.figmaUrl}${input.figmaFrame ? ` (Frame: ${input.figmaFrame})` : ''}`
    : ''
  const designNotes = input.designNotes ? `### Design Notes\n${input.designNotes}` : ''
  const related =
    input.relatedIssues && input.relatedIssues.length > 0
      ? `## Related Issues\n${input.relatedIssues.map((i) => `- ${i}`).join('\n')}`
      : ''

  return `## Feature Request

### Summary
${input.description}

${page}

### Motivation
This feature would improve the user experience by addressing the needs described above.

### Proposed Solution
Implement the feature as described, following the existing patterns in the codebase.

### Acceptance Criteria
- [ ] Feature is implemented as described
- [ ] Unit tests are added
- [ ] Documentation is updated

${figma}
${designNotes}

${related}`.trim()
}

function generateImprovementBody(input: AiGenerateInput): string {
  const page = input.targetPage ? `**Target Page**: ${input.targetPage}` : ''
  const related =
    input.relatedIssues && input.relatedIssues.length > 0
      ? `## Related Issues\n${input.relatedIssues.map((i) => `- ${i}`).join('\n')}`
      : ''

  return `## Improvement

### Current Behavior
The existing implementation works but can be improved.

### Proposed Improvement
${input.description}

${page}

### Benefits
- Better user experience
- Improved maintainability
- Enhanced performance

### Implementation Notes
${input.designNotes || 'No additional design notes provided.'}

${related}`.trim()
}

function generateTitle(input: AiGenerateInput): string {
  const desc = input.description.trim()
  // Take the first sentence or first 80 chars
  const firstSentence = desc.split(/[.!?\n]/)[0].trim()
  const prefix =
    input.templateSlug === 'bug'
      ? '[Bug] '
      : input.templateSlug === 'feature'
        ? '[Feature] '
        : '[Improvement] '

  const titleBody = firstSentence.length > 70 ? firstSentence.slice(0, 67) + '...' : firstSentence
  return prefix + titleBody
}

export class MockAiService implements AiService {
  async generate(input: AiGenerateInput): Promise<AiGenerateResult> {
    const title = generateTitle(input)

    let body: string
    switch (input.templateSlug) {
      case 'bug':
        body = generateBugBody(input)
        break
      case 'feature':
        body = generateFeatureBody(input)
        break
      case 'improvement':
        body = generateImprovementBody(input)
        break
      default:
        body = generateFeatureBody(input)
        break
    }

    const tokensUsed = Math.floor((input.description.length + body.length) / 4)

    return {
      title,
      body,
      model: 'mock-claude-3.5',
      tokensUsed
    }
  }
}

export function createAiService(): AiService {
  return new MockAiService()
}

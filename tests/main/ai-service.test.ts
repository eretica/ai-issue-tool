import { describe, it, expect } from 'vitest'
import { MockAiService } from '@main/services/ai-service'
import type { AiGenerateInput } from '@shared/types'

describe('MockAiService', () => {
  const service = new MockAiService()

  const bugInput: AiGenerateInput = {
    templateSlug: 'bug',
    description: 'ログインページで500エラーが発生する',
    generationMode: 'ai_doc',
    targetPage: '/login',
    designNotes: 'セキュリティ上の考慮が必要',
  }

  const featureInput: AiGenerateInput = {
    templateSlug: 'feature',
    description: 'ダークモードを実装する',
    generationMode: 'ai_doc',
    figmaUrl: 'https://figma.com/file/xxx',
    figmaFrame: 'DarkMode',
  }

  describe('ai_doc mode', () => {
    it('generates bug template with investigation phases', async () => {
      const result = await service.generate(bugInput)
      expect(result.title).toContain('[Bug]')
      expect(result.body).toContain('実装計画: バグ修正')
      expect(result.body).toContain('再現・調査')
      expect(result.body).toContain('受け入れ条件')
      expect(result.body).toContain('バグが再現しなくなっている')
    })

    it('generates feature template with design phases', async () => {
      const result = await service.generate(featureInput)
      expect(result.title).toContain('[Feature]')
      expect(result.body).toContain('実装計画: 新機能')
      expect(result.body).toContain('設計・調査')
      expect(result.body).toContain('UI層の実装')
    })

    it('generates improvement template', async () => {
      const result = await service.generate({
        ...bugInput,
        templateSlug: 'improvement',
        generationMode: 'ai_doc',
      })
      expect(result.title).toContain('[Improvement]')
      expect(result.body).toContain('実装計画: 改善')
      expect(result.body).toContain('現状分析')
    })

    it('includes context fields', async () => {
      const result = await service.generate(bugInput)
      expect(result.body).toContain('/login')
      expect(result.body).toContain('セキュリティ上の考慮')
    })

    it('includes figma reference', async () => {
      const result = await service.generate(featureInput)
      expect(result.body).toContain('figma.com')
      expect(result.body).toContain('DarkMode')
    })

    it('includes related issues', async () => {
      const result = await service.generate({
        ...bugInput,
        relatedIssues: ['#123', '#456'],
      })
      expect(result.body).toContain('#123')
      expect(result.body).toContain('#456')
    })

    it('includes context URLs', async () => {
      const result = await service.generate({
        ...bugInput,
        contextUrls: ['https://example.com/docs'],
      })
      expect(result.body).toContain('https://example.com/docs')
    })
  })

  describe('human_doc mode', () => {
    it('generates concise bug report', async () => {
      const result = await service.generate({
        ...bugInput,
        generationMode: 'human_doc',
      })
      expect(result.body).toContain('バグ報告')
      expect(result.body).toContain('受け入れ条件')
      expect(result.body).not.toContain('Phase 1')
    })

    it('generates concise feature request', async () => {
      const result = await service.generate({
        ...featureInput,
        generationMode: 'human_doc',
      })
      expect(result.body).toContain('機能要望')
      expect(result.body).toContain('受け入れ条件')
    })

    it('generates concise improvement proposal', async () => {
      const result = await service.generate({
        ...bugInput,
        templateSlug: 'improvement',
        generationMode: 'human_doc',
      })
      expect(result.body).toContain('改善提案')
      expect(result.body).toContain('既存機能に影響がない')
    })
  })

  describe('title generation', () => {
    it('truncates long descriptions', async () => {
      const result = await service.generate({
        ...bugInput,
        description: 'a'.repeat(200),
      })
      expect(result.title.length).toBeLessThanOrEqual(80)
    })

    it('takes first sentence for title', async () => {
      const result = await service.generate({
        ...bugInput,
        description: 'First sentence. Second sentence.',
      })
      expect(result.title).toContain('First sentence')
      expect(result.title).not.toContain('Second')
    })
  })

  describe('metadata', () => {
    it('returns model name', async () => {
      const result = await service.generate(bugInput)
      expect(result.model).toBe('mock-claude-3.5')
    })

    it('calculates token usage', async () => {
      const result = await service.generate(bugInput)
      expect(result.tokensUsed).toBeGreaterThan(0)
      expect(typeof result.tokensUsed).toBe('number')
    })
  })
})

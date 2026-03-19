import { describe, it, expect, beforeEach } from 'vitest'
import { mockStore } from '@renderer/lib/mock-store'
import type { AiGenerateInput } from '@shared/types'

describe('AI generation (mock-store)', () => {
  beforeEach(() => {
    mockStore.reset()
  })

  const baseInput: AiGenerateInput = {
    templateSlug: 'bug',
    description: 'ログインページで500エラーが発生する',
    generationMode: 'ai_doc',
    targetPage: '/login',
  }

  describe('ai_doc mode', () => {
    it('generates title with template prefix', () => {
      const result = mockStore.ai.generate(baseInput)
      expect(result.title).toContain('[バグ報告]')
      expect(result.title).toContain('ログインページ')
    })

    it('generates implementation plan body', () => {
      const result = mockStore.ai.generate(baseInput)
      expect(result.body).toContain('実装計画')
      expect(result.body).toContain('Phase 1')
      expect(result.body).toContain('受け入れ条件')
    })

    it('returns model and tokensUsed', () => {
      const result = mockStore.ai.generate(baseInput)
      expect(result.model).toBe('mock-browser')
      expect(result.tokensUsed).toBeGreaterThan(0)
    })

    it('includes target page in body', () => {
      const result = mockStore.ai.generate(baseInput)
      expect(result.body).toContain('/login')
    })
  })

  describe('human_doc mode', () => {
    it('generates concise overview body', () => {
      const result = mockStore.ai.generate({
        ...baseInput,
        generationMode: 'human_doc',
      })
      expect(result.body).toContain('概要')
      expect(result.body).toContain('受け入れ条件')
      expect(result.body).not.toContain('Phase 1')
    })

    it('includes title with template prefix', () => {
      const result = mockStore.ai.generate({
        ...baseInput,
        generationMode: 'human_doc',
      })
      expect(result.title).toContain('[バグ報告]')
    })
  })

  describe('different templates', () => {
    it('uses feature template title prefix', () => {
      const result = mockStore.ai.generate({
        ...baseInput,
        templateSlug: 'feature',
      })
      expect(result.title).toContain('[機能要望]')
    })

    it('uses improvement template title prefix', () => {
      const result = mockStore.ai.generate({
        ...baseInput,
        templateSlug: 'improvement',
      })
      expect(result.title).toContain('[改善提案]')
    })

    it('truncates long descriptions in title', () => {
      const longDesc = 'これは非常に長い説明文です。'.repeat(10)
      const result = mockStore.ai.generate({
        ...baseInput,
        description: longDesc,
      })
      expect(result.title.length).toBeLessThanOrEqual(80)
    })
  })
})

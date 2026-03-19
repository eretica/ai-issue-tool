import type { AiPipelineInput, ClassificationResult } from '../types'

export function buildClassifyPrompt(input: AiPipelineInput): string {
  return `あなたはGitHub Issueの分類アシスタントです。
以下の入力を分析し、複雑度と調査戦略を判定してください。

## 入力
- テンプレート: ${input.templateSlug}
- 説明: ${input.description}
${input.targetPage ? `- 対象ページ: ${input.targetPage}` : ''}
${input.designNotes ? `- デザインメモ: ${input.designNotes}` : ''}
${input.contextUrls?.length ? `- 参考URL: ${input.contextUrls.join(', ')}` : ''}

## 判定基準
- simple: 明確な1つの変更、コード調査不要
- moderate: 複数ファイルに影響、調査推奨
- complex: アーキテクチャ変更、深い調査必要

## 出力ルール（厳守）
まず <reasoning> タグ内に、あなたの分析過程を日本語で記述してください（判断根拠、考慮した要素、複雑度の理由など）。
その後、JSON形式で結果を出力してください。コードフェンスは不要。

<reasoning>
ここに分析過程を記述
</reasoning>
{
  "complexity": "simple" | "moderate" | "complex",
  "bloomLevel": 2,
  "investigationNeeded": true | false,
  "investigationHints": ["検索すべきキーワード1", "関連ファイルパターン2"],
  "suggestedLabels": ["bug", "enhancement"],
  "estimatedScope": "影響範囲の説明"
}`
}

export function parseClassifyResponse(raw: string): ClassificationResult {
  const firstBrace = raw.indexOf('{')
  const lastBrace = raw.lastIndexOf('}')

  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      const parsed = JSON.parse(raw.slice(firstBrace, lastBrace + 1))
      return {
        complexity: parsed.complexity ?? 'moderate',
        bloomLevel: parsed.bloomLevel ?? 3,
        investigationNeeded: parsed.investigationNeeded ?? true,
        investigationHints: parsed.investigationHints ?? [],
        suggestedLabels: parsed.suggestedLabels ?? [],
        estimatedScope: parsed.estimatedScope ?? '',
      }
    } catch {
      // fallback
    }
  }

  // Default: moderate complexity, investigation needed
  return {
    complexity: 'moderate',
    bloomLevel: 3,
    investigationNeeded: true,
    investigationHints: [],
    suggestedLabels: [],
    estimatedScope: 'Unable to parse classification',
  }
}

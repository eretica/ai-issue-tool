import type {
  AiPipelineInput,
  ClassificationResult,
  InvestigationResult,
  GenerateResult,
  QcResult,
} from '../types'

export function buildQcPrompt(
  input: AiPipelineInput,
  classification: ClassificationResult,
  _investigation: InvestigationResult | null,
  generated: GenerateResult
): string {
  return `あなたはGitHub Issueの品質チェッカーです。
生成されたIssueの品質を評価し、改善点を指摘してください。

## 元の入力
- テンプレート: ${input.templateSlug}
- 説明: ${input.description}
- 生成モード: ${input.generationMode}
- 複雑度: ${classification.complexity}

## 生成結果
### タイトル
${generated.title}

### 本文
${generated.body}

## 評価基準
1. タイトルは簡潔で内容を的確に表現しているか（10点）
2. 本文に必要なセクション（概要、手順、受け入れ条件等）があるか（20点）
3. 説明が具体的で実行可能か（20点）
4. Markdown形式が正しいか（10点）
5. 入力情報が適切に反映されているか（20点）
6. テンプレートの意図に沿っているか（20点）

## 出力ルール（厳守）
まず <reasoning> タグ内に、あなたの品質評価過程を日本語で記述してください（各評価基準の採点根拠、発見した問題点の分析、改善案の検討過程など）。
その後、JSON形式で結果を出力してください。コードフェンスは不要。

<reasoning>
ここに品質評価の過程を記述
</reasoning>
{
  "passed": true,
  "score": 85,
  "issues": [
    {"severity": "warning", "message": "受け入れ条件が不足"}
  ],
  "suggestions": ["具体的な改善提案1"],
  "revisedTitle": "改善されたタイトル（変更不要ならnull）",
  "revisedBody": "改善された本文（変更不要ならnull）"
}`
}

export function parseQcResponse(raw: string): QcResult {
  const firstBrace = raw.indexOf('{')
  const lastBrace = raw.lastIndexOf('}')

  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      const parsed = JSON.parse(raw.slice(firstBrace, lastBrace + 1))
      return {
        passed: parsed.passed ?? true,
        score: parsed.score ?? 70,
        issues: parsed.issues ?? [],
        suggestions: parsed.suggestions ?? [],
        revisedTitle: parsed.revisedTitle ?? undefined,
        revisedBody: parsed.revisedBody ?? undefined,
      }
    } catch {
      // fallback
    }
  }

  return {
    passed: true,
    score: 70,
    issues: [],
    suggestions: [],
  }
}

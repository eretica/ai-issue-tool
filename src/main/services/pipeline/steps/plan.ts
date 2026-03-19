import type { AiPipelineInput, ClassificationResult, InvestigationResult, PlanResult } from '../types'
import { formatInvestigationForPrompt } from './investigate'

export function buildPlanPrompt(
  input: AiPipelineInput,
  classification: ClassificationResult,
  investigation: InvestigationResult | null
): string {
  const investigationSection = investigation
    ? `\n## 調査結果\n${formatInvestigationForPrompt(investigation)}`
    : ''

  return `あなたはGitHub Issueの生成計画を立てるアシスタントです。
分類結果と調査結果を基に、Issue生成の方針を決定してください。

## 分類結果
- 複雑度: ${classification.complexity}
- Bloomレベル: ${classification.bloomLevel}
- 推奨ラベル: ${classification.suggestedLabels.join(', ') || 'なし'}
- 影響範囲: ${classification.estimatedScope}

## 入力情報
- テンプレート: ${input.templateSlug}
- 生成モード: ${input.generationMode}
- 説明: ${input.description}
${input.targetPage ? `- 対象ページ: ${input.targetPage}` : ''}
${input.designNotes ? `- デザインメモ: ${input.designNotes}` : ''}
${investigationSection}

## 出力ルール（厳守）
まず <reasoning> タグ内に、あなたの計画立案過程を日本語で記述してください（調査結果の解釈、方針決定の理由、考慮した代替案など）。
その後、JSON形式で結果を出力してください。コードフェンスは不要。

<reasoning>
ここに計画立案の過程を記述
</reasoning>
{
  "approach": "standard",
  "titleGuidance": "タイトルの方向性",
  "sectionPlan": [
    {"section": "概要", "guidance": "記載すべき内容"},
    {"section": "実装計画", "guidance": "記載すべき内容"}
  ],
  "keyFindings": ["調査で発見した重要事項1"],
  "modelForGeneration": "opus"
}`
}

export function parsePlanResponse(raw: string): PlanResult {
  const firstBrace = raw.indexOf('{')
  const lastBrace = raw.lastIndexOf('}')

  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      const parsed = JSON.parse(raw.slice(firstBrace, lastBrace + 1))
      return {
        approach: parsed.approach ?? 'standard',
        titleGuidance: parsed.titleGuidance ?? '',
        sectionPlan: parsed.sectionPlan ?? [],
        keyFindings: parsed.keyFindings ?? [],
        modelForGeneration: parsed.modelForGeneration ?? 'opus',
      }
    } catch {
      // fallback
    }
  }

  return {
    approach: 'standard',
    titleGuidance: '',
    sectionPlan: [],
    keyFindings: [],
    modelForGeneration: 'opus',
  }
}

import type {
  AiPipelineInput,
  ClassificationResult,
  InvestigationResult,
  PlanResult,
  GenerateResult,
} from '../types'
import { formatInvestigationForPrompt } from './investigate'

export function buildGeneratePrompt(
  input: AiPipelineInput,
  classification: ClassificationResult,
  investigation: InvestigationResult | null,
  plan: PlanResult
): string {
  const modeDesc =
    input.generationMode === 'ai_doc'
      ? `AI向けドキュメント（実装計画）を生成してください。
以下を含めること:
- 明確なPhase分け（調査→実装→テスト）
- 各Phaseにチェックリスト形式のタスク
- 受け入れ条件（チェックリスト形式）
- ファイルパスやコード例があれば具体的に`
      : `人間向けドキュメント（業務指示書）を生成してください。
以下を含めること:
- 概要（目的・背景を簡潔に）
- 受け入れ条件（チェックリスト形式）
- 実装詳細は不要（担当者に委ねる）`

  const templateName =
    input.templateSlug === 'bug' ? 'バグ修正' :
    input.templateSlug === 'feature' ? '新機能開発' : '改善'

  const investigationSection = investigation
    ? `\n## コード調査結果\n${formatInvestigationForPrompt(investigation)}`
    : ''

  const planSection = plan.sectionPlan.length > 0
    ? `\n## 生成方針\n${plan.sectionPlan.map((s) => `- **${s.section}**: ${s.guidance}`).join('\n')}`
    : ''

  const findingsSection = plan.keyFindings.length > 0
    ? `\n## 重要な発見\n${plan.keyFindings.map((f) => `- ${f}`).join('\n')}`
    : ''

  const contextParts: string[] = []
  if (input.targetPage) contextParts.push(`対象ページ: ${input.targetPage}`)
  if (input.figmaUrl) contextParts.push(`Figma: ${input.figmaUrl}${input.figmaFrame ? ` (フレーム: ${input.figmaFrame})` : ''}`)
  if (input.designNotes) contextParts.push(`デザインメモ: ${input.designNotes}`)
  if (input.relatedIssues?.length) contextParts.push(`関連Issue: ${input.relatedIssues.join(', ')}`)
  if (input.contextUrls?.length) contextParts.push(`参考URL: ${input.contextUrls.join(', ')}`)

  const contextSection = contextParts.length > 0
    ? `\n## 追加コンテキスト\n${contextParts.join('\n')}`
    : ''

  return `あなたはGitHub Issueの作成を支援するアシスタントです。
コード調査結果と生成方針に基づいて、高品質なIssueを生成してください。
ツールやファイルアクセスは使用できません。与えられた情報のみに基づいて生成してください。
質問や確認は一切不要です。必ずJSON出力のみを返してください。

## タスク
テンプレート「${templateName}」のGitHub Issueを作成してください。

${modeDesc}

## 入力情報
${input.description}

## 分類情報
- 複雑度: ${classification.complexity}
- 影響範囲: ${classification.estimatedScope}
${plan.titleGuidance ? `- タイトル方針: ${plan.titleGuidance}` : ''}
${investigationSection}
${planSection}
${findingsSection}
${contextSection}

## 出力ルール（厳守）
まず <reasoning> タグ内に、あなたの生成過程を日本語で記述してください（構成の意図、強調した点、入力からの変換ロジック、調査結果の活用方法など）。
その後、以下のJSON形式で結果を出力してください。コードフェンスで囲まないこと。

<reasoning>
ここに生成過程の思考を記述
</reasoning>
{"title": "Issueタイトル（[Bug]/[Feature]/[Improvement]プレフィックス付き、80文字以内）", "body": "Markdownフォーマットの本文"}`
}

export function parseGenerateResponse(raw: string): GenerateResult {
  const firstBrace = raw.indexOf('{')
  const lastBrace = raw.lastIndexOf('}')

  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      const parsed = JSON.parse(raw.slice(firstBrace, lastBrace + 1))
      if (typeof parsed.title === 'string' && typeof parsed.body === 'string') {
        return { title: parsed.title, body: parsed.body }
      }
    } catch {
      // fallback
    }
  }

  // Fallback: first line as title, rest as body
  const lines = raw.trim().split('\n')
  return {
    title: lines[0].replace(/^#+\s*/, '').slice(0, 80),
    body: lines.slice(1).join('\n').trim() || raw.trim(),
  }
}

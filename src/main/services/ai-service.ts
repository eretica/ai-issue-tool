import { spawn } from 'child_process'
import { writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import type { AiGenerateInput, AiGenerateResult } from '@shared/types'
import { getShellEnv } from './shell-env'

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

// ============ 共通ヘルパー ============

function formatContext(input: AiGenerateInput): string {
  const parts: string[] = []
  if (input.targetPage) parts.push(`- **対象ページ**: ${input.targetPage}`)
  if (input.figmaUrl) {
    parts.push(`- **Figma**: ${input.figmaUrl}${input.figmaFrame ? ` (フレーム: ${input.figmaFrame})` : ''}`)
  }
  if (input.designNotes) parts.push(`- **デザインメモ**: ${input.designNotes}`)
  return parts.length > 0 ? parts.join('\n') : '- 追加コンテキストなし'
}

function formatReferences(input: AiGenerateInput): string {
  const parts: string[] = []
  if (input.relatedIssues && input.relatedIssues.length > 0) {
    parts.push(`\n### 関連Issue\n${input.relatedIssues.map((i) => `- ${i}`).join('\n')}`)
  }
  if (input.contextUrls && input.contextUrls.length > 0) {
    parts.push(`\n### 参考資料\n${input.contextUrls.map((u) => `- ${u}`).join('\n')}`)
  }
  return parts.join('\n')
}

// ============ AI向けドキュメント生成（テンプレート別） ============

function generateAiDocBugBody(input: AiGenerateInput): string {
  return `## 実装計画: バグ修正

### 目的
${input.description}

### コンテキスト
${formatContext(input)}

### 調査・修正ステップ

#### Phase 1: 再現・調査
- [ ] バグの再現手順を確認
- [ ] エラーログ・コンソール出力を確認
- [ ] 影響を受けるコードパスを特定
- [ ] 原因の仮説を立てる

#### Phase 2: 修正
- [ ] ルートコーズの修正
- [ ] エッジケースの考慮
- [ ] リグレッションがないか確認

#### Phase 3: テスト・検証
- [ ] バグを再現するテストケースを追加
- [ ] 修正後にテストが通ることを確認
- [ ] 既存テストの通過確認
- [ ] 手動での動作確認

### 受け入れ条件
- [ ] バグが再現しなくなっている
- [ ] 再現テストが追加されている
- [ ] 既存テストが壊れていない
- [ ] TypeScriptの型エラーがない
${formatReferences(input)}`.trim()
}

function generateAiDocFeatureBody(input: AiGenerateInput): string {
  return `## 実装計画: 新機能

### 目的
${input.description}

### コンテキスト
${formatContext(input)}

### 実装ステップ

#### Phase 1: 設計・調査
- [ ] 既存コードの関連部分を調査
- [ ] データモデルの変更が必要か確認
- [ ] UIコンポーネントの設計方針を決定
- [ ] APIインターフェースの設計

#### Phase 2: 実装
- [ ] データ層の実装（型定義・スキーマ）
- [ ] ロジック層の実装（サービス・フック）
- [ ] UI層の実装（コンポーネント・ページ）
- [ ] ルーティングの追加（必要な場合）

#### Phase 3: テスト・検証
- [ ] ユニットテストの作成
- [ ] E2Eテストの作成
- [ ] 既存テストの通過確認
- [ ] 手動での動作確認

### 受け入れ条件
- [ ] 説明通りの機能が動作する
- [ ] ユニットテスト・E2Eテストが追加されている
- [ ] 既存テストが壊れていない
- [ ] TypeScriptの型エラーがない
- [ ] ESLintエラーがない
- [ ] レスポンシブデザインに対応している
${formatReferences(input)}`.trim()
}

function generateAiDocImprovementBody(input: AiGenerateInput): string {
  return `## 実装計画: 改善

### 目的
${input.description}

### コンテキスト
${formatContext(input)}

### 実装ステップ

#### Phase 1: 現状分析
- [ ] 改善対象のコードを特定
- [ ] 現在の挙動を確認
- [ ] パフォーマンスやUXの指標を記録（改善前）

#### Phase 2: 改善実装
- [ ] リファクタリング対象のコード変更
- [ ] UX/パフォーマンスの改善
- [ ] 後方互換性の確認

#### Phase 3: テスト・検証
- [ ] 既存テストの通過確認
- [ ] 改善後の指標を記録（改善後）
- [ ] 手動での動作確認

### 受け入れ条件
- [ ] 改善が説明通りに反映されている
- [ ] 既存テストが壊れていない
- [ ] パフォーマンス劣化がない
- [ ] TypeScriptの型エラーがない
${formatReferences(input)}`.trim()
}

function generateAiDocBody(input: AiGenerateInput): string {
  switch (input.templateSlug) {
    case 'bug':
      return generateAiDocBugBody(input)
    case 'feature':
      return generateAiDocFeatureBody(input)
    case 'improvement':
      return generateAiDocImprovementBody(input)
    default:
      return generateAiDocFeatureBody(input)
  }
}

// ============ 人間向けドキュメント生成（テンプレート別） ============

function generateHumanDocBugBody(input: AiGenerateInput): string {
  const page = input.targetPage ? `\n**発生ページ**: ${input.targetPage}` : ''
  return `## バグ報告

### 概要
${input.description}
${page}

### 受け入れ条件
- [ ] バグが再現しなくなっている
- [ ] テストが追加されている
- [ ] コードレビューが完了している
${formatReferences(input)}`.trim()
}

function generateHumanDocFeatureBody(input: AiGenerateInput): string {
  const page = input.targetPage ? `\n**対象ページ**: ${input.targetPage}` : ''
  const figma = input.figmaUrl ? `\n**デザイン**: ${input.figmaUrl}` : ''
  return `## 機能要望

### 概要
${input.description}
${page}
${figma}

### 受け入れ条件
- [ ] 機能が説明通りに動作する
- [ ] テストが追加されている
- [ ] コードレビューが完了している

${input.designNotes ? `### 備考\n${input.designNotes}\n` : ''}${formatReferences(input)}`.trim()
}

function generateHumanDocImprovementBody(input: AiGenerateInput): string {
  const page = input.targetPage ? `\n**対象ページ**: ${input.targetPage}` : ''
  return `## 改善提案

### 概要
${input.description}
${page}

### 受け入れ条件
- [ ] 改善が反映されている
- [ ] 既存機能に影響がない
- [ ] コードレビューが完了している

${input.designNotes ? `### 備考\n${input.designNotes}\n` : ''}${formatReferences(input)}`.trim()
}

function generateHumanDocBody(input: AiGenerateInput): string {
  switch (input.templateSlug) {
    case 'bug':
      return generateHumanDocBugBody(input)
    case 'feature':
      return generateHumanDocFeatureBody(input)
    case 'improvement':
      return generateHumanDocImprovementBody(input)
    default:
      return generateHumanDocFeatureBody(input)
  }
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

    if (input.generationMode === 'ai_doc') {
      body = generateAiDocBody(input)
    } else if (input.generationMode === 'human_doc') {
      body = generateHumanDocBody(input)
    } else {
      // Fallback: template-specific (legacy)
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

// ============ Claude CLI Service (claude -p) ============

function buildPrompt(input: AiGenerateInput): string {
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
ツールやファイルアクセスは使用できません。与えられた入力情報のみに基づいて生成してください。
質問や確認は一切不要です。必ずJSON出力のみを返してください。

## タスク
テンプレート「${templateName}」のGitHub Issueを作成してください。

${modeDesc}

## 入力情報
${input.description}
${contextSection}

## 出力ルール（厳守）
- 以下のJSON形式のみを出力すること
- JSON以外のテキスト（説明、質問、前置き、補足）は一切出力しないこと
- コードフェンス（\`\`\`json）で囲まないこと — 裸のJSONオブジェクトのみ

{"title": "Issueタイトル（[Bug]/[Feature]/[Improvement]プレフィックス付き、80文字以内）", "body": "Markdownフォーマットの本文"}`
}

function callClaudeCli(prompt: string): Promise<string> {
  // Write prompt to temp file to avoid stdin piping issues in Electron
  const tmpFile = join(tmpdir(), `ai-issue-prompt-${Date.now()}.txt`)
  writeFileSync(tmpFile, prompt, 'utf-8')

  return new Promise((resolve, reject) => {
    const env = getShellEnv()
    console.log('[claude-cli] using temp file:', tmpFile)

    const proc = spawn('sh', ['-c', `claude -p --output-format text --tools "" < "${tmpFile}"`], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 300000, // 5 minutes
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
    proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString() })

    proc.on('close', (code) => {
      // Clean up temp file
      try { unlinkSync(tmpFile) } catch { /* ignore */ }

      if (code !== 0) {
        console.error('[claude-cli] exit code:', code)
        console.error('[claude-cli] stderr:', stderr)
        console.error('[claude-cli] stdout (first 500):', stdout.slice(0, 500))
        reject(new Error(`claude CLI error (exit ${code}): ${stderr || stdout.slice(0, 200) || 'no output'}`))
      } else {
        console.log('[claude-cli] success, output length:', stdout.length)
        resolve(stdout)
      }
    })

    proc.on('error', (err) => {
      try { unlinkSync(tmpFile) } catch { /* ignore */ }
      reject(new Error(`claude CLI spawn error: ${err.message}`))
    })
  })
}

function parseClaudeResponse(raw: string): { title: string; body: string } {
  // Strategy: find the outermost JSON object { ... } containing "title" and "body"
  // This avoids regex issues with ```json fences when body contains code blocks
  const firstBrace = raw.indexOf('{')
  const lastBrace = raw.lastIndexOf('}')

  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const jsonStr = raw.slice(firstBrace, lastBrace + 1)
    try {
      const parsed = JSON.parse(jsonStr)
      if (typeof parsed.title === 'string' && typeof parsed.body === 'string') {
        return { title: parsed.title, body: parsed.body }
      }
    } catch {
      // JSON parse failed, try fallback
    }
  }

  // Fallback: use first line as title, rest as body
  const lines = raw.trim().split('\n')
  return {
    title: lines[0].replace(/^#+\s*/, '').slice(0, 80),
    body: lines.slice(1).join('\n').trim() || raw.trim(),
  }
}

export class ClaudeCliAiService implements AiService {
  async generate(input: AiGenerateInput): Promise<AiGenerateResult> {
    const prompt = buildPrompt(input)
    const raw = await callClaudeCli(prompt)
    const { title, body } = parseClaudeResponse(raw)

    const tokensUsed = Math.floor((prompt.length + raw.length) / 4)

    return {
      title,
      body,
      model: 'claude-cli',
      tokensUsed,
    }
  }
}

export function createAiService(mode: 'mock' | 'claude-cli' = 'mock'): AiService {
  if (mode === 'claude-cli') {
    return new ClaudeCliAiService()
  }
  return new MockAiService()
}

import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { eq } from 'drizzle-orm'
import { templates } from './schema'

export interface BuiltInTemplate {
  name: string
  slug: string
  description: string
  systemPrompt: string
  bodyTemplate: string
  defaultLabels: string[]
  isBuiltIn: boolean
  sortOrder: number
}

export const builtInTemplates: BuiltInTemplate[] = [
  {
    name: 'バグ報告',
    slug: 'bug',
    description: 'アプリケーションのバグや不具合を報告するためのテンプレート',
    systemPrompt: `あなたはGitHub Issueのバグ報告を作成するAIアシスタントです。
ユーザーの説明をもとに、以下の構造で明確かつ再現可能なバグ報告を作成してください。

## 出力フォーマット
- タイトル: 簡潔にバグの内容を表す（例: 「ログイン画面でメールアドレス入力後にクラッシュする」）
- 本文: 下記テンプレートに従い、各セクションを日本語で記述

## 注意事項
- 再現手順は具体的かつ番号付きで記述すること
- 期待される動作と実際の動作を明確に区別すること
- 環境情報が不明な場合は「要確認」と記載すること
- スクリーンショットやログがある場合はその内容を反映すること`,
    bodyTemplate: `## バグの概要
<!-- バグの簡潔な説明 -->

## 再現手順
1.
2.
3.

## 期待される動作
<!-- 本来どう動くべきか -->

## 実際の動作
<!-- 実際にはどうなったか -->

## 環境
- OS:
- ブラウザ / アプリバージョン:
- その他:

## スクリーンショット / ログ
<!-- 該当する場合は添付 -->

## 備考
<!-- 追加情報があれば -->`,
    defaultLabels: ['bug'],
    isBuiltIn: true,
    sortOrder: 1,
  },
  {
    name: '機能要望',
    slug: 'feature',
    description: '新しい機能の追加をリクエストするためのテンプレート',
    systemPrompt: `あなたはGitHub Issueの機能要望を作成するAIアシスタントです。
ユーザーの説明をもとに、以下の構造で実装可能な機能要望を作成してください。

## 出力フォーマット
- タイトル: 機能の内容を簡潔に表す（例: 「ダークモード対応」）
- 本文: 下記テンプレートに従い、各セクションを日本語で記述

## 注意事項
- ユーザーストーリー形式で「誰が」「何を」「なぜ」を明確にすること
- 受け入れ条件は具体的かつテスト可能な形で記述すること
- 関連するUIや画面がある場合はFigmaリンクやスクリーンショットを参照すること
- 技術的な制約や依存関係が分かる場合は記載すること`,
    bodyTemplate: `## 概要
<!-- 機能の簡潔な説明 -->

## ユーザーストーリー
<!-- 「〇〇として、△△したい。なぜなら□□だから。」 -->

## 詳細な要件
<!-- 機能の詳細な仕様 -->

## 受け入れ条件
- [ ]
- [ ]
- [ ]

## デザイン / モックアップ
<!-- Figmaリンクやスクリーンショット -->

## 技術的な考慮事項
<!-- 実装上の注意点や制約 -->

## 関連Issue
<!-- 関連するIssueがあればリンク -->`,
    defaultLabels: ['enhancement'],
    isBuiltIn: true,
    sortOrder: 2,
  },
  {
    name: '改善提案',
    slug: 'improvement',
    description: '既存機能の改善や最適化を提案するためのテンプレート',
    systemPrompt: `あなたはGitHub Issueの改善提案を作成するAIアシスタントです。
ユーザーの説明をもとに、以下の構造で具体的かつ実行可能な改善提案を作成してください。

## 出力フォーマット
- タイトル: 改善内容を簡潔に表す（例: 「検索機能のレスポンス速度を改善する」）
- 本文: 下記テンプレートに従い、各セクションを日本語で記述

## 注意事項
- 現状の問題点を具体的に記述すること
- 改善後の期待効果を定量的に表現できる場合はそうすること
- 複数の改善案がある場合は優先度をつけること
- 影響範囲を明確にすること`,
    bodyTemplate: `## 改善対象
<!-- どの機能・画面の改善か -->

## 現状の問題点
<!-- 現在の課題や不便な点 -->

## 改善案
<!-- 具体的な改善内容 -->

## 期待される効果
<!-- 改善によって得られるメリット -->

## 影響範囲
<!-- 改善によって影響を受ける機能や画面 -->

## 優先度
<!-- 高 / 中 / 低 とその理由 -->

## 関連Issue
<!-- 関連するIssueがあればリンク -->`,
    defaultLabels: ['improvement'],
    isBuiltIn: true,
    sortOrder: 3,
  },
]

export function seedTemplates(db: BetterSQLite3Database): void {
  const now = new Date().toISOString()

  for (const tmpl of builtInTemplates) {
    // Check if template already exists by slug
    const existing = db
      .select()
      .from(templates)
      .where(eq(templates.slug, tmpl.slug))
      .get()

    if (!existing) {
      db.insert(templates)
        .values({
          name: tmpl.name,
          slug: tmpl.slug,
          description: tmpl.description,
          systemPrompt: tmpl.systemPrompt,
          bodyTemplate: tmpl.bodyTemplate,
          defaultLabels: tmpl.defaultLabels,
          isBuiltIn: tmpl.isBuiltIn,
          sortOrder: tmpl.sortOrder,
          createdAt: now,
          updatedAt: now,
        })
        .run()
    }
  }
}

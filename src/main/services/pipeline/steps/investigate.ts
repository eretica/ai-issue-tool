import type { AiPipelineInput, ClassificationResult, InvestigationResult } from '../types'
import { investigateRepo, investigateRepoViaGithub, type RepoReadResult } from '../repo-reader'
import { loadProfile, loadModulesForPaths } from '../../knowledge-base'

export async function runInvestigation(
  input: AiPipelineInput,
  classification: ClassificationResult,
  localPath: string | null,
  repoFullName: string
): Promise<InvestigationResult> {
  let repoRead: RepoReadResult

  if (localPath) {
    repoRead = investigateRepo(localPath, input.templateSlug, classification.investigationHints)
  } else {
    repoRead = await investigateRepoViaGithub(
      repoFullName,
      input.templateSlug,
      classification.investigationHints
    )
  }

  // Load Knowledge Base if available
  const kbProfile = loadProfile(repoFullName)
  const filePaths = repoRead.relevantFiles.map((f) => f.path)
  const kbModules = loadModulesForPaths(repoFullName, filePaths)
  const knowledgeBase = [kbProfile, kbModules].filter(Boolean).join('\n\n') || undefined

  return {
    repoStructure: repoRead.structure,
    relevantFiles: repoRead.relevantFiles,
    codeSnippets: repoRead.codeSnippets,
    techStack: repoRead.techStack,
    relatedIssues: input.relatedIssues ?? [],
    knowledgeBase,
  }
}

export function formatInvestigationForPrompt(investigation: InvestigationResult): string {
  const parts: string[] = []

  // Knowledge Base (highest priority context)
  if (investigation.knowledgeBase) {
    parts.push(`### リポジトリ知識ベース\n${investigation.knowledgeBase}`)
  }

  if (investigation.techStack.length > 0) {
    parts.push(`### 技術スタック\n${investigation.techStack.join(', ')}`)
  }

  if (investigation.relevantFiles.length > 0) {
    parts.push(
      `### 関連ファイル\n${investigation.relevantFiles
        .map((f) => `- \`${f.path}\`: ${f.reason}`)
        .join('\n')}`
    )
  }

  if (investigation.codeSnippets.length > 0) {
    const snippets = investigation.codeSnippets.slice(0, 5).map(
      (s) =>
        `#### ${s.path} (L${s.startLine})\n\`\`\`\n${s.content.slice(0, 500)}\n\`\`\``
    )
    parts.push(`### コードスニペット\n${snippets.join('\n\n')}`)
  }

  if (investigation.repoStructure.length > 0) {
    parts.push(
      `### リポジトリ構造（一部）\n\`\`\`\n${investigation.repoStructure.slice(0, 30).join('\n')}\n\`\`\``
    )
  }

  return parts.join('\n\n')
}

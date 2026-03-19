import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query'
import type {
  AiGenerateInput,
  AiGenerateResult,
  AiPipelineInput,
  DirectoryPickerResult,
  Draft,
  DraftCreateInput,
  DraftStatus,
  PublishedIssue,
  Repository,
} from '@shared/types'
import { api } from '../lib/api'

// ============ Query Keys ============

export const queryKeys = {
  repos: ['repositories'] as const,
  repoById: (id: number) => ['repositories', id] as const,
  labels: (repoId: number) => ['labels', repoId] as const,
  templates: ['templates'] as const,
  templateBySlug: (slug: string) => ['templates', slug] as const,
  drafts: (repoId?: number, status?: DraftStatus) => ['drafts', repoId ?? 'all', status ?? 'all'] as const,
  draftById: (id: number) => ['drafts', 'detail', id] as const,
  publishedIssues: (repoId?: number) => ['publishedIssues', repoId ?? 'all'] as const,
  setting: (key: string) => ['settings', key] as const,
  pipelineSteps: (draftId: number) => ['pipelineSteps', draftId] as const,
  knowledgeStatus: (repoId: number) => ['knowledgeStatus', repoId] as const,
  scanProgress: (repoFullName: string) => ['scanProgress', repoFullName] as const,
}

// ============ Repository ============

export function useRepositories() {
  return useQuery({
    queryKey: queryKeys.repos,
    queryFn: () => api.repo.list(),
  })
}

export function useRepositoryById(id: number) {
  return useQuery({
    queryKey: queryKeys.repoById(id),
    queryFn: () => api.repo.getById(id),
    enabled: id > 0,
  })
}

export function useCreateRepository() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Repository, 'id' | 'createdAt' | 'updatedAt'>) =>
      api.repo.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.repos }),
  })
}

export function useDeleteRepository() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.repo.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.repos }),
  })
}

export function useSetDefaultRepository() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.repo.setDefault(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.repos }),
  })
}

// ============ Dialog ============

export function useOpenDirectory(): UseMutationResult<DirectoryPickerResult | null, Error, void> {
  return useMutation({
    mutationFn: () => api.dialog.openDirectory(),
  })
}

// ============ Label ============

export function useLabels(repositoryId: number) {
  return useQuery({
    queryKey: queryKeys.labels(repositoryId),
    queryFn: () => api.label.listByRepo(repositoryId),
    enabled: repositoryId > 0,
  })
}

export function useSyncLabels() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (repositoryId: number) => api.label.sync(repositoryId),
    onSuccess: (_data, repositoryId) =>
      qc.invalidateQueries({ queryKey: queryKeys.labels(repositoryId) }),
  })
}

// ============ Template ============

export function useTemplates() {
  return useQuery({
    queryKey: queryKeys.templates,
    queryFn: () => api.template.list(),
  })
}

export function useTemplateBySlug(slug: string) {
  return useQuery({
    queryKey: queryKeys.templateBySlug(slug),
    queryFn: () => api.template.getBySlug(slug),
    enabled: slug.length > 0,
  })
}

// ============ Draft ============

export function useDrafts(repositoryId?: number, status?: DraftStatus) {
  return useQuery({
    queryKey: queryKeys.drafts(repositoryId, status),
    queryFn: () => api.draft.list(repositoryId, status),
  })
}

export function useDraftById(id: number) {
  return useQuery({
    queryKey: queryKeys.draftById(id),
    queryFn: () => api.draft.getById(id),
    enabled: id > 0,
  })
}

export function useCreateDraft() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: DraftCreateInput) => api.draft.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drafts'] })
    },
  })
}

export function useUpdateDraft(): UseMutationResult<
  Draft,
  Error,
  { id: number; data: Partial<DraftCreateInput> }
> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<DraftCreateInput> }) =>
      api.draft.update(id, data),
    onSuccess: (draft) => {
      qc.invalidateQueries({ queryKey: ['drafts'] })
      qc.setQueryData(queryKeys.draftById(draft.id), draft)
    },
  })
}

export function useDeleteDraft() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.draft.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drafts'] })
    },
  })
}

// ============ AI Generation ============

export function useAiGenerate(): UseMutationResult<AiGenerateResult, Error, AiGenerateInput> {
  return useMutation({
    mutationFn: (input: AiGenerateInput) => api.ai.generate(input),
  })
}

export function useAiGenerateForDraft() {
  return useMutation({
    mutationFn: ({ draftId, input }: { draftId: number; input: AiGenerateInput }) =>
      api.ai.generateForDraft(draftId, input),
  })
}

export function useAiGeneratePipeline() {
  return useMutation({
    mutationFn: ({ draftId, input }: { draftId: number; input: AiPipelineInput }) =>
      api.ai.generatePipeline(draftId, input),
  })
}

export function usePipelineSteps(draftId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.pipelineSteps(draftId),
    queryFn: () => api.pipeline.getSteps(draftId),
    enabled: enabled && draftId > 0,
    refetchInterval: enabled ? 2000 : false,
  })
}

export function useCancelPipeline() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (draftId: number) => api.pipeline.cancel(draftId),
    onSuccess: (_data, draftId) => {
      qc.invalidateQueries({ queryKey: ['drafts'] })
      qc.invalidateQueries({ queryKey: queryKeys.pipelineSteps(draftId) })
    },
  })
}

// ============ GitHub Publish ============

export function usePublishDraft(): UseMutationResult<PublishedIssue, Error, number> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (draftId: number) => api.github.publish(draftId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drafts'] })
      qc.invalidateQueries({ queryKey: ['publishedIssues'] })
    },
  })
}

export function usePublishedIssues(repositoryId?: number) {
  return useQuery({
    queryKey: queryKeys.publishedIssues(repositoryId),
    queryFn: () => api.github.list(repositoryId),
  })
}

// ============ Knowledge Base ============

export function useKnowledgeStatus(repoId: number) {
  return useQuery({
    queryKey: queryKeys.knowledgeStatus(repoId),
    queryFn: () => api.knowledge.status(repoId),
    enabled: repoId > 0,
  })
}

export function useKnowledgeScan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (repoId: number) => api.knowledge.scan(repoId),
    onSuccess: (_data, repoId) => {
      qc.invalidateQueries({ queryKey: queryKeys.knowledgeStatus(repoId) })
    },
  })
}

export function useScanProgress(repoFullName: string, enabled = false) {
  return useQuery({
    queryKey: queryKeys.scanProgress(repoFullName),
    queryFn: () => api.knowledge.scanProgress(repoFullName),
    enabled: enabled && repoFullName.length > 0,
    refetchInterval: enabled ? 2000 : false,
  })
}

// ============ Settings ============

export function useSetting(key: string) {
  return useQuery({
    queryKey: queryKeys.setting(key),
    queryFn: () => api.settings.get(key),
  })
}

export function useSetSetting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => api.settings.set(key, value),
    onSuccess: (_data, { key }) => {
      qc.invalidateQueries({ queryKey: queryKeys.setting(key) })
    },
  })
}

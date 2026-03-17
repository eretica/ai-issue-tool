import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query'
import type {
  AiGenerateInput,
  AiGenerateResult,
  Draft,
  DraftCreateInput,
  DraftStatus,
  Label,
  PublishedIssue,
  Repository,
  Template,
} from '@shared/types'
import { api } from '../lib/api'

// ============ Query Keys ============

export const queryKeys = {
  repos: ['repositories'] as const,
  labels: (repoId: number) => ['labels', repoId] as const,
  templates: ['templates'] as const,
  templateBySlug: (slug: string) => ['templates', slug] as const,
  drafts: (status?: DraftStatus) => ['drafts', status ?? 'all'] as const,
  draftById: (id: number) => ['drafts', 'detail', id] as const,
  publishedIssues: ['publishedIssues'] as const,
  setting: (key: string) => ['settings', key] as const,
}

// ============ Repository ============

export function useRepositories() {
  return useQuery({
    queryKey: queryKeys.repos,
    queryFn: () => api.repo.list(),
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

export function useDrafts(status?: DraftStatus) {
  return useQuery({
    queryKey: queryKeys.drafts(status),
    queryFn: () => api.draft.list(status),
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

// ============ GitHub Publish ============

export function usePublishDraft(): UseMutationResult<PublishedIssue, Error, number> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (draftId: number) => api.github.publish(draftId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drafts'] })
      qc.invalidateQueries({ queryKey: queryKeys.publishedIssues })
    },
  })
}

export function usePublishedIssues() {
  return useQuery({
    queryKey: queryKeys.publishedIssues,
    queryFn: () => api.github.list(),
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

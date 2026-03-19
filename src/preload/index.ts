import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  AiGenerateInput,
  AiGenerateResult,
  AiPipelineInput,
  DirectoryPickerResult,
  Draft,
  DraftCreateInput,
  DraftStatus,
  KnowledgeStatus,
  Label,
  PipelineStep,
  PublishedIssue,
  Repository,
  ScanProgress,
  Template
} from '../shared/types'

// Type-safe IPC bridge
const api = {
  repo: {
    list: (): Promise<Repository[]> => ipcRenderer.invoke('repo:list'),
    getById: (id: number): Promise<Repository | null> => ipcRenderer.invoke('repo:getById', { id }),
    create: (
      data: Omit<Repository, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<Repository> => ipcRenderer.invoke('repo:create', data),
    delete: (id: number): Promise<void> => ipcRenderer.invoke('repo:delete', { id }),
    setDefault: (id: number): Promise<void> => ipcRenderer.invoke('repo:setDefault', { id })
  },

  label: {
    listByRepo: (repositoryId: number): Promise<Label[]> =>
      ipcRenderer.invoke('label:listByRepo', { repositoryId }),
    sync: (repositoryId: number): Promise<Label[]> =>
      ipcRenderer.invoke('label:sync', { repositoryId })
  },

  template: {
    list: (): Promise<Template[]> => ipcRenderer.invoke('template:list'),
    getBySlug: (slug: string): Promise<Template | null> =>
      ipcRenderer.invoke('template:getBySlug', { slug })
  },

  draft: {
    list: (repositoryId?: number, status?: DraftStatus): Promise<Draft[]> =>
      ipcRenderer.invoke('draft:list', { repositoryId, status }),
    getById: (id: number): Promise<Draft | null> =>
      ipcRenderer.invoke('draft:getById', { id }),
    create: (data: DraftCreateInput): Promise<Draft> =>
      ipcRenderer.invoke('draft:create', data),
    update: (id: number, data: Partial<DraftCreateInput>): Promise<Draft> =>
      ipcRenderer.invoke('draft:update', { id, ...data }),
    delete: (id: number): Promise<void> =>
      ipcRenderer.invoke('draft:delete', { id })
  },

  ai: {
    generate: (input: AiGenerateInput): Promise<AiGenerateResult> =>
      ipcRenderer.invoke('ai:generate', input),
    generateForDraft: (draftId: number, input: AiGenerateInput): Promise<{ started: boolean }> =>
      ipcRenderer.invoke('ai:generateForDraft', { draftId, input }),
    generatePipeline: (draftId: number, input: AiPipelineInput): Promise<{ started: boolean }> =>
      ipcRenderer.invoke('ai:generatePipeline', { draftId, input })
  },

  pipeline: {
    getSteps: (draftId: number): Promise<PipelineStep[]> =>
      ipcRenderer.invoke('pipeline:getSteps', { draftId }),
    cancel: (draftId: number): Promise<{ cancelled: boolean }> =>
      ipcRenderer.invoke('pipeline:cancel', { draftId })
  },

  github: {
    publish: (draftId: number): Promise<PublishedIssue> =>
      ipcRenderer.invoke('github:publish', { draftId })
  },

  settings: {
    get: (key: string): Promise<string | null> =>
      ipcRenderer.invoke('settings:get', { key }),
    set: (key: string, value: string): Promise<void> =>
      ipcRenderer.invoke('settings:set', { key, value })
  },

  knowledge: {
    status: (repoId: number): Promise<KnowledgeStatus | null> =>
      ipcRenderer.invoke('knowledge:status', { repoId }),
    scan: (repoId: number): Promise<{ started: boolean }> =>
      ipcRenderer.invoke('knowledge:scan', { repoId }),
    scanProgress: (repoFullName: string): Promise<ScanProgress | null> =>
      ipcRenderer.invoke('knowledge:scanProgress', { repoFullName }),
  },

  dialog: {
    openDirectory: (): Promise<DirectoryPickerResult | null> =>
      ipcRenderer.invoke('dialog:openDirectory')
  },

  db: {
    dump: (): Promise<Record<string, unknown[]>> =>
      ipcRenderer.invoke('db:dump')
  }
}

export type ElectronApi = typeof api

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}

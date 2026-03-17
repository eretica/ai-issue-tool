import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  AiGenerateInput,
  AiGenerateResult,
  Draft,
  DraftCreateInput,
  DraftStatus,
  Label,
  PublishedIssue,
  Repository,
  Template
} from '../shared/types'

// Type-safe IPC bridge
const api = {
  repo: {
    list: (): Promise<Repository[]> => ipcRenderer.invoke('repo:list'),
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
    list: (status?: DraftStatus): Promise<Draft[]> =>
      ipcRenderer.invoke('draft:list', { status }),
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
      ipcRenderer.invoke('ai:generate', input)
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

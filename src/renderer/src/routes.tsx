import { createRootRoute, createRoute, createRouter, createHashHistory, Outlet } from '@tanstack/react-router'
import { Sidebar } from './components/layout/Sidebar'
import { MainContent } from './components/layout/MainContent'
import { RepoListPage } from './pages/RepoListPage'
import { KanbanPage } from './pages/KanbanPage'
import { PipelineViewerPage } from './pages/PipelineViewerPage'
import { SettingsPage } from './pages/SettingsPage'
import { DbViewerPage } from './pages/DbViewerPage'

function RootLayout(): React.JSX.Element {
  return (
    <div className="flex h-full w-full">
      <Sidebar />
      <MainContent />
    </div>
  )
}

const rootRoute = createRootRoute({
  component: RootLayout,
})

// Home: repository list
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: RepoListPage,
})

// Repo-scoped layout (passes through to children)
const repoLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/repos/$repoId',
  component: () => <Outlet />,
})

// Repo index: kanban board
const repoIndexRoute = createRoute({
  getParentRoute: () => repoLayoutRoute,
  path: '/',
  component: KanbanPage,
})

// Pipeline conversation viewer
const pipelineViewerRoute = createRoute({
  getParentRoute: () => repoLayoutRoute,
  path: '/pipeline/$draftId',
  component: PipelineViewerPage,
})

// Global settings
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
})

// DB Viewer (dev tool)
const dbViewerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/db',
  component: DbViewerPage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  repoLayoutRoute.addChildren([
    repoIndexRoute,
    pipelineViewerRoute,
  ]),
  settingsRoute,
  dbViewerRoute,
])

// Use hash history for Electron (file:// URLs don't support browser history API)
const isElectron = typeof window !== 'undefined' && window.api !== undefined
const hashHistory = createHashHistory()

export const router = createRouter({
  routeTree,
  ...(isElectron ? { history: hashHistory } : {}),
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

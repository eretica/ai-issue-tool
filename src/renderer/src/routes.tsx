import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import { Sidebar } from './components/layout/Sidebar'
import { MainContent } from './components/layout/MainContent'
import { DraftListPage } from './pages/DraftListPage'
import { NewIssuePage } from './pages/NewIssuePage'
import { DraftEditPage } from './pages/DraftEditPage'
import { PublishedListPage } from './pages/PublishedListPage'
import { SettingsPage } from './pages/SettingsPage'
import { RepositorySettingsPage } from './pages/RepositorySettingsPage'
import { TemplateEditorPage } from './pages/TemplateEditorPage'

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

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DraftListPage,
})

const newIssueRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/new',
  component: NewIssuePage,
})

const draftEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/drafts/$draftId',
  component: DraftEditPage,
})

const publishedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/published',
  component: PublishedListPage,
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
})

const repositoriesRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/repositories',
  component: RepositorySettingsPage,
})

const templateEditorRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/templates/$templateId',
  component: TemplateEditorPage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  newIssueRoute,
  draftEditRoute,
  publishedRoute,
  settingsRoute.addChildren([repositoriesRoute, templateEditorRoute]),
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

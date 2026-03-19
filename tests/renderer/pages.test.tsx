import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createRootRoute,
  createRoute,
  createRouter,
  createMemoryHistory,
  RouterProvider,
  Outlet,
} from '@tanstack/react-router'
import { KanbanPage } from '@renderer/pages/KanbanPage'
import { SettingsPage } from '@renderer/pages/SettingsPage'
import { RepoListPage } from '@renderer/pages/RepoListPage'

function renderRepoScopedPage(
  component: () => React.JSX.Element,
  subPath = '/',
) {
  const rootRoute = createRootRoute({ component: Outlet })
  const repoLayoutRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/repos/$repoId',
    component: Outlet,
  })

  const childRoute = createRoute({
    getParentRoute: () => repoLayoutRoute,
    path: '/',
    component,
  })

  const routeTree = rootRoute.addChildren([
    repoLayoutRoute.addChildren([childRoute]),
  ])
  const initialPath = subPath === '/'
    ? '/repos/1'
    : `/repos/1${subPath}`
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  })
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

function renderWithRouter(
  component: () => React.JSX.Element,
  path = '/',
) {
  const rootRoute = createRootRoute({ component })
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => null,
  })
  const routeTree = rootRoute.addChildren([indexRoute])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

function renderSettingsPage() {
  const rootRoute = createRootRoute({ component: Outlet })
  const settingsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/settings',
    component: SettingsPage,
  })
  const routeTree = rootRoute.addChildren([settingsRoute])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/settings'] }),
  })
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

describe('RepoListPage', () => {
  it('renders title', async () => {
    renderWithRouter(RepoListPage)
    expect(await screen.findByText('リポジトリ')).toBeInTheDocument()
  })
})

describe('KanbanPage', () => {
  it('renders board title and new issue button', async () => {
    renderRepoScopedPage(KanbanPage)
    expect(await screen.findByText('ボード')).toBeInTheDocument()
    expect(screen.getByText('+ 新規Issue作成')).toBeInTheDocument()
  })
})

describe('SettingsPage', () => {
  it('renders connection settings', async () => {
    renderSettingsPage()
    expect(await screen.findByText('設定')).toBeInTheDocument()
    expect(screen.getByText('外部ツール連携')).toBeInTheDocument()
  })
})

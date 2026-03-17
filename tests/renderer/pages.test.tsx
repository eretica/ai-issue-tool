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
import { DraftListPage } from '@renderer/pages/DraftListPage'
import { NewIssuePage } from '@renderer/pages/NewIssuePage'
import { SettingsPage } from '@renderer/pages/SettingsPage'
import { PublishedListPage } from '@renderer/pages/PublishedListPage'

function renderWithRouter(
  component: () => React.JSX.Element,
  initialPath = '/',
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

describe('DraftListPage', () => {
  it('renders title and empty state', async () => {
    renderWithRouter(DraftListPage)
    expect(await screen.findByText('ドラフト一覧')).toBeInTheDocument()
    expect(
      await screen.findByText('ドラフトがありません。新しいIssueを作成しましょう。'),
    ).toBeInTheDocument()
  })

  it('renders filter tabs', async () => {
    renderWithRouter(DraftListPage)
    expect(await screen.findByRole('tab', { name: 'すべて' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '下書き' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'AI生成済み' })).toBeInTheDocument()
  })
})

describe('NewIssuePage', () => {
  it('renders form sections', async () => {
    renderWithRouter(NewIssuePage)
    expect(await screen.findByText('新規Issue作成')).toBeInTheDocument()
    expect(screen.getByText('基本情報')).toBeInTheDocument()
    expect(screen.getByText('デザイン情報')).toBeInTheDocument()
    expect(screen.getByText('添付ファイル')).toBeInTheDocument()
    expect(screen.getByText('関連情報')).toBeInTheDocument()
    expect(screen.getByText('ラベル・担当')).toBeInTheDocument()
  })

  it('renders template buttons from API', async () => {
    renderWithRouter(NewIssuePage)
    expect(await screen.findByText('バグ報告')).toBeInTheDocument()
    expect(screen.getByText('機能要望')).toBeInTheDocument()
    expect(screen.getByText('改善提案')).toBeInTheDocument()
  })

  it('renders action buttons', async () => {
    renderWithRouter(NewIssuePage)
    expect(await screen.findByText('下書き保存')).toBeInTheDocument()
    expect(screen.getByText('AIでIssueを生成')).toBeInTheDocument()
  })
})

describe('PublishedListPage', () => {
  it('renders title and empty state', async () => {
    renderWithRouter(PublishedListPage)
    expect(await screen.findByText('公開済みIssue')).toBeInTheDocument()
    expect(
      await screen.findByText('公開済みのIssueはありません。'),
    ).toBeInTheDocument()
  })

  it('renders table headers', async () => {
    renderWithRouter(PublishedListPage)
    expect(await screen.findByText('タイトル')).toBeInTheDocument()
    expect(screen.getByText('リポジトリ')).toBeInTheDocument()
    expect(screen.getByText('Issue #')).toBeInTheDocument()
    expect(screen.getByText('状態')).toBeInTheDocument()
    expect(screen.getByText('公開日')).toBeInTheDocument()
  })
})

describe('SettingsPage', () => {
  it('renders section titles', async () => {
    renderSettingsPage()
    expect(await screen.findByText('設定')).toBeInTheDocument()
    expect(screen.getByText('API設定')).toBeInTheDocument()
    expect(screen.getByText('リポジトリ管理')).toBeInTheDocument()
    expect(screen.getByText('テンプレート管理')).toBeInTheDocument()
  })
})

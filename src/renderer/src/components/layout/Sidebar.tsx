import { Link, useRouterState } from '@tanstack/react-router'

const navItems = [
  { to: '/', label: 'ドラフト一覧', icon: '📝' },
  { to: '/new', label: '新規作成', icon: '✏️' },
  { to: '/published', label: '公開済み', icon: '📤' },
  { to: '/settings', label: '設定', icon: '⚙️' },
] as const

export function Sidebar(): React.JSX.Element {
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  return (
    <nav
      aria-label="メインナビゲーション"
      className="flex h-full w-[var(--sidebar-width)] flex-shrink-0 flex-col border-r border-[var(--border)] bg-[var(--muted)]"
    >
      <header className="border-b border-[var(--border)] px-4 py-4">
        <h1 className="text-lg font-bold text-[var(--foreground)]">AI Issue Tool</h1>
      </header>
      <ul className="flex flex-1 flex-col gap-1 p-2" role="list">
        {navItems.map((item) => {
          const isActive =
            item.to === '/'
              ? currentPath === '/'
              : currentPath.startsWith(item.to)

          return (
            <li key={item.to}>
              <Link
                to={item.to}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                    : 'text-[var(--foreground)] hover:bg-[var(--accent)]'
                }`}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

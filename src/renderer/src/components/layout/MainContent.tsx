import { Outlet } from '@tanstack/react-router'

export function MainContent(): React.JSX.Element {
  return (
    <main className="flex-1 overflow-auto p-6">
      <Outlet />
    </main>
  )
}

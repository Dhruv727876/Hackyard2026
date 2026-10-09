import { NavLink, Outlet } from 'react-router-dom'
import { RoleToggle } from './RoleToggle'

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      <header className="bg-emerald-700 text-white">
        <div className="mx-auto flex w-full max-w-md flex-col gap-3 px-4 py-3">
          <span className="text-lg font-bold tracking-tight">ScrapLoop</span>
          <RoleToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-24 pt-6">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95">
        <div className="mx-auto flex w-full max-w-md">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex-1 py-3 text-center text-sm font-medium ${
                isActive ? 'text-emerald-700' : 'text-slate-500'
              }`
            }
          >
            Scan
          </NavLink>
          <NavLink
            to="/pickups"
            className={({ isActive }) =>
              `flex-1 py-3 text-center text-sm font-medium ${
                isActive ? 'text-emerald-700' : 'text-slate-500'
              }`
            }
          >
            Pickups
          </NavLink>
        </div>
      </nav>
    </div>
  )
}

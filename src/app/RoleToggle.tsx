import { useLocation, useNavigate } from 'react-router-dom'

const ROLE_ROUTES = [
  { label: 'Household', path: '/' },
  { label: 'Worker', path: '/worker' },
  { label: 'Officer', path: '/ward' },
]

export function RoleToggle() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  return (
    <div
      role="group"
      aria-label="Switch role"
      className="flex self-start rounded-full bg-white/15 p-1 text-xs font-medium"
    >
      {ROLE_ROUTES.map((role) => {
        const active =
          role.path === '/'
            ? pathname === '/' || pathname.startsWith('/pickups')
            : pathname.startsWith(role.path)

        return (
          <button
            key={role.path}
            type="button"
            aria-pressed={active}
            onClick={() => navigate(role.path)}
            className={
              active
                ? 'rounded-full bg-white px-3 py-1 text-emerald-800 shadow-sm'
                : 'rounded-full px-3 py-1 text-white/80'
            }
          >
            {role.label}
          </button>
        )
      })}
    </div>
  )
}

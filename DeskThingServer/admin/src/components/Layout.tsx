import { NavLink, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { adminFetch } from '../api/client'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '⌂' },
  { to: '/apps', label: 'Apps', icon: '◫' },
  { to: '/downloads', label: 'Downloads', icon: '↓' },
  { to: '/clients', label: 'Clients', icon: '⊞' },
  { to: '/developer', label: 'Developer', icon: '>' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
  { to: '/device', label: 'Device', icon: '▣' },
  { to: '/adb', label: 'ADB', icon: '$' },
]

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function Layout() {
  const [health, setHealth] = useState<{ status?: string; uptime?: number } | null>(null)

  useEffect(() => {
    const poll = () => {
      adminFetch<{ status: string; uptime: number }>('/health')
        .then(setHealth)
        .catch(() => setHealth(null))
    }
    poll()
    const id = setInterval(poll, 15000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      {/* Sidebar */}
      <aside className="flex flex-col w-56 bg-gray-900 border-r border-gray-800 shrink-0">
        <div className="px-4 py-5 border-b border-gray-800">
          <h1 className="text-lg font-semibold tracking-tight">DeskThing</h1>
          <p className="text-xs text-gray-500 mt-0.5">Admin Panel</p>
        </div>

        <nav className="flex-1 py-3 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-gray-800 text-white border-r-2 border-blue-500'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                }`
              }
            >
              <span className="w-5 text-center font-mono text-xs">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-gray-800 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                health?.status === 'ok' ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            {health ? (
              <span>Up {formatUptime(health.uptime ?? 0)}</span>
            ) : (
              <span className="text-red-400">Offline</span>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}

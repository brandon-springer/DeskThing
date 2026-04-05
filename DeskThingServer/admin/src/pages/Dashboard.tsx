import { useEffect, useState } from 'react'
import { adminFetch } from '../api/client'
import { useAppStore } from '../stores/appStore'
import { useClientStore } from '../stores/clientStore'
import { useReleaseStore } from '../stores/releaseStore'

export default function Dashboard() {
  const { apps, fetchApps } = useAppStore()
  const { clients, fetchClients } = useClientStore()
  const { refreshReleases } = useReleaseStore()
  const [health, setHealth] = useState<any>(null)
  const [systemInfo, setSystemInfo] = useState<any>(null)

  useEffect(() => {
    fetchApps()
    fetchClients()
    fetch('/api/admin/health').then(r => r.json()).then(setHealth).catch(() => {})
    adminFetch('/system-info').then(setSystemInfo).catch(() => {})
  }, [])

  const runningApps = apps.filter((a) => a.running).length

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Dashboard</h2>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Server Status"
          value={health?.status === 'ok' ? 'Online' : 'Unknown'}
          accent={health?.status === 'ok' ? 'text-green-400' : 'text-yellow-400'}
        />
        <StatCard label="Apps" value={`${runningApps} / ${apps.length} running`} />
        <StatCard label="Clients" value={`${clients.length} connected`} />
        <StatCard
          label="Uptime"
          value={health?.uptime ? formatUptime(health.uptime) : '--'}
        />
      </div>

      {/* Quick actions */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => refreshReleases()}
            className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 rounded transition-colors"
          >
            Refresh Releases
          </button>
          <button
            onClick={() => {
              fetchApps()
              fetchClients()
            }}
            className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          >
            Reload Data
          </button>
          <button
            onClick={() => {
              adminFetch('/system-info').then(setSystemInfo).catch(() => {})
              fetch('/api/admin/health').then(r => r.json()).then(setHealth).catch(() => {})
            }}
            className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          >
            Refresh Status
          </button>
        </div>
      </div>

      {/* System info */}
      {systemInfo && (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">System Info</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            {Object.entries(systemInfo).map(([key, val]) => (
              <div key={key}>
                <div className="text-gray-500 text-xs">{key}</div>
                <div className="text-gray-200 truncate">{String(val)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: string
}) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-lg font-semibold ${accent ?? 'text-gray-100'}`}>{value}</div>
    </div>
  )
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

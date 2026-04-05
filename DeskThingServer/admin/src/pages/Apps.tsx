import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore, App } from '../stores/appStore'

export default function Apps() {
  const { apps, loading, fetchApps, runApp, stopApp, enableApp, disableApp, purgeApp } =
    useAppStore()

  useEffect(() => {
    fetchApps()
  }, [])

  if (loading && apps.length === 0) {
    return <p className="text-gray-400">Loading apps...</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Apps</h2>
        <button
          onClick={fetchApps}
          className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        >
          Refresh
        </button>
      </div>

      {apps.length === 0 ? (
        <p className="text-gray-500">No apps installed.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {apps.map((app) => (
            <AppCard
              key={app.id ?? app.name}
              app={app}
              onRun={() => runApp(app.id ?? app.name)}
              onStop={() => stopApp(app.id ?? app.name)}
              onEnable={() => enableApp(app.id ?? app.name)}
              onDisable={() => disableApp(app.id ?? app.name)}
              onPurge={() => purgeApp(app.id ?? app.name)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function AppCard({
  app,
  onRun,
  onStop,
  onEnable,
  onDisable,
  onPurge,
}: {
  app: App
  onRun: () => void
  onStop: () => void
  onEnable: () => void
  onDisable: () => void
  onPurge: () => void
}) {
  const [confirmPurge, setConfirmPurge] = useState(false)
  const appId = app.id ?? app.name

  const status = !app.enabled
    ? 'disabled'
    : app.running
      ? 'running'
      : 'stopped'

  const statusColor = {
    running: 'text-green-400',
    stopped: 'text-yellow-400',
    disabled: 'text-gray-500',
  }[status]

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium">{app.manifest?.label || app.name}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {app.manifest?.version && `v${app.manifest.version}`}
            {app.manifest?.author && ` by ${app.manifest.author}`}
          </p>
        </div>
        <span className={`text-xs font-medium ${statusColor}`}>
          {status}
        </span>
      </div>

      {app.manifest?.description && (
        <p className="text-sm text-gray-400 line-clamp-2">{app.manifest.description}</p>
      )}

      <div className="flex flex-wrap gap-2 mt-auto pt-2 border-t border-gray-800">
        {app.enabled && !app.running && (
          <ActionBtn onClick={onRun} color="bg-green-700 hover:bg-green-600">
            Run
          </ActionBtn>
        )}
        {app.running && (
          <ActionBtn onClick={onStop} color="bg-yellow-700 hover:bg-yellow-600">
            Stop
          </ActionBtn>
        )}
        {app.enabled ? (
          <ActionBtn onClick={onDisable} color="bg-gray-700 hover:bg-gray-600">
            Disable
          </ActionBtn>
        ) : (
          <ActionBtn onClick={onEnable} color="bg-blue-700 hover:bg-blue-600">
            Enable
          </ActionBtn>
        )}
        <Link
          to={`/apps/${appId}/settings`}
          className="px-2.5 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 transition-colors"
        >
          Settings
        </Link>

        {confirmPurge ? (
          <div className="flex gap-1">
            <ActionBtn onClick={() => { onPurge(); setConfirmPurge(false) }} color="bg-red-700 hover:bg-red-600">
              Confirm
            </ActionBtn>
            <ActionBtn onClick={() => setConfirmPurge(false)} color="bg-gray-700 hover:bg-gray-600">
              Cancel
            </ActionBtn>
          </div>
        ) : (
          <ActionBtn onClick={() => setConfirmPurge(true)} color="bg-red-900/50 hover:bg-red-800">
            Purge
          </ActionBtn>
        )}
      </div>
    </div>
  )
}

function ActionBtn({
  onClick,
  color,
  children,
}: {
  onClick: () => void
  color: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 text-xs rounded transition-colors ${color}`}
    >
      {children}
    </button>
  )
}

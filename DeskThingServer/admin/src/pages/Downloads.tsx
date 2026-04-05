import { useEffect } from 'react'
import { useReleaseStore, Release } from '../stores/releaseStore'
import ProgressTracker from '../components/ProgressTracker'

const APP_DOWNLOAD_CHANNELS = [
  'st-release-app-download',
  'st-app-install',
  'fn-app-install',
  'fn-app-postinstall',
]
const CLIENT_DOWNLOAD_CHANNELS = [
  'st-release-client-download',
  'store-client-download',
  'store-client-install',
  'fn-client-install',
]

export default function Downloads() {
  const {
    appReleases,
    clientReleases,
    loading,
    fetchAppReleases,
    fetchClientReleases,
    downloadApp,
    downloadClient,
    refreshReleases,
  } = useReleaseStore()

  useEffect(() => {
    fetchAppReleases()
    fetchClientReleases()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Downloads</h2>
        <button
          onClick={refreshReleases}
          disabled={loading}
          className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded transition-colors"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <Section title="App Releases">
        {appReleases.length === 0 ? (
          <p className="text-gray-500 text-sm">No app releases available.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {appReleases.map((r) => (
              <ReleaseCard
                key={r.id}
                release={r}
                onDownload={() => downloadApp(r.id)}
              />
            ))}
          </div>
        )}
        <div className="mt-4">
          <ProgressTracker channels={APP_DOWNLOAD_CHANNELS} />
        </div>
      </Section>

      <Section title="Client Releases">
        {clientReleases.length === 0 ? (
          <p className="text-gray-500 text-sm">No client releases available.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {clientReleases.map((r) => (
              <ReleaseCard
                key={r.id}
                release={r}
                onDownload={() => downloadClient(r.id)}
              />
            ))}
          </div>
        )}
        <div className="mt-4">
          <ProgressTracker channels={CLIENT_DOWNLOAD_CHANNELS} />
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-400 mb-3">{title}</h3>
      {children}
    </div>
  )
}

function ReleaseCard({ release, onDownload }: { release: Release; onDownload: () => void }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium text-sm">{release.name || release.id}</h4>
          {release.version && (
            <span className="text-xs text-gray-500">v{release.version}</span>
          )}
        </div>
      </div>
      {release.description && (
        <p className="text-xs text-gray-400 line-clamp-2">{release.description}</p>
      )}
      {release.author && (
        <p className="text-xs text-gray-500">{release.author}</p>
      )}
      <button
        onClick={onDownload}
        className="mt-auto px-3 py-1.5 text-xs bg-blue-700 hover:bg-blue-600 rounded transition-colors self-start"
      >
        Download
      </button>
    </div>
  )
}

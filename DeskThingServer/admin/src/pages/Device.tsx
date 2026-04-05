import { useEffect, useState } from 'react'
import { adminFetch } from '../api/client'
import ProgressTracker from '../components/ProgressTracker'

const ALL_PROGRESS_CHANNELS = [
  'st-flash-runner',
  'fn-flash-runner',
  'st-flash-driver',
  'st-flash-auto',
  'st-device-firmware-download',
  'st-thingify-recommended-download',
]

interface FirmwareVersion {
  id: string
  version: string
  changelog: string
  downloadCount: number
}

interface Firmware {
  id: string
  name: string
  description: string
  versions?: FirmwareVersion[]
}

interface VersionFile {
  id: string
  fileName: string
  fileSize: number
  downloadUrl: string
}

interface VersionDetail {
  id: string
  version: string
  changelog: string
  files: VersionFile[]
}

export default function Device() {
  const [flashState, setFlashState] = useState<any>(null)
  const [firmware, setFirmware] = useState<Firmware | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoconfigRunning, setAutoconfigRunning] = useState(false)
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null)
  const [versionDetail, setVersionDetail] = useState<VersionDetail | null>(null)
  const [loadingVersion, setLoadingVersion] = useState(false)
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null)
  const [stagedFile, setStagedFile] = useState<string>('')
  const [flashingStaged, setFlashingStaged] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      adminFetch('/flash/state').catch(() => null),
      adminFetch<Firmware>('/thingify/firmware').catch(() => null),
      adminFetch<string>('/thingify/file').catch(() => ''),
    ]).then(([fs, fw, staged]) => {
      setFlashState(fs)
      setFirmware(fw)
      setStagedFile(staged || '')
      setLoading(false)
    })
  }, [])

  const handleAutoconfig = async () => {
    setAutoconfigRunning(true)
    try {
      await adminFetch('/flash/autoconfig', { method: 'POST' })
    } catch (e) {
      console.error('Autoconfig failed:', e)
    } finally {
      setAutoconfigRunning(false)
      // Refresh state
      adminFetch('/flash/state').then(setFlashState).catch(() => {})
      adminFetch<string>('/thingify/file').then((s) => setStagedFile(s || '')).catch(() => {})
    }
  }

  const handleExpandVersion = async (versionId: string) => {
    if (expandedVersion === versionId) {
      setExpandedVersion(null)
      setVersionDetail(null)
      return
    }
    setExpandedVersion(versionId)
    setLoadingVersion(true)
    try {
      const detail = await adminFetch<VersionDetail>(`/thingify/firmware/${versionId}`)
      setVersionDetail(detail)
    } catch {
      setVersionDetail(null)
    } finally {
      setLoadingVersion(false)
    }
  }

  const handleDownloadFile = async (versionId: string, fileId: string) => {
    setDownloadingFile(fileId)
    try {
      await adminFetch('/thingify/download', {
        method: 'POST',
        body: JSON.stringify({ version: versionId, file: fileId }),
      })
      // Refresh staged file
      const staged = await adminFetch<string>('/thingify/file').catch(() => '')
      setStagedFile(staged || '')
    } catch (e) {
      console.error('Download failed:', e)
    } finally {
      setDownloadingFile(null)
    }
  }

  const handleFlashStaged = async () => {
    setFlashingStaged(true)
    try {
      await adminFetch('/flash/start', { method: 'POST' })
    } catch (e) {
      console.error('Flash failed:', e)
    } finally {
      setFlashingStaged(false)
      adminFetch('/flash/state').then(setFlashState).catch(() => {})
    }
  }

  if (loading) return <p className="text-gray-400">Loading device info...</p>

  return (
    <div className="space-y-6 max-w-3xl">
      <h2 className="text-2xl font-semibold">Device</h2>

      {/* Quick Setup */}
      <div className="rounded-lg border border-blue-900 bg-blue-950/30 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-blue-300">Quick Setup</h3>
            <p className="text-xs text-gray-400 mt-1">
              Automatically downloads the recommended firmware and flashes your
              device in one step.
            </p>
          </div>
          <button
            onClick={handleAutoconfig}
            disabled={autoconfigRunning}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded transition-colors shrink-0"
          >
            {autoconfigRunning ? 'Running...' : 'Auto Configure'}
          </button>
        </div>
        <ProgressTracker channels={ALL_PROGRESS_CHANNELS} />
      </div>

      {/* Flash state */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Flash State</h3>
        {flashState ? (
          <div className="space-y-2 text-sm">
            {Object.entries(flashState).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-gray-400">{key}</span>
                <span className="text-gray-200">
                  {typeof val === 'boolean' ? (
                    <span className={val ? 'text-green-400' : 'text-gray-500'}>
                      {val ? 'Yes' : 'No'}
                    </span>
                  ) : typeof val === 'object' && val !== null ? (
                    <span className="text-gray-400 text-xs font-mono">
                      {JSON.stringify(val, null, 2)}
                    </span>
                  ) : (
                    String(val ?? '--')
                  )}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No flash state available.</p>
        )}

        {/* Staged file + manual flash */}
        {stagedFile && (
          <div className="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-500">Staged firmware:</span>
              <span className="text-sm text-gray-300 ml-2 font-mono">{stagedFile}</span>
            </div>
            <button
              onClick={handleFlashStaged}
              disabled={flashingStaged}
              className="px-3 py-1.5 text-xs bg-blue-700 hover:bg-blue-600 disabled:opacity-50 rounded transition-colors"
            >
              {flashingStaged ? 'Flashing...' : 'Flash Staged'}
            </button>
          </div>
        )}
      </div>

      {/* Firmware versions */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-3">
          {firmware?.name || 'Firmware'}
        </h3>
        {firmware?.description && (
          <p className="text-xs text-gray-500 mb-3">{firmware.description}</p>
        )}

        {!firmware?.versions || firmware.versions.length === 0 ? (
          <p className="text-gray-500 text-sm">No firmware versions available.</p>
        ) : (
          <div className="space-y-2">
            {firmware.versions.map((ver) => (
              <div key={ver.id}>
                <button
                  onClick={() => handleExpandVersion(ver.id)}
                  className="w-full flex items-center justify-between rounded border border-gray-800 bg-gray-950 p-3 hover:bg-gray-900/50 transition-colors text-left"
                >
                  <div>
                    <span className="text-sm font-medium">v{ver.version}</span>
                    {ver.downloadCount > 0 && (
                      <span className="text-xs text-gray-600 ml-2">
                        {ver.downloadCount} downloads
                      </span>
                    )}
                  </div>
                  <span className="text-gray-600 text-xs">
                    {expandedVersion === ver.id ? 'Collapse' : 'Expand'}
                  </span>
                </button>

                {expandedVersion === ver.id && (
                  <div className="ml-4 mt-2 space-y-2">
                    {ver.changelog && (
                      <p className="text-xs text-gray-400">{ver.changelog}</p>
                    )}
                    {loadingVersion ? (
                      <p className="text-xs text-gray-500">Loading files...</p>
                    ) : versionDetail?.files ? (
                      versionDetail.files.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between rounded border border-gray-800 bg-gray-950 px-3 py-2"
                        >
                          <div>
                            <span className="text-xs text-gray-300 font-mono">
                              {file.fileName}
                            </span>
                            <span className="text-xs text-gray-600 ml-2">
                              {(file.fileSize / 1024 / 1024).toFixed(1)} MB
                            </span>
                          </div>
                          <button
                            onClick={() => handleDownloadFile(ver.id, file.id)}
                            disabled={downloadingFile !== null}
                            className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded transition-colors"
                          >
                            {downloadingFile === file.id
                              ? 'Downloading...'
                              : 'Download'}
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-500">
                        No files available for this version.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

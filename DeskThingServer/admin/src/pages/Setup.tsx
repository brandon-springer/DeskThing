import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminFetch } from '../api/client'
import { useReleaseStore, Release } from '../stores/releaseStore'
import { useClientStore } from '../stores/clientStore'
import QRCode from '../components/QRCode'
import ProgressTracker from '../components/ProgressTracker'

const STEPS = ['Welcome', 'Network', 'Install App', 'Connect', 'Done']

const APP_PROGRESS_CHANNELS = [
  'st-release-app-download',
  'st-app-install',
  'fn-app-install',
  'fn-app-postinstall',
]

interface ConnectionInfo {
  ips: string[]
  port: number
  adminUrl: string
  clientUrl: string
}

export default function Setup() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null)
  const [finishing, setFinishing] = useState(false)

  useEffect(() => {
    adminFetch<Record<string, any>>('/settings').then((settings) => {
      const ips: string[] = settings.server_localIp || ['127.0.0.1']
      const port = settings.device_devicePort || 8891
      // Prefer the IP the user is currently connected through
      const currentHost = location.hostname
      const sortedIps = ips.includes(currentHost)
        ? [currentHost, ...ips.filter((ip) => ip !== currentHost)]
        : ips
      setConnectionInfo({
        ips: sortedIps,
        port,
        adminUrl: `http://${sortedIps[0]}:${port}/admin/`,
        clientUrl: `http://${sortedIps[0]}:${port}/client/`,
      })
    })
  }, [])

  const completeSetup = useCallback(async () => {
    setFinishing(true)
    try {
      await adminFetch('/flags/flag_hasOpened', {
        method: 'PUT',
        body: JSON.stringify({ state: true }),
      })
      navigate('/')
    } catch (e) {
      console.error('Failed to complete setup:', e)
      setFinishing(false)
    }
  }, [navigate])

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-2xl space-y-8">
          {/* Step indicator */}
          <StepIndicator current={currentStep} steps={STEPS} />

          {/* Step content */}
          <div className="min-h-[400px]">
            {currentStep === 0 && <WelcomeStep info={connectionInfo} />}
            {currentStep === 1 && <NetworkStep info={connectionInfo} />}
            {currentStep === 2 && <InstallAppStep />}
            {currentStep === 3 && <ConnectClientStep info={connectionInfo} />}
            {currentStep === 4 && (
              <DoneStep onFinish={completeSetup} finishing={finishing} />
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-800">
            {currentStep > 0 ? (
              <button
                onClick={() => setCurrentStep((s) => s - 1)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
              >
                Back
              </button>
            ) : (
              <div />
            )}
            {currentStep < STEPS.length - 1 && (
              <button
                onClick={() => setCurrentStep((s) => s + 1)}
                className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded transition-colors"
              >
                {currentStep === 2 || currentStep === 3 ? 'Skip' : 'Next'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- Step Indicator ---------- */

function StepIndicator({ current, steps }: { current: number; steps: string[] }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-colors ${
                i < current
                  ? 'bg-green-600 border-green-600 text-white'
                  : i === current
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-700 text-gray-600'
              }`}
            >
              {i < current ? '\u2713' : i + 1}
            </div>
            <span
              className={`text-[10px] ${i === current ? 'text-gray-300' : 'text-gray-600'}`}
            >
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`w-8 h-0.5 mb-4 ${i < current ? 'bg-green-600' : 'bg-gray-700'}`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

/* ---------- Step 0: Welcome ---------- */

function WelcomeStep({ info }: { info: ConnectionInfo | null }) {
  return (
    <div className="text-center space-y-6">
      <h1 className="text-3xl font-bold">Welcome to DeskThing</h1>
      <p className="text-gray-400 max-w-md mx-auto">
        DeskThing turns your device into a customizable smart display. This wizard
        will help you get set up.
      </p>
      {info && (
        <div className="space-y-4">
          <QRCode url={info.adminUrl} size={180} />
          <p className="text-xs text-gray-500">
            Scan to open this admin panel on another device
          </p>
          <p className="text-sm text-gray-400">
            Server running at{' '}
            <code className="text-blue-400">
              {info.ips[0]}:{info.port}
            </code>
          </p>
        </div>
      )}
    </div>
  )
}

/* ---------- Step 1: Network ---------- */

function NetworkStep({ info }: { info: ConnectionInfo | null }) {
  const [copied, setCopied] = useState<string | null>(null)

  const copy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(text)
    setTimeout(() => setCopied(null), 2000)
  }

  if (!info) return <p className="text-gray-500">Loading network info...</p>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Network</h2>
        <p className="text-sm text-gray-400">
          Your server is reachable at the following addresses.
        </p>
      </div>

      <div className="flex items-center gap-2 text-green-400 text-sm">
        <span className="w-2 h-2 rounded-full bg-green-400" />
        Server is reachable
      </div>

      <div className="space-y-2">
        {info.ips.map((ip, i) => {
          const url = `http://${ip}:${info.port}/admin/`
          return (
            <div
              key={ip}
              className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900 px-4 py-3"
            >
              <div>
                <code className="text-sm text-gray-200">{url}</code>
                {i === 0 && (
                  <span className="ml-2 text-[10px] bg-blue-900 text-blue-300 px-1.5 py-0.5 rounded">
                    current
                  </span>
                )}
              </div>
              <button
                onClick={() => copy(url)}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                {copied === url ? 'Copied!' : 'Copy'}
              </button>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-gray-600">
        Port: <code>{info.port}</code>
      </p>
    </div>
  )
}

/* ---------- Step 2: Install App ---------- */

function InstallAppStep() {
  const { appReleases, loading, fetchAppReleases, downloadApp } = useReleaseStore()
  const [installing, setInstalling] = useState<string | null>(null)

  useEffect(() => {
    fetchAppReleases()
  }, [])

  const handleInstall = async (release: Release) => {
    setInstalling(release.id)
    try {
      await downloadApp(release.id)
    } catch (e) {
      console.error('Install failed:', e)
    } finally {
      setInstalling(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Install an App</h2>
        <p className="text-sm text-gray-400">
          Pick an app to get started. You can install more later from the Downloads
          page.
        </p>
      </div>

      {loading && appReleases.length === 0 ? (
        <p className="text-gray-500 text-sm">Loading available apps...</p>
      ) : appReleases.length === 0 ? (
        <p className="text-gray-500 text-sm">
          No app releases available. You can add repos later in Settings.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {appReleases.map((r) => (
            <div
              key={r.id}
              className="rounded-lg border border-gray-800 bg-gray-900 p-4 flex flex-col gap-2"
            >
              <div>
                <h4 className="font-medium text-sm">{r.name || r.id}</h4>
                {r.version && (
                  <span className="text-xs text-gray-500">v{r.version}</span>
                )}
              </div>
              {r.description && (
                <p className="text-xs text-gray-400 line-clamp-2">
                  {r.description}
                </p>
              )}
              <button
                onClick={() => handleInstall(r)}
                disabled={installing !== null}
                className="mt-auto px-3 py-1.5 text-xs bg-blue-700 hover:bg-blue-600 disabled:opacity-50 rounded transition-colors self-start"
              >
                {installing === r.id ? 'Installing...' : 'Install'}
              </button>
            </div>
          ))}
        </div>
      )}

      <ProgressTracker
        channels={APP_PROGRESS_CHANNELS}
        title="Installation Progress"
      />
    </div>
  )
}

/* ---------- Step 3: Connect Client ---------- */

function ConnectClientStep({ info }: { info: ConnectionInfo | null }) {
  const { clients, fetchClients } = useClientStore()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchClients()
    const interval = setInterval(fetchClients, 3000)
    return () => clearInterval(interval)
  }, [])

  const connectedClients = clients.filter((c) => c.connected)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Connect a Client</h2>
        <p className="text-sm text-gray-400">
          Scan the QR code below from your device's browser to connect it as a
          display client.
        </p>
      </div>

      {info && (
        <div className="flex flex-col items-center gap-4">
          <QRCode url={info.clientUrl} size={250} />
          <div className="flex items-center gap-2">
            <code className="text-sm text-gray-300">{info.clientUrl}</code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(info.clientUrl)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {connectedClients.length > 0 ? (
        <div className="flex items-center gap-2 text-green-400 text-sm justify-center">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          {connectedClients.length} client{connectedClients.length > 1 ? 's' : ''}{' '}
          connected
          {connectedClients[0].device_type && (
            <span className="text-gray-500">
              ({connectedClients[0].device_type})
            </span>
          )}
        </div>
      ) : (
        <p className="text-center text-xs text-gray-600 animate-pulse">
          Waiting for a client to connect...
        </p>
      )}
    </div>
  )
}

/* ---------- Step 4: Done ---------- */

function DoneStep({
  onFinish,
  finishing,
}: {
  onFinish: () => void
  finishing: boolean
}) {
  return (
    <div className="text-center space-y-6">
      <h2 className="text-2xl font-bold text-green-400">You're all set!</h2>
      <p className="text-gray-400 max-w-md mx-auto">
        Your DeskThing server is configured and ready. Head to the dashboard to
        manage your apps, clients, and settings.
      </p>
      <button
        onClick={onFinish}
        disabled={finishing}
        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded text-sm font-medium transition-colors"
      >
        {finishing ? 'Finishing...' : 'Go to Dashboard'}
      </button>
    </div>
  )
}

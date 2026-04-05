import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useClientStore } from '../stores/clientStore'

export default function Clients() {
  const { clients, loading, fetchClients } = useClientStore()
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    fetchClients()
  }, [])

  const clientUrl = `${location.protocol}//${location.hostname}:8891/client/`

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Clients</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPreview((v) => !v)}
            className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          >
            {showPreview ? 'Hide Preview' : 'Preview'}
          </button>
          <Link
            to="/clients/mapping"
            className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          >
            Mapping
          </Link>
          <button
            onClick={fetchClients}
            className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Client preview */}
      {showPreview && (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-400">Client Preview</h3>
            <a
              href={clientUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              Open in new tab
            </a>
          </div>
          <div className="rounded border border-gray-800 overflow-hidden bg-black">
            <iframe
              src={clientUrl}
              title="Client Preview"
              className="w-full h-[480px] border-0"
            />
          </div>
        </div>
      )}

      {loading && clients.length === 0 ? (
        <p className="text-gray-400">Loading clients...</p>
      ) : clients.length === 0 ? (
        <p className="text-gray-500">No clients connected.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-900">
              <tr>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Client ID</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Device Type</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Platform</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {clients.map((client, i) => (
                <tr key={client.clientId ?? i} className="bg-gray-950 hover:bg-gray-900/50">
                  <td className="px-4 py-3 font-mono text-xs">
                    {truncate(client.clientId, 16)}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {client.device_type || '--'}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {client.platform || '--'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-medium ${
                        client.connected ? 'text-green-400' : 'text-gray-500'
                      }`}
                    >
                      {client.connected ? 'Connected' : 'Disconnected'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function truncate(str: string, len: number): string {
  if (!str) return '--'
  return str.length > len ? str.slice(0, len) + '...' : str
}

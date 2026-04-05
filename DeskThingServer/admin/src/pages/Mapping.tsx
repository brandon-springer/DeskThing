import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminFetch } from '../api/client'

export default function Mapping() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [mapping, setMapping] = useState<any>(null)
  const [actions, setActions] = useState<any[]>([])
  const [keys, setKeys] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      adminFetch<any[]>('/profiles').catch(() => []),
      adminFetch<any>('/mappings').catch(() => null),
      adminFetch<any[]>('/actions').catch(() => []),
      adminFetch<any[]>('/keys').catch(() => []),
    ]).then(([p, m, a, k]) => {
      setProfiles(Array.isArray(p) ? p : [])
      setMapping(m)
      setActions(Array.isArray(a) ? a : [])
      setKeys(Array.isArray(k) ? k : [])
      setLoading(false)
    })
  }, [])

  if (loading) return <p className="text-gray-400">Loading mapping data...</p>

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link to="/clients" className="text-gray-500 hover:text-gray-300 text-sm">
          &larr; Clients
        </Link>
        <h2 className="text-2xl font-semibold">Mapping</h2>
      </div>

      {/* Current mapping */}
      <Section title="Current Mapping">
        {mapping ? (
          <pre className="text-xs text-gray-300 bg-gray-800 rounded p-3 overflow-x-auto">
            {JSON.stringify(mapping, null, 2)}
          </pre>
        ) : (
          <p className="text-gray-500 text-sm">No mapping data.</p>
        )}
      </Section>

      {/* Profiles */}
      <Section title={`Profiles (${profiles.length})`}>
        {profiles.length === 0 ? (
          <p className="text-gray-500 text-sm">No profiles available.</p>
        ) : (
          <div className="space-y-2">
            {profiles.map((p, i) => (
              <div
                key={i}
                className="rounded border border-gray-800 bg-gray-900 p-3 text-sm"
              >
                <span className="font-medium">{p.name || p.id || `Profile ${i + 1}`}</span>
                {p.version && (
                  <span className="ml-2 text-xs text-gray-500">v{p.version}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Actions */}
      <Section title={`Actions (${actions.length})`}>
        {actions.length === 0 ? (
          <p className="text-gray-500 text-sm">No actions.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {actions.map((a, i) => (
              <div
                key={i}
                className="rounded border border-gray-800 bg-gray-900 p-3 text-sm"
              >
                <div className="font-medium">{a.name || a.id || `Action ${i + 1}`}</div>
                {a.description && (
                  <p className="text-xs text-gray-500 mt-1">{a.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Keys */}
      <Section title={`Keys (${keys.length})`}>
        {keys.length === 0 ? (
          <p className="text-gray-500 text-sm">No key bindings.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {keys.map((k, i) => (
              <div
                key={i}
                className="rounded border border-gray-800 bg-gray-900 p-3 text-sm"
              >
                <span className="font-mono text-xs bg-gray-800 px-1.5 py-0.5 rounded">
                  {k.key || k.id || `Key ${i + 1}`}
                </span>
                {k.action && (
                  <span className="ml-2 text-gray-400">{k.action}</span>
                )}
              </div>
            ))}
          </div>
        )}
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

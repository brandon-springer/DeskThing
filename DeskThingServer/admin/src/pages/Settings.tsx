import { useEffect, useState, useMemo } from 'react'
import { useSettingsStore } from '../stores/settingsStore'

export default function Settings() {
  const { settings, loading, fetchSettings, updateSettings } = useSettingsStore()
  const [draft, setDraft] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  useEffect(() => {
    setDraft({ ...settings })
  }, [settings])

  const grouped = useMemo(() => {
    const groups: Record<string, [string, any][]> = {}
    for (const [key, val] of Object.entries(draft)) {
      const prefix = key.includes('_') ? key.split('_')[0] : 'general'
      if (!groups[prefix]) groups[prefix] = []
      groups[prefix].push([key, val])
    }
    // Sort groups alphabetically
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [draft])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateSettings(draft)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  if (loading && Object.keys(settings).length === 0) {
    return <p className="text-gray-400">Loading settings...</p>
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Settings</h2>
        <div className="flex items-center gap-3">
          {saved && <span className="text-green-400 text-sm">Saved</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded transition-colors"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {grouped.length === 0 ? (
        <p className="text-gray-500">No settings available.</p>
      ) : (
        grouped.map(([group, entries]) => (
          <div key={group} className="rounded-lg border border-gray-800 bg-gray-900 p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-4 capitalize">{group}</h3>
            <div className="space-y-3">
              {entries.map(([key, val]) => (
                <SettingRow
                  key={key}
                  name={key}
                  value={val}
                  onChange={(v) => setDraft((d) => ({ ...d, [key]: v }))}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function SettingRow({
  name,
  value,
  onChange,
}: {
  name: string
  value: any
  onChange: (val: any) => void
}) {
  const inputClass =
    'w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-blue-500'

  if (typeof value === 'boolean') {
    return (
      <div className="flex items-center justify-between">
        <label className="text-sm text-gray-300">{name}</label>
        <button
          onClick={() => onChange(!value)}
          className={`px-3 py-1 text-xs rounded transition-colors ${
            value ? 'bg-blue-600 hover:bg-blue-500' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          {value ? 'Enabled' : 'Disabled'}
        </button>
      </div>
    )
  }

  if (typeof value === 'number') {
    return (
      <div>
        <label className="block text-sm text-gray-300 mb-1">{name}</label>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={inputClass}
        />
      </div>
    )
  }

  if (typeof value === 'object' && value !== null) {
    return (
      <div>
        <label className="block text-sm text-gray-300 mb-1">{name}</label>
        <pre className="text-xs text-gray-400 bg-gray-800 rounded p-2 overflow-x-auto">
          {JSON.stringify(value, null, 2)}
        </pre>
      </div>
    )
  }

  return (
    <div>
      <label className="block text-sm text-gray-300 mb-1">{name}</label>
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </div>
  )
}

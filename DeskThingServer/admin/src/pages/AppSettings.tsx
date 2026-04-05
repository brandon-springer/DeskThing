import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAppStore, AppSetting } from '../stores/appStore'

export default function AppSettings() {
  const { id } = useParams<{ id: string }>()
  const { appSettings, fetchAppSettings, updateAppSettings } = useAppStore()
  const settings = id ? appSettings[id] : undefined
  const [draft, setDraft] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (id) fetchAppSettings(id)
  }, [id])

  useEffect(() => {
    if (settings) {
      const values: Record<string, any> = {}
      for (const [key, setting] of Object.entries(settings)) {
        values[key] = setting.value
      }
      setDraft(values)
    }
  }, [settings])

  const handleSave = async () => {
    if (!id) return
    setSaving(true)
    try {
      await updateAppSettings(id, draft)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  if (!id) return <p className="text-gray-400">No app selected.</p>

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link to="/apps" className="text-gray-500 hover:text-gray-300 text-sm">
          &larr; Apps
        </Link>
        <h2 className="text-2xl font-semibold">{id} Settings</h2>
      </div>

      {!settings ? (
        <p className="text-gray-500">Loading settings...</p>
      ) : Object.keys(settings).length === 0 ? (
        <p className="text-gray-500">No settings available for this app.</p>
      ) : (
        <div className="space-y-4">
          {Object.entries(settings).map(([key, setting]) => (
            <SettingField
              key={key}
              name={key}
              setting={setting}
              value={draft[key]}
              onChange={(val) => setDraft((d) => ({ ...d, [key]: val }))}
            />
          ))}

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded transition-colors"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            {saved && <span className="text-green-400 text-sm">Saved</span>}
          </div>
        </div>
      )}
    </div>
  )
}

function SettingField({
  name,
  setting,
  value,
  onChange,
}: {
  name: string
  setting: AppSetting
  value: any
  onChange: (val: any) => void
}) {
  const label = setting.label || name
  const base = 'w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-blue-500'

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">
        {label}
      </label>
      {setting.description && (
        <p className="text-xs text-gray-500 mb-2">{setting.description}</p>
      )}

      {setting.type === 'boolean' ? (
        <button
          onClick={() => onChange(!value)}
          className={`px-3 py-1.5 text-sm rounded transition-colors ${
            value ? 'bg-blue-600 hover:bg-blue-500' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          {value ? 'Enabled' : 'Disabled'}
        </button>
      ) : setting.type === 'select' && setting.options ? (
        <select
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={base}
        >
          {setting.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : setting.type === 'number' ? (
        <input
          type="number"
          value={value ?? ''}
          min={setting.min}
          max={setting.max}
          onChange={(e) => onChange(Number(e.target.value))}
          className={base}
        />
      ) : (
        <input
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={base}
        />
      )}
    </div>
  )
}

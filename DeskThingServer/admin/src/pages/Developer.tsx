import { useEffect, useRef, useState } from 'react'
import { useLogStore, Log } from '../stores/logStore'
import { adminFetch } from '../api/client'

const levelColors: Record<string, string> = {
  error: 'text-red-400',
  warn: 'text-yellow-400',
  warning: 'text-yellow-400',
  debug: 'text-gray-500',
  log: 'text-gray-300',
  info: 'text-blue-400',
}

export default function Developer() {
  const { logs, fetchLogs } = useLogStore()
  const [systemInfo, setSystemInfo] = useState<any>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchLogs()
    adminFetch('/system-info').then(setSystemInfo).catch(() => {})
  }, [])

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  const handleScroll = () => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 50)
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-2xl font-semibold">Developer</h2>
        <div className="flex gap-2 items-center">
          <label className="flex items-center gap-2 text-xs text-gray-400">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded"
            />
            Auto-scroll
          </label>
          <button
            onClick={fetchLogs}
            className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          >
            Reload
          </button>
        </div>
      </div>

      {/* Log viewer */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto bg-gray-900 rounded-lg border border-gray-800 p-3 font-mono text-xs leading-5"
      >
        {logs.length === 0 ? (
          <p className="text-gray-500">No logs.</p>
        ) : (
          logs.map((log, i) => <LogLine key={i} log={log} />)
        )}
      </div>

      {/* System info */}
      {systemInfo && (
        <div className="shrink-0 rounded-lg border border-gray-800 bg-gray-900 p-4">
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

function LogLine({ log }: { log: Log }) {
  const level = (log.level || 'log').toLowerCase()
  const color = levelColors[level] || 'text-gray-300'

  return (
    <div className="flex gap-2 hover:bg-gray-800/50 px-1 rounded">
      {log.timestamp && (
        <span className="text-gray-600 shrink-0">
          {new Date(log.timestamp).toLocaleTimeString()}
        </span>
      )}
      <span className={`shrink-0 w-12 text-right ${color}`}>
        {level}
      </span>
      {log.source && (
        <span className="text-gray-500 shrink-0">[{log.source}]</span>
      )}
      <span className={color}>{log.message}</span>
    </div>
  )
}

import { useState, useRef, useEffect, useCallback } from 'react'
import { adminFetch } from '../api/client'
import ProgressTracker from '../components/ProgressTracker'

interface HistoryEntry {
  command: string
  output: string
  error: boolean
  timestamp: number
}

const ADB_CHANNELS = ['adb']

export default function AdbConsole() {
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [running, setRunning] = useState(false)
  const [cmdHistory, setCmdHistory] = useState<string[]>([])
  const [historyIdx, setHistoryIdx] = useState(-1)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight)
  }, [history])

  const executeCommand = useCallback(async (cmd: string) => {
    if (!cmd || running) return

    setInput('')
    setRunning(true)
    setCmdHistory((prev) => [cmd, ...prev])
    setHistoryIdx(-1)

    try {
      const output = await adminFetch<string>('/adb/command', {
        method: 'POST',
        body: JSON.stringify({ command: cmd }),
      })
      setHistory((prev) => [
        ...prev,
        { command: cmd, output: String(output ?? '(no output)'), error: false, timestamp: Date.now() },
      ])
    } catch (e) {
      setHistory((prev) => [
        ...prev,
        {
          command: cmd,
          output: e instanceof Error ? e.message : String(e),
          error: true,
          timestamp: Date.now(),
        },
      ])
    } finally {
      setRunning(false)
      inputRef.current?.focus()
    }
  }, [running])

  const execute = useCallback(() => {
    executeCommand(input.trim())
  }, [input, executeCommand])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      execute()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (cmdHistory.length > 0) {
        const next = Math.min(historyIdx + 1, cmdHistory.length - 1)
        setHistoryIdx(next)
        setInput(cmdHistory[next])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIdx > 0) {
        const next = historyIdx - 1
        setHistoryIdx(next)
        setInput(cmdHistory[next])
      } else {
        setHistoryIdx(-1)
        setInput('')
      }
    }
  }

  return (
    <div className="flex flex-col h-full max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-semibold">ADB Console</h2>
          <p className="text-xs text-gray-500 mt-1">
            Run ADB commands directly on connected devices
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => executeCommand('devices')}
            className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          >
            List Devices
          </button>
          <button
            onClick={() => setHistory([])}
            className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Output */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-[400px] max-h-[calc(100vh-280px)] overflow-y-auto rounded-lg border border-gray-800 bg-gray-950 p-4 font-mono text-xs space-y-3"
      >
        {history.length === 0 && (
          <p className="text-gray-600">
            Type an ADB command below. The &quot;adb&quot; prefix is added automatically.
          </p>
        )}
        {history.map((entry) => (
          <div key={entry.timestamp} className="space-y-1">
            <div className="text-blue-400">
              <span className="text-gray-600 select-none">$ adb </span>
              {entry.command}
            </div>
            <pre
              className={`whitespace-pre-wrap break-all ${
                entry.error ? 'text-red-400' : 'text-gray-300'
              }`}
            >
              {entry.output}
            </pre>
          </div>
        ))}
        {running && (
          <div className="text-gray-500 animate-pulse">Running...</div>
        )}
      </div>

      {/* Progress */}
      <div className="mt-3">
        <ProgressTracker channels={ADB_CHANNELS} />
      </div>

      {/* Input */}
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-900 px-3 py-2">
        <span className="text-gray-600 font-mono text-sm select-none">adb</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="devices"
          disabled={running}
          autoFocus
          className="flex-1 bg-transparent text-sm font-mono text-gray-100 outline-none placeholder:text-gray-700 disabled:opacity-50"
        />
        <button
          onClick={execute}
          disabled={running || !input.trim()}
          className="px-3 py-1 text-xs bg-blue-700 hover:bg-blue-600 disabled:opacity-50 rounded transition-colors"
        >
          Run
        </button>
      </div>
    </div>
  )
}

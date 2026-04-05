import { useState, useEffect } from 'react'
import { adminWs } from '../api/websocket'

interface ProgressEvent {
  channel: string
  operation: string
  status: string
  message: string
  progress?: number
  isLoading?: boolean
  error?: string
}

interface ProgressTrackerProps {
  channels: string[]
  title?: string
}

const STATUS_COLORS: Record<string, string> = {
  running: 'bg-blue-500',
  info: 'bg-blue-500',
  success: 'bg-green-500',
  complete: 'bg-green-500',
  warn: 'bg-yellow-500',
  error: 'bg-red-500',
}

export default function ProgressTracker({ channels, title }: ProgressTrackerProps) {
  const [events, setEvents] = useState<Map<string, ProgressEvent>>(new Map())

  useEffect(() => {
    const handler = (msg: any) => {
      const event = msg.payload as ProgressEvent
      if (!event?.channel || !channels.includes(event.channel)) return
      setEvents((prev) => new Map(prev).set(event.channel, event))
    }

    const unsub = adminWs.on('progress:event', handler)
    return unsub
  }, [channels])

  const active = Array.from(events.values())
  if (active.length === 0 && !title) return null

  return (
    <div className="space-y-3">
      {title && <h4 className="text-sm font-medium text-gray-400">{title}</h4>}
      {active.map((event) => (
        <div key={event.channel} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-300 font-medium">{event.operation}</span>
            {event.progress != null && (
              <span className="text-gray-500">{Math.round(event.progress)}%</span>
            )}
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                STATUS_COLORS[event.status] || 'bg-blue-500'
              } ${event.isLoading ? 'animate-pulse' : ''}`}
              style={{ width: `${event.progress ?? 0}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">
            {event.error || event.message}
          </p>
        </div>
      ))}
    </div>
  )
}

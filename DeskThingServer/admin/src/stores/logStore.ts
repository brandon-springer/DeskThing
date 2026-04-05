import { create } from 'zustand'
import { adminFetch } from '../api/client'
import { adminWs } from '../api/websocket'

export interface Log {
  level: string
  source?: string
  message: string
  timestamp?: string
  [key: string]: any
}

const MAX_LOGS = 500

interface LogState {
  logs: Log[]
  loading: boolean
  fetchLogs: () => Promise<void>
}

export const useLogStore = create<LogState>((set) => ({
  logs: [],
  loading: false,

  fetchLogs: async () => {
    set({ loading: true })
    try {
      const logs = await adminFetch<Log[]>('/logs')
      set({ logs: logs.slice(-MAX_LOGS) })
    } catch (e) {
      console.error('Failed to fetch logs:', e)
    } finally {
      set({ loading: false })
    }
  },
}))

// Subscribe to WebSocket log events
adminWs.on('log', (msg) => {
  useLogStore.setState((state) => {
    const next = [...state.logs, msg.data ?? msg]
    if (next.length > MAX_LOGS) next.splice(0, next.length - MAX_LOGS)
    return { logs: next }
  })
})

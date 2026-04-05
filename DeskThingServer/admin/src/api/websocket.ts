type EventHandler = (data: any) => void

class AdminWebSocket {
  private ws: WebSocket | null = null
  private handlers = new Map<string, Set<EventHandler>>()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private backoff = 1000
  private maxBackoff = 30000

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return

    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${proto}//${location.hostname}:8891/ws/admin`

    this.ws = new WebSocket(url)

    this.ws.onopen = () => {
      this.backoff = 1000
      console.log('[AdminWS] connected')
    }

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        const type = msg.type as string
        if (!type) return
        const handlers = this.handlers.get(type)
        if (handlers) {
          handlers.forEach((h) => h(msg))
        }
        // Also fire wildcard handlers
        const wildcardHandlers = this.handlers.get('*')
        if (wildcardHandlers) {
          wildcardHandlers.forEach((h) => h(msg))
        }
      } catch {
        // ignore malformed messages
      }
    }

    this.ws.onclose = () => {
      console.log('[AdminWS] disconnected, reconnecting...')
      this.reconnect()
    }

    this.ws.onerror = () => {
      this.ws?.close()
    }
  }

  on(type: string, handler: EventHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set())
    }
    this.handlers.get(type)!.add(handler)
    return () => this.off(type, handler)
  }

  off(type: string, handler: EventHandler) {
    this.handlers.get(type)?.delete(handler)
  }

  private reconnect() {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.backoff = Math.min(this.backoff * 2, this.maxBackoff)
      this.connect()
    }, this.backoff)
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.ws?.close()
    this.ws = null
  }
}

export const adminWs = new AdminWebSocket()

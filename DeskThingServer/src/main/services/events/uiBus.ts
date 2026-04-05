import {
  AppIPCData,
  ClientIPCData,
  ServerIPCData,
  UtilityIPCData,
  ProgressEvent
} from '@shared/types'
import { progressBus } from './progressBus'
import { EventEmitter } from 'events'

type EventMap = {
  'app:event': [AppIPCData]
  'client:event': [ClientIPCData]
  'utility:event': [UtilityIPCData]
}

type AdminBroadcaster = (data: ServerIPCData) => void

class UIEventBus extends EventEmitter<EventMap> {
  private static instance: UIEventBus
  private adminBroadcaster: AdminBroadcaster | null = null

  private constructor() {
    super()
    this.setupServerEventHandler()
  }

  static getInstance(): UIEventBus {
    if (!UIEventBus.instance) {
      UIEventBus.instance = new UIEventBus()
    }
    return UIEventBus.instance
  }

  private setupServerEventHandler(): void {
    progressBus.on('progress', (progressEvent: ProgressEvent) => {
      this.sendIpcData({
        type: 'progress:event',
        payload: progressEvent
      })
    })
  }

  setAdminBroadcaster(fn: AdminBroadcaster): void {
    this.adminBroadcaster = fn
  }

  emitAppEvent(data: AppIPCData): void {
    this.emit('app:event', data)
  }

  emitClientEvent(data: ClientIPCData): void {
    this.emit('client:event', data)
  }

  emitUtilityEvent(data: UtilityIPCData): void {
    this.emit('utility:event', data)
  }

  async sendIpcData(data: ServerIPCData): Promise<void> {
    if (this.adminBroadcaster) {
      this.adminBroadcaster(data)
    }
  }
}

export const uiEventBus = UIEventBus.getInstance()

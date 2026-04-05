import { UpdateStoreClass, UpdateStoreEvents } from '@shared/stores/updateStore'
import { CacheableStore, UpdateInfoType, UpdateProgressType } from '@shared/types'
import EventEmitter from 'node:events'
import Logger from '@server/utils/logger'
import { getVersion } from '@server/utils/paths'

export class UpdateStore
  extends EventEmitter<UpdateStoreEvents>
  implements CacheableStore, UpdateStoreClass
{
  private _initialized = false
  private _updateStatus: UpdateInfoType | null = null
  private _updateProgress: UpdateProgressType | null = null

  get initialized(): boolean {
    return this._initialized
  }

  constructor() {
    super()
  }

  clearCache: () => Promise<void> = async () => {}
  saveToFile: () => Promise<void> = async () => {}

  initialize = async (): Promise<void> => {
    if (this._initialized) return

    Logger.debug('Initializing update store (headless — auto-update disabled)', {
      source: 'UpdateStore',
      function: 'initialize'
    })

    this._initialized = true
  }

  checkForUpdates = async (): Promise<string> => {
    Logger.debug(`Current version: ${getVersion()}. Auto-update is not available in headless mode.`, {
      source: 'UpdateStore',
      function: 'checkForUpdates'
    })
    const status: UpdateInfoType = {
      updateAvailable: false,
      updateDownloaded: false
    }
    this.setUpdateStatus(status)
    return 'Auto-update not available in headless mode'
  }

  startDownload = async (): Promise<void> => {
    Logger.warn('startDownload called but auto-update is not available in headless mode', {
      source: 'UpdateStore',
      function: 'startDownload'
    })
  }

  quitAndInstall = (): void => {
    Logger.warn('quitAndInstall called but auto-update is not available in headless mode', {
      source: 'UpdateStore',
      function: 'quitAndInstall'
    })
  }

  getUpdateStatus = (): UpdateInfoType | null => {
    return this._updateStatus
  }

  getUpdateProgress = (): UpdateProgressType | null => {
    return this._updateProgress
  }

  setUpdateStatus = (status: UpdateInfoType): void => {
    this._updateStatus = status
    this.emit('update-status', status)
  }

  setUpdateProgress = (progress: UpdateProgressType): void => {
    this._updateProgress = progress
    this.emit('update-progress', progress)
  }
}

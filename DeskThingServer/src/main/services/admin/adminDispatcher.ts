/**
 * Admin API Dispatcher
 *
 * Runs in the main thread. Receives admin API requests from the Express worker
 * and dispatches them to the appropriate stores.
 */

import { storeProvider } from '@server/stores/storeProvider'
import { IPC_HANDLERS } from '@shared/types/ipc/ipcTypes'
import { IPC_APP_TYPES, AppIPCData } from '@shared/types/ipc/ipcApps'
import { IPC_CLIENT_TYPES, ClientIPCData } from '@shared/types/ipc/ipcClient'
import { IPC_UTILITY_TYPES, UtilityIPCData } from '@shared/types/ipc/ipcUtility'
import { IPC_RELEASE_TYPES, ReleaseIPCData } from '@shared/types/ipc/ipcReleases'
import { IPC_TASK_TYPES, TaskIPCData } from '@shared/types/ipc/ipcTask'
import { IPC_DEVICE_TYPES, DeviceIPCData } from '@shared/types/ipc/ipcDevice'
import { IPC_UPDATE_TYPES, UpdateIPCData } from '@shared/types/ipc/ipcUpdate'
import { IPC_FEEDBACK_TYPES, FeedbackIPCData } from '@shared/types/ipc/ipcFeedback'
import { AdminPayload } from '@shared/types/ipc/ipcAdmin'
import Logger from '@server/utils/logger'

export async function handleAdminRequest(payload: AdminPayload): Promise<unknown> {
  switch (payload.kind) {
    case IPC_HANDLERS.APPS:
      return handleApps(payload)
    case IPC_HANDLERS.CLIENT:
      return handleClient(payload)
    case IPC_HANDLERS.UTILITY:
      return handleUtility(payload)
    case IPC_HANDLERS.RELEASE:
      return handleRelease(payload)
    case IPC_HANDLERS.TASK:
      return handleTask(payload)
    case IPC_HANDLERS.DEVICE:
      return handleDevice(payload)
    case IPC_HANDLERS.UPDATE:
      return handleUpdate(payload)
    case IPC_HANDLERS.FEEDBACK:
      return handleFeedback(payload)
    default:
      throw new Error(`Unknown admin request kind: ${(payload as AdminPayload).kind}`)
  }
}

async function handleApps(data: AppIPCData): Promise<unknown> {
  const appStore = await storeProvider.getStore('appStore')
  const appDataStore = await storeProvider.getStore('appDataStore')

  switch (data.type) {
    case IPC_APP_TYPES.APP:
      return appStore.getAll()

    case IPC_APP_TYPES.DATA:
      if (data.request === 'get') return appDataStore.getData(data.payload)
      if (data.request === 'set') {
        await appDataStore.setData(data.payload.appId, data.payload.data)
        return true
      }
      break

    case IPC_APP_TYPES.SETTINGS:
      if (data.request === 'get') return appDataStore.getSettings(data.payload)
      if (data.request === 'set') {
        await appDataStore.addSettings(data.payload.appId, data.payload.settings)
        return true
      }
      break

    case IPC_APP_TYPES.STOP:
      return appStore.stop(data.payload)
    case IPC_APP_TYPES.DISABLE:
      return appStore.disable(data.payload)
    case IPC_APP_TYPES.ENABLE:
      return appStore.enable(data.payload)
    case IPC_APP_TYPES.RUN:
      return appStore.run(data.payload)
    case IPC_APP_TYPES.PURGE:
      return appStore.purge(data.payload)

    case IPC_APP_TYPES.ZIP:
      return appStore.addApp({ filePath: data.payload })
    case IPC_APP_TYPES.URL:
      return appStore.addApp({ filePath: data.payload })
    case IPC_APP_TYPES.ADD:
      return appStore.addApp(data.payload)

    case IPC_APP_TYPES.STAGED:
      await appStore.runStagedApp(data.payload)
      return true

    case IPC_APP_TYPES.POSTINSTALL:
      return appStore.runPostinstallScript(data.payload)

    case IPC_APP_TYPES.SEND_TO_APP:
      await appStore.sendDataToApp(data.payload.app, data.payload)
      return true

    case IPC_APP_TYPES.APP_ORDER:
      appStore.reorder(data.payload)
      return true

    case IPC_APP_TYPES.ICON:
      return appStore.getIcon(data.payload.appId, data.payload.icon)

    case IPC_APP_TYPES.DEV_ADD_APP:
      return appStore.addApp({ filePath: data.payload.appPath })

    default:
      Logger.warn(`[AdminDispatcher] Unhandled app type: ${(data as AppIPCData).type}`)
      return null
  }
}

async function handleClient(data: ClientIPCData): Promise<unknown> {
  const clientStore = await storeProvider.getStore('clientStore')
  const platformStore = await storeProvider.getStore('platformStore')

  switch (data.type) {
    case IPC_CLIENT_TYPES.CLIENT_MANIFEST:
      if (data.request === 'get') return clientStore.getClient()
      if (data.request === 'set') {
        await clientStore.updateClient(data.payload)
        return true
      }
      if (data.request === 'get-device') {
        return platformStore.sendPlatformData({
          platform: 'adb' as any,
          type: 'get',
          request: 'manifest',
          adbId: data.payload
        } as any)
      }
      if (data.request === 'set-device') {
        return platformStore.sendPlatformData({
          platform: 'adb' as any,
          type: 'set',
          request: 'manifest',
          adbId: data.payload.adbId,
          client: data.payload.client
        } as any)
      }
      break

    case IPC_CLIENT_TYPES.ZIP:
      return clientStore.loadClientFromZip(data.payload)
    case IPC_CLIENT_TYPES.URL:
      return clientStore.loadClientFromURL(data.payload)
    case IPC_CLIENT_TYPES.DOWNLOAD_LATEST:
      return clientStore.downloadLatestClient()

    case IPC_CLIENT_TYPES.PING_CLIENT: {
      const clients = platformStore.getClients()
      return { clients, pinged: data.payload }
    }

    case IPC_CLIENT_TYPES.PUSH_STAGED:
      return platformStore.sendPlatformData({
        platform: 'adb' as any,
        type: 'push',
        request: 'staged',
        adbId: data.payload.adbId
      } as any)

    case IPC_CLIENT_TYPES.PUSH_PROXY_SCRIPT:
      return platformStore.sendPlatformData({
        platform: 'adb' as any,
        type: 'push',
        request: 'proxy-script',
        adbId: data.payload
      } as any)

    case IPC_CLIENT_TYPES.ADB:
      return platformStore.sendPlatformData({
        platform: 'adb' as any,
        type: 'command',
        payload: data.payload
      } as any)

    case IPC_CLIENT_TYPES.RUN_DEVICE_COMMAND:
      return platformStore.sendPlatformData({
        platform: 'adb' as any,
        type: 'command',
        payload: data.payload.command,
        adbId: data.payload.clientId
      } as any)

    case IPC_CLIENT_TYPES.ICON:
      if (data.request === 'get') {
        const mappingStore = await storeProvider.getStore('mappingStore')
        const actions = await mappingStore.getActions()
        const action = actions?.find(
          (a) => a.id === ('id' in data.payload ? data.payload.id : undefined)
        )
        return action?.icon || null
      }
      if (data.request === 'set') {
        const mappingStore = await storeProvider.getStore('mappingStore')
        const actions = await mappingStore.getActions()
        const action = actions?.find((a) => a.id === data.payload.id)
        if (action) {
          action.icon = data.payload.icon
          await mappingStore.addAction(action)
        }
        return true
      }
      break

    default:
      Logger.warn(`[AdminDispatcher] Unhandled client type: ${(data as ClientIPCData).type}`)
      return null
  }
}

async function handleUtility(data: UtilityIPCData): Promise<unknown> {
  const settingsStore = await storeProvider.getStore('settingsStore')

  switch (data.type) {
    case IPC_UTILITY_TYPES.PING:
      return 'pong'

    case IPC_UTILITY_TYPES.SETTINGS:
      if (data.request === 'get') return settingsStore.getSettings()
      if (data.request === 'set') {
        const settings = data.payload
        for (const [key, value] of Object.entries(settings)) {
          await settingsStore.saveSetting(key as any, value)
        }
        return true
      }
      break

    case IPC_UTILITY_TYPES.LOGS:
      return Logger.getLogs()

    case IPC_UTILITY_TYPES.SHUTDOWN:
      setTimeout(() => process.exit(0), 500)
      return true

    case IPC_UTILITY_TYPES.CONNECTIONS: {
      const platformStore = await storeProvider.getStore('platformStore')
      if (data.request === 'get') return platformStore.getClients()
      break
    }

    case IPC_UTILITY_TYPES.FLAG:
      if (data.request === 'get') return settingsStore.getFlag(data.payload)
      if (data.request === 'toggle') return settingsStore.toggleFlag(data.payload)
      if (data.request === 'set') return settingsStore.setFlag(data.payload.flagId, data.payload.flagState)
      break

    case IPC_UTILITY_TYPES.ACTIONS: {
      const mappingStore = await storeProvider.getStore('mappingStore')
      if (data.request === 'get') return mappingStore.getActions()
      if (data.request === 'set') {
        await mappingStore.addAction(data.payload)
        return true
      }
      if (data.request === 'delete') {
        await mappingStore.removeAction(data.payload)
        return true
      }
      break
    }

    case IPC_UTILITY_TYPES.KEYS: {
      const mappingStore = await storeProvider.getStore('mappingStore')
      if (data.request === 'get') return mappingStore.getKeys()
      if (data.request === 'set') {
        await mappingStore.addKey(data.payload)
        return true
      }
      if (data.request === 'delete') {
        await mappingStore.removeKey(data.payload)
        return true
      }
      break
    }

    case IPC_UTILITY_TYPES.PROFILES: {
      const mappingStore = await storeProvider.getStore('mappingStore')
      if (data.request === 'get') return mappingStore.getProfile(data.payload)
      if (data.request === 'getAll') return mappingStore.getProfiles()
      if (data.request === 'set') {
        await mappingStore.addProfile(data.payload)
        return true
      }
      if (data.request === 'delete') {
        await mappingStore.removeProfile(data.payload)
        return true
      }
      break
    }

    case IPC_UTILITY_TYPES.MAP: {
      const mappingStore = await storeProvider.getStore('mappingStore')
      if (data.request === 'get') return mappingStore.getMapping()
      if (data.request === 'set') {
        await mappingStore.setCurrentProfile(data.payload)
        return true
      }
      break
    }

    case IPC_UTILITY_TYPES.RUN: {
      const mappingStore = await storeProvider.getStore('mappingStore')
      mappingStore.runAction(data.payload)
      return true
    }

    case IPC_UTILITY_TYPES.NOTIFICATION: {
      const notificationStore = await storeProvider.getStore('notificationStore')
      if (data.request === 'get') return notificationStore.getNotifications()
      if (data.request === 'acknowledge') {
        await notificationStore.acknowledgeNotification(data.payload)
        return true
      }
      break
    }

    case IPC_UTILITY_TYPES.SUPPORTERS: {
      const supporterStore = await storeProvider.getStore('supporterStore')
      return (supporterStore as any).getSupporters?.(data.payload) || []
    }

    case IPC_UTILITY_TYPES.BUTTONS: {
      const mappingStore = await storeProvider.getStore('mappingStore')
      if (data.request === 'set') {
        // Buttons are part of profile mappings
        return true
      }
      if (data.request === 'delete') {
        return true
      }
      break
    }

    case IPC_UTILITY_TYPES.REFRESH_FIREWALL:
      return true

    case IPC_UTILITY_TYPES.OPEN_LOG_FOLDER:
      // Not applicable in headless/web mode
      return true

    case IPC_UTILITY_TYPES.OPEN_DIALOG:
      // Not applicable in web mode — use file upload instead
      return { canceled: true, filePaths: [] }

    case IPC_UTILITY_TYPES.DEVMODE:
      // Not applicable in headless mode
      return false

    default:
      Logger.warn(`[AdminDispatcher] Unhandled utility type: ${(data as UtilityIPCData).type}`)
      return null
  }
}

async function handleRelease(data: ReleaseIPCData): Promise<unknown> {
  const releaseStore = await storeProvider.getStore('releaseStore')

  switch (data.type) {
    case IPC_RELEASE_TYPES.REFRESH_RELEASES:
      await releaseStore.refreshData(true)
      return true
    case IPC_RELEASE_TYPES.GET_APPS:
      return releaseStore.getAppReleases()
    case IPC_RELEASE_TYPES.GET_CLIENTS:
      return releaseStore.getClientReleases()
    case IPC_RELEASE_TYPES.GET_REPOSITORIES:
      return releaseStore.getAllRepositories()
    case IPC_RELEASE_TYPES.ADD_REPOSITORY:
      return releaseStore.addRepositoryUrl(data.payload)
    case IPC_RELEASE_TYPES.GET_APP_REPOSITORIES:
      return (await releaseStore.getAllRepositories())
        .filter((r: any) => r.type === 'app')
        .map((r: any) => r.url)
    case IPC_RELEASE_TYPES.REMOVE_APP_REPOSITORY:
      await releaseStore.removeAppRelease(data.payload)
      return true
    case IPC_RELEASE_TYPES.DOWNLOAD_APP:
      return releaseStore.downloadLatestApp(data.payload)
    case IPC_RELEASE_TYPES.GET_CLIENT_REPOSITORIES:
      return (await releaseStore.getAllRepositories())
        .filter((r: any) => r.type === 'client')
        .map((r: any) => r.url)
    case IPC_RELEASE_TYPES.REMOVE_CLIENT_REPOSITORY:
      await releaseStore.removeClientRelease(data.payload)
      return true
    case IPC_RELEASE_TYPES.DOWNLOAD_CLIENT:
      return releaseStore.downloadLatestClient(data.payload)
    case IPC_RELEASE_TYPES.GET_REPO_ASSETS:
      return releaseStore.getAllRepositories()
    default:
      Logger.warn(`[AdminDispatcher] Unhandled release type: ${(data as ReleaseIPCData).type}`)
      return null
  }
}

async function handleTask(data: TaskIPCData): Promise<unknown> {
  const taskStore = await storeProvider.getStore('taskStore')

  switch (data.type) {
    case IPC_TASK_TYPES.GET:
      return taskStore.getTaskList()
    case IPC_TASK_TYPES.START:
      await taskStore.startTask(data.payload.source, data.payload.taskId)
      return true
    case IPC_TASK_TYPES.STOP:
      await taskStore.stopTask(data.payload.source, data.payload.taskId)
      return true
    case IPC_TASK_TYPES.RESTART:
      await taskStore.restartTask(data.payload.source, data.payload.taskId)
      return true
    case IPC_TASK_TYPES.PAUSE:
      await taskStore.pauseTask()
      return true
    case IPC_TASK_TYPES.COMPLETE:
      await taskStore.completeStep(data.payload.source, data.payload.taskId, data.payload.stepId)
      return true
    case IPC_TASK_TYPES.COMPLETE_TASK:
      await taskStore.completeTask(data.payload.source, data.payload.taskId)
      return true
    case IPC_TASK_TYPES.NEXT:
      await taskStore.nextStep(data.payload.source, data.payload.taskId)
      return true
    case IPC_TASK_TYPES.PREVIOUS:
      await (taskStore as any).prevStep(data.payload.source, data.payload.taskId)
      return true
    case IPC_TASK_TYPES.UPDATE_STEP:
      await taskStore.updateStep(data.payload.source, data.payload.taskId, data.payload.newStep)
      return true
    case IPC_TASK_TYPES.UPDATE_TASK:
      await taskStore.updateTask(data.payload.source, data.payload.newTask)
      return true
    default:
      Logger.warn(`[AdminDispatcher] Unhandled task type: ${(data as TaskIPCData).type}`)
      return null
  }
}

async function handleDevice(data: DeviceIPCData): Promise<unknown> {
  const flashStore = await storeProvider.getStore('flashStore')
  const thingifyStore = await storeProvider.getStore('thingifyStore')

  switch (data.type) {
    case IPC_DEVICE_TYPES.FLASH_GET:
      if (data.request === 'steps') return flashStore.getFlashSteps()
      if (data.request === 'state') return flashStore.getFlashStatus()
      if (data.request === 'device_selection') {
        const platformStore = await storeProvider.getStore('platformStore')
        return platformStore.sendPlatformData({
          platform: 'adb' as any,
          type: 'get',
          request: 'devices'
        } as any)
      }
      break

    case IPC_DEVICE_TYPES.FLASH_SET:
      if (data.request === 'file_path') {
        // Store file path for flash
        return data.payload
      }
      if (data.request === 'device_selection') {
        return data.payload
      }
      break

    case IPC_DEVICE_TYPES.FLASH_OPERATION:
      switch (data.request) {
        case 'start': {
          const stagedPath = thingifyStore.getStagedFilePath()
          await flashStore.startFlash(stagedPath)
          return true
        }
        case 'cancel':
          await flashStore.cancelFlash()
          return true
        case 'unbrick':
          // unbrick operation
          return true
        case 'autoconfig': {
          // Full pipeline: download recommended firmware → flash device
          const filePath = await thingifyStore.downloadRecommendedFirmware()
          await flashStore.startFlash(filePath)
          return true
        }
        case 'usbmode':
          return true
        case 'restart':
          return true
        case 'driver':
          return true
      }
      break

    case IPC_DEVICE_TYPES.THINGIFY_GET:
      if (data.request === 'firmware') return thingifyStore.getAvailableFirmware()
      if (data.request === 'versions') return thingifyStore.getAvailableFiles(data.payload)
      if (data.request === 'file') return thingifyStore.getStagedFileName()
      if (data.request === 'files') return thingifyStore.getAvailableStagedFiles()
      break

    case IPC_DEVICE_TYPES.THINGIFY_SET:
      if (data.request === 'download') return thingifyStore.startDownload(data.payload.version, data.payload.file)
      if (data.request === 'upload') return thingifyStore.upload(data.payload)
      if (data.request === 'file') return thingifyStore.selectStagedFile(data.payload)
      if (data.request === 'latest') return thingifyStore.downloadRecommendedFirmware()
      break

    default:
      Logger.warn(`[AdminDispatcher] Unhandled device type: ${(data as DeviceIPCData).type}`)
      return null
  }
}

async function handleUpdate(data: UpdateIPCData): Promise<unknown> {
  switch (data.type) {
    case IPC_UPDATE_TYPES.CHECK:
      // In headless mode, update check can report current version
      return 'headless-mode'
    case IPC_UPDATE_TYPES.DOWNLOAD:
      return true
    case IPC_UPDATE_TYPES.RESTART:
      setTimeout(() => process.exit(0), 500)
      return true
    default:
      return null
  }
}

async function handleFeedback(data: FeedbackIPCData): Promise<unknown> {
  switch (data.type) {
    case IPC_FEEDBACK_TYPES.GET_SYSTEM_INFO:
      return {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      }
    case IPC_FEEDBACK_TYPES.ADD_FEEDBACK:
      // Feedback submission — log it
      Logger.log(0, `[Feedback] ${JSON.stringify(data.payload)}`)
      return { success: true }
    default:
      return null
  }
}

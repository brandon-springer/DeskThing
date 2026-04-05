import Logger from '../../utils/logger'
import { storeProvider } from '../../stores/storeProvider'
import { LOGGING_LEVELS, APP_REQUESTS, DESKTHING_EVENTS } from '@deskthing/types'
import { exec } from 'node:child_process'
import { PlatformStoreEvent } from '@shared/stores/platformStore'
import { uiEventBus } from '../events/uiBus'

export async function initializeStores(): Promise<void> {
  const { default: cacheManager } = await import('./cacheManager')

  Logger.addListener(async (logData) => {
    uiEventBus.sendIpcData({
      type: 'log',
      payload: logData
    })
  })

  // Register stores for cache management
  const storeList = {
    appStore: await storeProvider.getStore('appStore', false),
    mappingStore: await storeProvider.getStore('mappingStore', false),
    musicStore: await storeProvider.getStore('musicStore', false),
    settingsStore: await storeProvider.getStore('settingsStore', false),
    taskStore: await storeProvider.getStore('taskStore', false),
    releaseStore: await storeProvider.getStore('releaseStore', false),
    AppDataStore: await storeProvider.getStore('appDataStore', false),
    updateStore: await storeProvider.getStore('updateStore', false),
    clientStore: await storeProvider.getStore('clientStore', false),
    profileStore: await storeProvider.getStore('profileStore', true),
    autoLaunchStore: await storeProvider.getStore('autoLaunchStore', true),
    serverTaskStore: await storeProvider.getStore('serverTaskStore', true),
    thingifyStore: await storeProvider.getStore('thingifyStore', false),
    flashStore: await storeProvider.getStore('flashStore', false),
    notificationStore: await storeProvider.getStore('notificationStore', false),
    statsCollector: await storeProvider.getStore('statsCollector', true)
  }

  const platformStore = await storeProvider.getStore('platformStore', false)

  Object.values(storeList).forEach((store) => cacheManager.registerStore(store))

  // Set up store listeners
  storeList.mappingStore.addListener('action', (action) => {
    action && uiEventBus.sendIpcData({ type: 'action', payload: action })
  })
  storeList.mappingStore.addListener('key', (key) => {
    key && uiEventBus.sendIpcData({ type: 'key', payload: key })
  })
  storeList.mappingStore.addListener('profile', (profile) => {
    profile && uiEventBus.sendIpcData({ type: 'profile', payload: profile })
  })

  storeList.AppDataStore.on('settings', (data) => {
    Logger.debug('[INDEX]: Sending updated setting information with type app-settings')

    uiEventBus.sendIpcData({
      type: 'app-settings',
      payload: data
    })
  })

  storeList.appStore.on('apps', ({ data }) => {
    Logger.debug('[INDEX]: Sending updated app information with type app-data')
    uiEventBus.sendIpcData({
      type: 'app-data',
      payload: data
    })
  })

  storeList.taskStore.on('taskList', (taskList) => {
    uiEventBus.sendIpcData({
      type: 'taskList',
      payload: taskList
    })
  })

  storeList.taskStore.on('currentTask', (task) => {
    uiEventBus.sendIpcData({
      type: 'currentTask',
      payload: task
    })
  })

  storeList.taskStore.on('task', (task) => {
    uiEventBus.sendIpcData({
      type: 'task',
      payload: task
    })
  })

  storeList.releaseStore.on('app', (app) => {
    Logger.debug('[INDEX]: Sending updated app information with type github-apps')
    uiEventBus.sendIpcData({
      type: 'github-apps',
      payload: app
    })
  })
  storeList.releaseStore.on('client', (clients) => {
    Logger.debug('[INDEX]: Sending updated client information with type github-client')
    uiEventBus.sendIpcData({
      type: 'github-client',
      payload: clients
    })
  })
  storeList.releaseStore.on('appRepos', (appRepos) => {
    Logger.debug(
      `[INDEX]: Sending ${appRepos?.length} app repos information with type github-app-repos`
    )
    uiEventBus.sendIpcData({
      type: 'github-app-repos',
      payload: appRepos
    })
  })
  storeList.releaseStore.on('clientRepos', (clientRepos) => {
    Logger.debug(
      `[INDEX]: Sending ${clientRepos?.length} client repos with type github-client-repos`
    )
    uiEventBus.sendIpcData({
      type: 'github-client-repos',
      payload: clientRepos
    })
  })

  storeList.settingsStore.addSettingsListener((newSettings) => {
    uiEventBus.sendIpcData({
      type: 'settings-updated',
      payload: newSettings
    })
  })

  storeList.appStore.onAppMessage(APP_REQUESTS.OPEN, (data) => {
    if (typeof data.payload == 'string') {
      // Headless mode: log the URL. Could use xdg-open on Linux if needed.
      Logger.info(`App "${data.source}" requested to open URL: ${data.payload}`, {
        source: 'appCommunication',
        function: 'handleRequestOpen',
        domain: data.source
      })
      // Attempt to open with system browser
      const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open'
      exec(`${cmd} "${data.payload}"`, (err) => {
        if (err) {
          Logger.debug(`Could not open URL externally: ${err.message}`, {
            source: 'appCommunication',
            function: 'handleRequestOpen'
          })
        }
      })
    } else {
      Logger.warn('App sent invalid payload for openAuthWindow', {
        source: 'appCommunication',
        function: 'handleRequestOpen',
        domain: data.source
      })
    }
  })

  storeList.appStore.onAppMessage(APP_REQUESTS.LOG, (data) => {
    if (data.request && Object.values(LOGGING_LEVELS).includes(data.request)) {
      const message =
        typeof data.payload === 'string'
          ? data.payload
          : typeof data.payload === 'object'
            ? JSON.stringify(data.payload)
            : String(data.payload)

      Logger.log(data.request, message, { domain: data.source.toUpperCase() })
    }
  })

  storeList.appStore.onAppMessage(
    APP_REQUESTS.GET,
    (data) => {
      if (data.request != 'input') return
      Logger.warn(
        `[handleRequestGetInput]: ${data.source} tried accessing "Input" data type which is deprecated and may be removed at any time!`,
        {
          source: 'appCommunication',
          function: 'handleRequestGetInput',
          domain: data.source
        }
      )
      Logger.warn(
        `[handleRequestGetInput]: ${data.source} requested user input, but IPC is not available in headless mode.`,
        {
          source: 'appCommunication',
          function: 'handleRequestGetInput',
          domain: data.source
        }
      )
    },
    { request: 'input' }
  )

  storeList.clientStore.on('client-updated', (client) => {
    uiEventBus.sendIpcData({
      type: 'staged-manifest',
      payload: client
    })
  })

  storeList.updateStore.on('update-status', (status) => {
    uiEventBus.sendIpcData({
      type: 'update-status',
      payload: status
    })
  })

  storeList.updateStore.on('update-progress', (progress) => {
    uiEventBus.sendIpcData({
      type: 'update-progress',
      payload: progress
    })
  })

  storeList.thingifyStore.on('downloadProgress', (progress) => {
    uiEventBus.sendIpcData({
      type: 'flash:download',
      payload: progress
    })
  })

  storeList.thingifyStore.on('stagedFileChange', (fileName) => {
    uiEventBus.sendIpcData({
      type: 'flash:stagedFile',
      payload: fileName
    })
  })

  storeList.flashStore.on('flash-state', (progress) => {
    uiEventBus.sendIpcData({
      type: 'flash:state',
      payload: progress
    })
  })

  platformStore.on(PlatformStoreEvent.CLIENT_CONNECTED, (data) => {
    uiEventBus.sendIpcData({
      type: 'platform:client',
      payload: {
        request: 'added',
        client: data
      }
    })
  })
  platformStore.on(PlatformStoreEvent.CLIENT_DISCONNECTED, (data) => {
    uiEventBus.sendIpcData({
      type: 'platform:client',
      payload: {
        request: 'removed',
        clientId: data
      }
    })
  })
  platformStore.on(PlatformStoreEvent.CLIENT_UPDATED, (data) => {
    uiEventBus.sendIpcData({
      type: 'platform:client',
      payload: {
        request: 'modified',
        client: data
      }
    })
  })
  platformStore.on(PlatformStoreEvent.CLIENT_LIST, (data) => {
    uiEventBus.sendIpcData({
      type: 'platform:client',
      payload: {
        request: 'list',
        clients: data
      }
    })
  })

  storeList.notificationStore.on('notification', (data) => {
    uiEventBus.sendIpcData({
      type: 'notification:add',
      payload: data
    })
  })
  storeList.notificationStore.on('notificationList', (data) => {
    uiEventBus.sendIpcData({
      type: 'notification:list',
      payload: data
    })
  })
}

/**
 * Admin REST API Routes
 *
 * All routes send requests through the message bridge to the main thread,
 * where the adminDispatcher handles the actual store calls.
 */

import { Application, Request, Response } from 'express'
import { IPC_HANDLERS } from '@shared/types/ipc/ipcTypes'
import { IPC_APP_TYPES } from '@shared/types/ipc/ipcApps'
import { IPC_CLIENT_TYPES } from '@shared/types/ipc/ipcClient'
import { IPC_UTILITY_TYPES } from '@shared/types/ipc/ipcUtility'
import { IPC_RELEASE_TYPES } from '@shared/types/ipc/ipcReleases'
import { IPC_TASK_TYPES } from '@shared/types/ipc/ipcTask'
import { IPC_DEVICE_TYPES } from '@shared/types/ipc/ipcDevice'
import { IPC_UPDATE_TYPES } from '@shared/types/ipc/ipcUpdate'
import { IPC_FEEDBACK_TYPES } from '@shared/types/ipc/ipcFeedback'

type SendRequest = (handler: IPC_HANDLERS, payload: unknown) => Promise<unknown>

function handler(send: SendRequest, ipcHandler: IPC_HANDLERS) {
  return (type: string, buildPayload: (req: Request) => Record<string, unknown> = () => ({})) => {
    return async (req: Request, res: Response) => {
      try {
        const payload = { type, ...buildPayload(req) }
        const result = await send(ipcHandler, payload)
        res.json({ success: true, data: result })
      } catch (err) {
        console.error(`[Admin API] Error: ${err}`)
        res.status(500).json({
          success: false,
          error: err instanceof Error ? err.message : String(err)
        })
      }
    }
  }
}

export function setupAdminRoutes(app: Application, send: SendRequest): void {
  const apps = handler(send, IPC_HANDLERS.APPS)
  const client = handler(send, IPC_HANDLERS.CLIENT)
  const utility = handler(send, IPC_HANDLERS.UTILITY)
  const release = handler(send, IPC_HANDLERS.RELEASE)
  const task = handler(send, IPC_HANDLERS.TASK)
  const device = handler(send, IPC_HANDLERS.DEVICE)
  const update = handler(send, IPC_HANDLERS.UPDATE)
  const feedback = handler(send, IPC_HANDLERS.FEEDBACK)

  // ── Apps ──────────────────────────────────────────────
  app.get('/api/admin/apps', apps(IPC_APP_TYPES.APP, () => ({ request: 'get' })))

  app.post('/api/admin/apps/:id/run', apps(IPC_APP_TYPES.RUN, (req) => ({ payload: req.params.id })))
  app.post('/api/admin/apps/:id/stop', apps(IPC_APP_TYPES.STOP, (req) => ({ payload: req.params.id })))
  app.post('/api/admin/apps/:id/enable', apps(IPC_APP_TYPES.ENABLE, (req) => ({ payload: req.params.id })))
  app.post('/api/admin/apps/:id/disable', apps(IPC_APP_TYPES.DISABLE, (req) => ({ payload: req.params.id })))
  app.post('/api/admin/apps/:id/purge', apps(IPC_APP_TYPES.PURGE, (req) => ({ payload: req.params.id })))

  app.put('/api/admin/apps/order', apps(IPC_APP_TYPES.APP_ORDER, (req) => ({ payload: req.body.order })))

  app.get('/api/admin/apps/:id/settings', apps(IPC_APP_TYPES.SETTINGS, (req) => ({
    request: 'get', payload: req.params.id
  })))
  app.put('/api/admin/apps/:id/settings', apps(IPC_APP_TYPES.SETTINGS, (req) => ({
    request: 'set', payload: { appId: req.params.id, settings: req.body }
  })))

  app.get('/api/admin/apps/:id/data', apps(IPC_APP_TYPES.DATA, (req) => ({
    request: 'get', payload: req.params.id
  })))

  app.post('/api/admin/apps/install', apps(IPC_APP_TYPES.URL, (req) => ({ payload: req.body.url })))

  app.post('/api/admin/apps/:id/postinstall', apps(IPC_APP_TYPES.POSTINSTALL, (req) => ({ payload: req.params.id })))

  app.post('/api/admin/apps/:id/send', apps(IPC_APP_TYPES.SEND_TO_APP, (req) => ({
    payload: { app: req.params.id, ...req.body }
  })))

  app.post('/api/admin/apps/dev-add', apps(IPC_APP_TYPES.DEV_ADD_APP, (req) => ({
    payload: { appPath: req.body.appPath }
  })))

  app.get('/api/admin/apps/:id/icon', apps(IPC_APP_TYPES.ICON, (req) => ({
    payload: { appId: req.params.id, icon: req.query.icon as string }
  })))

  // ── Clients & Connections ─────────────────────────────
  app.get('/api/admin/clients', utility(IPC_UTILITY_TYPES.CONNECTIONS, () => ({ request: 'get' })))

  app.post('/api/admin/clients/:id/ping', client(IPC_CLIENT_TYPES.PING_CLIENT, (req) => ({
    payload: req.params.id
  })))

  app.get('/api/admin/clients/manifest', client(IPC_CLIENT_TYPES.CLIENT_MANIFEST, () => ({
    request: 'get'
  })))
  app.put('/api/admin/clients/manifest', client(IPC_CLIENT_TYPES.CLIENT_MANIFEST, (req) => ({
    request: 'set', payload: req.body
  })))

  app.post('/api/admin/clients/download', client(IPC_CLIENT_TYPES.URL, (req) => ({
    payload: req.body.url
  })))
  app.post('/api/admin/clients/download-latest', client(IPC_CLIENT_TYPES.DOWNLOAD_LATEST, () => ({})))

  // ── Settings & Utility ────────────────────────────────
  app.get('/api/admin/settings', utility(IPC_UTILITY_TYPES.SETTINGS, () => ({ request: 'get' })))
  app.put('/api/admin/settings', utility(IPC_UTILITY_TYPES.SETTINGS, (req) => ({
    request: 'set', payload: req.body
  })))

  app.get('/api/admin/flags/:id', utility(IPC_UTILITY_TYPES.FLAG, (req) => ({
    request: 'get', payload: req.params.id
  })))
  app.post('/api/admin/flags/:id/toggle', utility(IPC_UTILITY_TYPES.FLAG, (req) => ({
    request: 'toggle', payload: req.params.id
  })))
  app.put('/api/admin/flags/:id', utility(IPC_UTILITY_TYPES.FLAG, (req) => ({
    request: 'set', payload: { flagId: req.params.id, flagState: req.body.state }
  })))

  app.get('/api/admin/logs', utility(IPC_UTILITY_TYPES.LOGS, () => ({})))

  app.post('/api/admin/shutdown', utility(IPC_UTILITY_TYPES.SHUTDOWN, () => ({})))

  // ── Notifications ─────────────────────────────────────
  app.get('/api/admin/notifications', utility(IPC_UTILITY_TYPES.NOTIFICATION, () => ({
    request: 'get'
  })))
  app.post('/api/admin/notifications/:id/ack', utility(IPC_UTILITY_TYPES.NOTIFICATION, (req) => ({
    request: 'acknowledge', payload: { id: req.params.id, ...req.body }
  })))

  // ── Mappings ──────────────────────────────────────────
  app.get('/api/admin/actions', utility(IPC_UTILITY_TYPES.ACTIONS, () => ({ request: 'get' })))
  app.post('/api/admin/actions', utility(IPC_UTILITY_TYPES.ACTIONS, (req) => ({
    request: 'set', payload: req.body
  })))
  app.delete('/api/admin/actions/:id', utility(IPC_UTILITY_TYPES.ACTIONS, (req) => ({
    request: 'delete', payload: req.params.id
  })))
  app.post('/api/admin/actions/:id/run', utility(IPC_UTILITY_TYPES.RUN, (req) => ({
    payload: { id: req.params.id, ...req.body }
  })))

  app.get('/api/admin/keys', utility(IPC_UTILITY_TYPES.KEYS, () => ({ request: 'get' })))
  app.post('/api/admin/keys', utility(IPC_UTILITY_TYPES.KEYS, (req) => ({
    request: 'set', payload: req.body
  })))
  app.delete('/api/admin/keys/:id', utility(IPC_UTILITY_TYPES.KEYS, (req) => ({
    request: 'delete', payload: req.params.id
  })))

  app.get('/api/admin/profiles', utility(IPC_UTILITY_TYPES.PROFILES, () => ({ request: 'getAll' })))
  app.get('/api/admin/profiles/:id', utility(IPC_UTILITY_TYPES.PROFILES, (req) => ({
    request: 'get', payload: req.params.id
  })))
  app.put('/api/admin/profiles/:id', utility(IPC_UTILITY_TYPES.PROFILES, (req) => ({
    request: 'set', payload: req.body
  })))
  app.delete('/api/admin/profiles/:id', utility(IPC_UTILITY_TYPES.PROFILES, (req) => ({
    request: 'delete', payload: req.params.id
  })))

  app.get('/api/admin/mappings', utility(IPC_UTILITY_TYPES.MAP, () => ({ request: 'get' })))
  app.put('/api/admin/mappings', utility(IPC_UTILITY_TYPES.MAP, (req) => ({
    request: 'set', payload: req.body
  })))

  // ── Releases & Downloads ──────────────────────────────
  app.get('/api/admin/releases/apps', release(IPC_RELEASE_TYPES.GET_APPS, () => ({})))
  app.get('/api/admin/releases/clients', release(IPC_RELEASE_TYPES.GET_CLIENTS, () => ({})))
  app.post('/api/admin/releases/apps/download', release(IPC_RELEASE_TYPES.DOWNLOAD_APP, (req) => ({
    payload: req.body.appId
  })))
  app.post('/api/admin/releases/clients/download', release(IPC_RELEASE_TYPES.DOWNLOAD_CLIENT, (req) => ({
    payload: req.body.clientId
  })))
  app.post('/api/admin/releases/refresh', release(IPC_RELEASE_TYPES.REFRESH_RELEASES, () => ({})))
  app.get('/api/admin/releases/repos', release(IPC_RELEASE_TYPES.GET_REPOSITORIES, () => ({})))
  app.post('/api/admin/releases/repos', release(IPC_RELEASE_TYPES.ADD_REPOSITORY, (req) => ({
    payload: req.body.url
  })))
  app.get('/api/admin/releases/apps/repos', release(IPC_RELEASE_TYPES.GET_APP_REPOSITORIES, () => ({})))
  app.delete('/api/admin/releases/apps/repos', release(IPC_RELEASE_TYPES.REMOVE_APP_REPOSITORY, (req) => ({
    payload: req.body.url
  })))
  app.get('/api/admin/releases/clients/repos', release(IPC_RELEASE_TYPES.GET_CLIENT_REPOSITORIES, () => ({})))
  app.delete('/api/admin/releases/clients/repos', release(IPC_RELEASE_TYPES.REMOVE_CLIENT_REPOSITORY, (req) => ({
    payload: req.body.url
  })))

  // ── Tasks ─────────────────────────────────────────────
  app.get('/api/admin/tasks', task(IPC_TASK_TYPES.GET, () => ({})))
  app.post('/api/admin/tasks/:id/start', task(IPC_TASK_TYPES.START, (req) => ({
    payload: { source: req.body.source || 'admin', taskId: req.params.id }
  })))
  app.post('/api/admin/tasks/:id/stop', task(IPC_TASK_TYPES.STOP, (req) => ({
    payload: { source: req.body.source || 'admin', taskId: req.params.id }
  })))
  app.post('/api/admin/tasks/:id/pause', task(IPC_TASK_TYPES.PAUSE, () => ({})))
  app.post('/api/admin/tasks/:id/restart', task(IPC_TASK_TYPES.RESTART, (req) => ({
    payload: { source: req.body.source || 'admin', taskId: req.params.id }
  })))
  app.post('/api/admin/tasks/:id/complete', task(IPC_TASK_TYPES.COMPLETE_TASK, (req) => ({
    payload: { source: req.body.source || 'admin', taskId: req.params.id }
  })))
  app.post('/api/admin/tasks/:id/next', task(IPC_TASK_TYPES.NEXT, (req) => ({
    payload: { source: req.body.source || 'admin', taskId: req.params.id }
  })))
  app.post('/api/admin/tasks/:id/previous', task(IPC_TASK_TYPES.PREVIOUS, (req) => ({
    payload: { source: req.body.source || 'admin', taskId: req.params.id }
  })))

  // ── ADB Console ───────────────────────────────────
  app.post('/api/admin/adb/command', client(IPC_CLIENT_TYPES.ADB, (req) => ({
    payload: req.body.command
  })))
  app.post('/api/admin/adb/device-command', client(IPC_CLIENT_TYPES.RUN_DEVICE_COMMAND, (req) => ({
    payload: { clientId: req.body.clientId, command: req.body.command }
  })))

  // ── Device / Flash ────────────────────────────────────
  app.get('/api/admin/flash/state', device(IPC_DEVICE_TYPES.FLASH_GET, () => ({ request: 'state' })))
  app.get('/api/admin/flash/steps', device(IPC_DEVICE_TYPES.FLASH_GET, () => ({ request: 'steps' })))
  app.get('/api/admin/flash/devices', device(IPC_DEVICE_TYPES.FLASH_GET, () => ({ request: 'device_selection' })))
  app.post('/api/admin/flash/start', device(IPC_DEVICE_TYPES.FLASH_OPERATION, () => ({ request: 'start' })))
  app.post('/api/admin/flash/cancel', device(IPC_DEVICE_TYPES.FLASH_OPERATION, () => ({ request: 'cancel' })))
  app.post('/api/admin/flash/autoconfig', device(IPC_DEVICE_TYPES.FLASH_OPERATION, (req) => ({
    request: 'autoconfig', payload: req.body.stepCount || 0
  })))
  app.post('/api/admin/flash/unbrick', device(IPC_DEVICE_TYPES.FLASH_OPERATION, () => ({ request: 'unbrick' })))
  app.put('/api/admin/flash/device', device(IPC_DEVICE_TYPES.FLASH_SET, (req) => ({
    request: 'device_selection', payload: req.body.deviceId
  })))
  app.put('/api/admin/flash/file', device(IPC_DEVICE_TYPES.FLASH_SET, (req) => ({
    request: 'file_path', payload: req.body.filePath
  })))

  // ── Thingify / Firmware ───────────────────────────────
  app.get('/api/admin/thingify/firmware', device(IPC_DEVICE_TYPES.THINGIFY_GET, () => ({ request: 'firmware' })))
  app.get('/api/admin/thingify/firmware/:versionId', device(IPC_DEVICE_TYPES.THINGIFY_GET, (req) => ({
    request: 'versions', payload: req.params.versionId
  })))
  app.get('/api/admin/thingify/files', device(IPC_DEVICE_TYPES.THINGIFY_GET, () => ({ request: 'files' })))
  app.get('/api/admin/thingify/file', device(IPC_DEVICE_TYPES.THINGIFY_GET, () => ({ request: 'file' })))
  app.post('/api/admin/thingify/download', device(IPC_DEVICE_TYPES.THINGIFY_SET, (req) => ({
    request: 'download', payload: req.body
  })))
  app.post('/api/admin/thingify/upload', device(IPC_DEVICE_TYPES.THINGIFY_SET, (req) => ({
    request: 'upload', payload: req.body.filePath
  })))
  app.post('/api/admin/thingify/latest', device(IPC_DEVICE_TYPES.THINGIFY_SET, () => ({ request: 'latest' })))

  // ── Updates ───────────────────────────────────────────
  app.post('/api/admin/update/check', update(IPC_UPDATE_TYPES.CHECK, () => ({})))
  app.post('/api/admin/update/download', update(IPC_UPDATE_TYPES.DOWNLOAD, () => ({})))
  app.post('/api/admin/update/restart', update(IPC_UPDATE_TYPES.RESTART, () => ({})))

  // ── Feedback / System Info ────────────────────────────
  app.get('/api/admin/system-info', feedback(IPC_FEEDBACK_TYPES.GET_SYSTEM_INFO, () => ({ request: 'get' })))

  // ── Health check ──────────────────────────────────────
  app.get('/api/admin/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', uptime: process.uptime() })
  })
}

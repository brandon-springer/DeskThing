import express, { NextFunction, Request, Response } from 'express'
import cors from 'cors'
import { Server } from 'node:http'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import { readFile } from 'node:fs/promises'
import crypto from 'node:crypto'
import {
  ClientConnectionMethod,
  ClientDeviceType,
  ClientManifest,
  ClientPlatformIDs
} from '@deskthing/types'
import EventEmitter from 'node:events'
import { parentPort } from 'node:worker_threads'
import { AdminAPIResponse } from '@shared/types/ipc/ipcAdmin'
import { IPC_HANDLERS } from '@shared/types/ipc/ipcTypes'
import { setupAdminRoutes } from './adminRoutes'

type ExpressServerEvents = {
  'client-connected': [ClientManifest]
}

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (reason: Error) => void
  timer: NodeJS.Timeout
}

export class ExpressServer extends EventEmitter<ExpressServerEvents> {
  private app: express.Application
  private server: Server | null = null
  private userDataPath: string
  private port: number
  private pendingRequests: Map<string, PendingRequest> = new Map()

  constructor(expressApp: express.Application, userDataPath: string, port: number) {
    super()
    this.app = expressApp
    this.port = port
    this.userDataPath = userDataPath
  }

  /**
   * Send an admin API request to the main thread and await the response.
   * The main thread's adminDispatcher handles the actual store calls.
   */
  public sendAdminRequest(handler: IPC_HANDLERS, payload: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const requestId = crypto.randomUUID()
      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestId)
        reject(new Error('Admin API request timeout (30s)'))
      }, 30000)

      this.pendingRequests.set(requestId, { resolve, reject, timer })

      parentPort?.postMessage({
        type: 'admin-api',
        requestId,
        payload: { kind: handler, ...payload }
      })
    })
  }

  /**
   * Called by the worker thread when an admin-api-response message arrives
   * from the main thread.
   */
  public handleAdminResponse(msg: AdminAPIResponse): void {
    const pending = this.pendingRequests.get(msg.requestId)
    if (!pending) return

    clearTimeout(pending.timer)
    this.pendingRequests.delete(msg.requestId)

    if (msg.error) {
      pending.reject(new Error(msg.error))
    } else {
      pending.resolve(msg.result)
    }
  }

  public initializeServer(): void {
    this.app.use(cors())
    this.app.use(express.json())

    this.app.use((req, _res, next) => {
      // Skip noisy logging for admin API poll requests
      if (!req.url.startsWith('/api/admin')) {
        console.log(`[ExpressWorker.${req.method}]: ${req.url}`)
      }
      next()
    })

    // Admin API routes (must be before static routes)
    setupAdminRoutes(this.app, this.sendAdminRequest.bind(this))

    // Admin panel static files
    this.setupAdminStaticRoutes()

    this.setupAppRoutes()
    this.setupResourceRoutes()
    this.setupProxyRoutes()

    this.app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Express error:', err)
      res.status(500).send('Server error')
    })

    this.server = this.app.listen(this.port)

    this.setupClientRoutes()

    // Default all routes to / as a fallback
    this.app.get('/', (_req, res) => {
      res.redirect('/client/')
    })
  }

  private setupAdminStaticRoutes(): void {
    // Try to find admin build output relative to the worker script
    // In production: out-headless/admin/
    // The worker runs from out-headless/wsWebsocket.mjs or out-headless/chunks/
    const possiblePaths = [
      join(this.userDataPath, 'admin'),
      join(dirname(fileURLToPath(import.meta.url)), 'admin'),
      join(dirname(fileURLToPath(import.meta.url)), '..', 'admin')
    ]

    let adminDir: string | null = null
    for (const p of possiblePaths) {
      if (fs.existsSync(join(p, 'index.html'))) {
        adminDir = p
        break
      }
    }

    if (adminDir) {
      this.app.use(
        '/admin',
        express.static(adminDir, {
          index: 'index.html',
          extensions: ['html', 'htm']
        })
      )

      // SPA fallback
      this.app.get('/admin/*', (_req, res) => {
        res.sendFile(join(adminDir!, 'index.html'))
      })

      console.log(`[ExpressWorker] Admin panel served from ${adminDir}`)
    } else {
      // Serve a placeholder if admin is not built yet
      this.app.get('/admin', (_req, res) => {
        res.send(`<!DOCTYPE html>
<html><body style="font-family:system-ui;padding:2em;background:#1a1a2e;color:#e0e0e0">
<h1>DeskThing Admin</h1>
<p>Admin panel not built yet. Run <code>npm run build:admin</code> in DeskThingServer.</p>
<h2>API Status</h2>
<p>The admin API is active at <a href="/api/admin/apps" style="color:#4fc3f7">/api/admin/apps</a></p>
</body></html>`)
      })
    }
  }

  public getServer(): Server | null {
    return this.server
  }

  public getApp(): express.Application {
    return this.app
  }

  private setupClientRoutes(): void {
    const webAppDir = join(this.userDataPath, 'webapp')

    this.app.get('/manifest.json', (_req, res) => {
      res.redirect('/client/manifest.json')
    })

    this.app.get('/client/manifest.json', async (req: Request, res: Response) => {
      const manifestPath = join(webAppDir, 'manifest.json')
      const clientIp = req.hostname

      console.log('Got a request to /client/manifest.json')

      try {
        if (!fs.existsSync(manifestPath)) {
          console.error(`Manifest file not found at: ${manifestPath}`)
          res.status(404).send('manifest.json not found. Do you have a client installed?')
          return
        }

        const manifestContent = await readFile(manifestPath, 'utf8')
        const manifest = JSON.parse(manifestContent) as ClientManifest

        manifest.context = getDeviceType(req.headers['user-agent'], clientIp, this.port)

        manifest.connectionId = crypto.randomUUID()

        this.emit('client-connected', manifest)

        console.log('Sending manifest:', manifest)
        res.type('application/json').json(manifest)
        return
      } catch (error) {
        console.error('Error reading manifest:', error)
        res.status(404).send('manifest.json not found. Do you have a client installed?')
      }
    })

    if (fs.existsSync(webAppDir)) {
      this.app.use(
        '/client',
        express.static(webAppDir, {
          index: 'index.html',
          extensions: ['html', 'htm']
        })
      )
    }

    this.app.get('/client/*', (_req, res) => {
      const indexPath = join(webAppDir, 'index.html')
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath)
      } else {
        res.status(404).send('App not found')
      }
    })
  }

  private setupAppRoutes(): void {
    this.app.use('/app/:appName', (req: Request, res: Response, next: NextFunction) => {
      const appName = req.params.appName
      const appPath = join(this.userDataPath, 'apps', appName, 'client')
      const legacyAppPath = join(this.userDataPath, 'apps', appName)

      if (fs.existsSync(appPath)) {
        express.static(appPath, {
          index: 'index.html',
          extensions: ['html', 'htm']
        })(req, res, next)
      } else if (fs.existsSync(legacyAppPath)) {
        express.static(legacyAppPath, {
          index: 'index.html',
          extensions: ['html', 'htm']
        })(req, res, next)
      } else {
        res.status(404).json({
          error: 'App content not found',
          message: 'The app exists but its content could not be located'
        })
      }
    })

    this.app.get('/app/:appName/*', async (req: Request, res: Response, next: NextFunction) => {
      const appName = req.params.appName
      const appPath = join(this.userDataPath, 'apps', appName, 'client')
      const legacyAppPath = join(this.userDataPath, 'apps', appName)

      if (fs.existsSync(appPath)) {
        console.log('Returning app path')
        return express.static(appPath)(req, res, next)
      } else if (fs.existsSync(legacyAppPath)) {
        console.log('Returning legacy app path')
        return express.static(legacyAppPath)(req, res, next)
      } else {
        return res.status(404).json({
          error: 'App content not found',
          message: 'The app exists but its content could not be located'
        })
      }
    })
  }

  private setupResourceRoutes(): void {
    const baseAppPath = join(this.userDataPath, 'apps')

    this.app.use(
      '/icons',
      express.static(baseAppPath, {
        maxAge: '1d',
        immutable: true,
        etag: true,
        lastModified: true
      })
    )

    this.app.use(
      '/resource/icons',
      express.static(baseAppPath, {
        maxAge: '1d',
        immutable: true,
        etag: true,
        lastModified: true
      })
    )

    this.app.get('/resource/image/:appName/:imageName', async (req: Request, res: Response) => {
      const { appName, imageName } = req.params

      if (!imageName) {
        res.status(400).send('Image name is required')
        return
      }

      const imagePath = join(baseAppPath, appName, 'images', imageName)

      if (fs.existsSync(imagePath)) {
        res.sendFile(imagePath)
      } else {
        res.status(404).send('Image not found')
      }
    })

    this.app.get('/resource/thumbnail/:id', (req: Request, res: Response) => {
      const thumbnailId = req.params.id
      const thumbnailsDir = join(this.userDataPath, 'thumbnails')
      const thumbnailPath = join(thumbnailsDir, thumbnailId)

      const fullPath = thumbnailPath.endsWith('.jpg') ? thumbnailPath : `${thumbnailPath}.jpg`

      if (fs.existsSync(fullPath)) {
        res.sendFile(fullPath, {
          maxAge: '1d',
          immutable: true,
          etag: true,
          lastModified: true
        })
      } else {
        res.status(404).send('Thumbnail not found')
      }
    })

    this.app.get('/resource/task/:appName/:id', (req: Request, res: Response) => {
      const stepId = req.params.id
      const appName = req.params.appName
      const baseAppPath = join(this.userDataPath, 'apps', appName)
      const tasksDir = join(baseAppPath, 'images', 'tasks')
      const stepImgPath = join(tasksDir, stepId)

      const fullPath = stepImgPath.endsWith('.jpg') ? stepImgPath : `${stepImgPath}.jpg`

      if (fs.existsSync(fullPath)) {
        console.log('Returning step image:', fullPath)
        res.sendFile(fullPath, {
          maxAge: '1d',
          immutable: true,
          etag: true,
          lastModified: true
        })
      } else {
        console.error('Step image not found:', fullPath)
        res.status(404).send('Step image not found')
      }
    })

    this.app.get('/gen/:appName/*', (req, res) => {
      const appName = req.params.appName
      const filePath = req.params[0]

      const appPath = join(baseAppPath, appName, 'server')
      const fullPath = join(appPath, filePath)

      if (fs.existsSync(appPath)) {
        console.log('Returning file path', fullPath, req.url)
        res.sendFile(fullPath, {
          maxAge: '1d',
          immutable: true,
          etag: true,
          lastModified: true
        })
      } else {
        res.status(404).json({
          error: 'Server content not found',
          message: 'Ensure client is on version v0.10.0 or later'
        })
        return
      }
    })
  }

  private setupProxyRoutes(): void {
    this.app.get('/proxy/fetch/:url(*)', async (req: Request, res: Response) => {
      try {
        const url = decodeURIComponent(req.params.url)

        const response = await fetch(url)
        const contentType = response.headers.get('content-type')

        if (contentType) {
          res.setHeader('Content-Type', contentType)
        }

        if (response.body) {
          const reader = response.body.getReader()

          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            res.write(value)
          }

          res.end()
        } else {
          res.sendStatus(204)
        }
      } catch (error) {
        console.log('Error fetching resource', error)
        res.status(500).send('Error fetching resource')
      }
    })

    this.app.get('/proxy/v1', async (req: Request, res: Response) => {
      try {
        const url = req.query.url as string

        if (!url) {
          res.status(400).send('Missing url query parameter')
          return
        }

        console.log('Proxying resource from:', url)

        const response = await fetch(url)

        if (!response.ok) {
          res.status(response.status).send(`Upstream resource responded with ${response.status}`)
          return
        }

        response.headers.forEach((value, key) => {
          res.setHeader(key, value)
        })

        if (!response.body) {
          res.sendStatus(204)
          return
        }

        const reader = response.body.getReader()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          res.write(value)
        }

        res.end()
      } catch (error) {
        console.error('Error proxying resource:', error)
        res
          .status(500)
          .send(
            `Error fetching resource: ${error instanceof Error ? error.message : String(error)}`
          )
      }
    })
  }

  public shutdown(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve())
      } else {
        resolve()
      }
    })
  }
}

const getDeviceType = (userAgent: string | undefined, ip, port): ClientDeviceType => {
  if (!userAgent) {
    return {
      method: ClientConnectionMethod.LAN,
      ip,
      port,
      id: ClientPlatformIDs.Unknown,
      name: 'unknown'
    }
  }

  userAgent = userAgent.toLowerCase()

  const deviceMap = {
    linux: { id: ClientPlatformIDs.Desktop, name: 'linux' },
    win: { id: ClientPlatformIDs.Desktop, name: 'windows' },
    mac: { id: ClientPlatformIDs.Desktop, name: 'mac' },
    chromebook: { id: ClientPlatformIDs.Desktop, name: 'chromebook' },
    ipad: { id: ClientPlatformIDs.Tablet, name: 'tablet' },
    webos: { id: ClientPlatformIDs.Tablet, name: 'webos' },
    kindle: { id: ClientPlatformIDs.Tablet, name: 'kindle' },
    iphone: { id: ClientPlatformIDs.Iphone, name: 'iphone' },
    'firefox os': { id: ClientPlatformIDs.Iphone, name: 'firefox-os' },
    blackberry: { id: ClientPlatformIDs.Iphone, name: 'blackberry' },
    'windows phone': { id: ClientPlatformIDs.Iphone, name: 'windows-phone' }
  }

  if (userAgent.includes('android')) {
    return {
      method: ClientConnectionMethod.LAN,
      ip,
      port,
      id: userAgent.includes('mobile') ? ClientPlatformIDs.Iphone : ClientPlatformIDs.Tablet,
      name: userAgent.includes('mobile') ? 'android' : 'tablet'
    }
  }

  const matchedDevice = Object.entries(deviceMap).find(([key]) => userAgent.includes(key))
  if (matchedDevice) {
    return { method: ClientConnectionMethod.LAN, ip, port, ...matchedDevice[1] }
  }

  return {
    method: ClientConnectionMethod.LAN,
    ip,
    port,
    id: ClientPlatformIDs.Unknown,
    name: 'unknown'
  }
}

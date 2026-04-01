/**
 * Electron shim for headless operation.
 * Provides mock implementations of all Electron APIs used by the DeskThing server,
 * allowing the core server (Express, WebSocket, app management) to run without Electron.
 */

import { join } from 'node:path'
import { homedir } from 'node:os'
import { mkdirSync } from 'node:fs'
import { EventEmitter } from 'node:events'
import { readFileSync } from 'node:fs'

// Determine user data path - mimics Electron's app.getPath('userData')
const USER_DATA_PATH = process.env.DESKTHING_DATA_PATH || join(homedir(), '.deskthing')

// Ensure the directory exists
mkdirSync(USER_DATA_PATH, { recursive: true })

// Set process.resourcesPath (Electron-specific global) to our data dir
// This is used by envBuilder.ts and adbHandler.ts
;(process as any).resourcesPath = join(USER_DATA_PATH, 'resources')
mkdirSync((process as any).resourcesPath, { recursive: true })

// Create required subdirectories
for (const dir of ['temp', 'logs', 'apps', 'webapp', 'thumbnails']) {
  mkdirSync(join(USER_DATA_PATH, dir), { recursive: true })
}

// Read version from package.json
let packageVersion = '0.0.0'
try {
  const pkg = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'))
  packageVersion = pkg.version
} catch {
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'))
    packageVersion = pkg.version
  } catch {
    // fallback
  }
}

/**
 * Mock Electron app object
 */
class MockApp extends EventEmitter {
  private _ready = false
  private _readyPromise: Promise<void>
  private _readyResolve!: () => void

  constructor() {
    super()
    this._readyPromise = new Promise((resolve) => {
      this._readyResolve = resolve
    })
    // Auto-ready on next tick (mimics Electron's behavior)
    process.nextTick(() => {
      this._ready = true
      this._readyResolve()
      this.emit('ready')
    })
  }

  getPath(name: string): string {
    switch (name) {
      case 'userData':
        return USER_DATA_PATH
      case 'exe':
        return process.execPath
      case 'home':
        return homedir()
      case 'temp':
        return join(USER_DATA_PATH, 'temp')
      case 'logs':
        return join(USER_DATA_PATH, 'logs')
      default:
        return USER_DATA_PATH
    }
  }

  getAppPath(): string {
    return process.cwd()
  }

  getVersion(): string {
    return packageVersion
  }

  isReady(): boolean {
    return this._ready
  }

  whenReady(): Promise<void> {
    return this._readyPromise
  }

  requestSingleInstanceLock(): boolean {
    return true
  }

  setAppUserModelId(_id: string): void {
    // no-op
  }

  quit(): void {
    console.log('[headless] Shutting down...')
    process.exit(0)
  }

  getName(): string {
    return 'DeskThing'
  }

  setName(_name: string): void {
    // no-op
  }

  isPackaged = false
}

export const app = new MockApp()

/**
 * Mock BrowserWindow - all window operations are no-ops in headless mode
 */
export class BrowserWindow extends EventEmitter {
  webContents = {
    send: (_channel: string, ..._args: unknown[]): void => {},
    on: (_event: string, _handler: (...args: unknown[]) => void): void => {},
    executeJavaScript: (_code: string): Promise<void> => Promise.resolve(),
    session: {
      webRequest: {
        onHeadersReceived: (_filter: unknown, _handler?: unknown): void => {}
      }
    }
  }

  constructor(_options?: unknown) {
    super()
  }

  loadURL(_url: string): Promise<void> {
    return Promise.resolve()
  }

  loadFile(_path: string): Promise<void> {
    return Promise.resolve()
  }

  show(): void {}
  hide(): void {}
  close(): void {}
  destroy(): void {}
  focus(): void {}
  isDestroyed(): boolean {
    return false
  }
  isMinimized(): boolean {
    return false
  }
  restore(): void {}
  getTitle(): string {
    return ''
  }

  static getAllWindows(): BrowserWindow[] {
    return []
  }

  static getFocusedWindow(): BrowserWindow | null {
    return null
  }
}

/**
 * Mock IPC main - events go nowhere in headless mode, but handlers still register
 */
class MockIpcMain extends EventEmitter {
  handle(_channel: string, _handler: (...args: unknown[]) => unknown): void {}
  handleOnce(_channel: string, _handler: (...args: unknown[]) => unknown): void {}
  removeHandler(_channel: string): void {}
}

export const ipcMain = new MockIpcMain()

/**
 * Mock shell
 */
export const shell = {
  openExternal: (url: string): Promise<void> => {
    console.log(`[headless] Open URL: ${url}`)
    return Promise.resolve()
  },
  openPath: (path: string): Promise<string> => {
    console.log(`[headless] Open path: ${path}`)
    return Promise.resolve('')
  }
}

/**
 * Mock dialog
 */
export const dialog = {
  showOpenDialog: (_options: unknown): Promise<{ canceled: boolean; filePaths: string[] }> => {
    console.log('[headless] File dialog not available in headless mode')
    return Promise.resolve({ canceled: true, filePaths: [] })
  },
  showSaveDialog: (_options: unknown): Promise<{ canceled: boolean; filePath?: string }> => {
    return Promise.resolve({ canceled: true })
  },
  showMessageBox: (_options: unknown): Promise<{ response: number }> => {
    return Promise.resolve({ response: 0 })
  }
}

/**
 * Mock Tray
 */
export class Tray {
  constructor(_image: unknown) {}
  setToolTip(_tooltip: string): void {}
  setContextMenu(_menu: unknown): void {}
  on(_event: string, _handler: (...args: unknown[]) => void): this {
    return this
  }
}

/**
 * Mock Menu
 */
export class Menu {
  static buildFromTemplate(_template: unknown[]): Menu {
    return new Menu()
  }
  static setApplicationMenu(_menu: Menu | null): void {}
}

/**
 * Mock MenuItem
 */
export class MenuItem {
  constructor(_options?: unknown) {}
}

/**
 * Mock nativeImage
 */
export const nativeImage = {
  createFromPath: (_path: string): NativeImage => new NativeImage(),
  createEmpty: (): NativeImage => new NativeImage()
}

export class NativeImage {
  toPNG(): Buffer {
    return Buffer.alloc(0)
  }
  toJPEG(_quality: number): Buffer {
    return Buffer.alloc(0)
  }
  getSize(): { width: number; height: number } {
    return { width: 0, height: 0 }
  }
}

/**
 * Mock Notification
 */
export class Notification {
  constructor(_options?: unknown) {}
  show(): void {}
}

/**
 * Mock electron-updater autoUpdater
 * Exported separately so it can be aliased for the electron-updater package
 */
export const autoUpdater = {
  checkForUpdates: (): Promise<null> => Promise.resolve(null),
  checkForUpdatesAndNotify: (): Promise<null> => Promise.resolve(null),
  downloadUpdate: (): Promise<void> => Promise.resolve(),
  quitAndInstall: (): void => {},
  on: (): void => {},
  once: (): void => {},
  removeListener: (): void => {},
  setFeedURL: (): void => {},
  currentVersion: { version: '0.0.0' },
  autoDownload: false,
  autoInstallOnAppQuit: false,
  logger: null as unknown,
  forceDevUpdateConfig: false,
}

// Default export for electron-updater compatibility (import electronUpdater from 'electron-updater')
export const electronUpdaterDefault = {
  autoUpdater
}

// Re-export as default module shape
export default {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  dialog,
  Tray,
  Menu,
  MenuItem,
  nativeImage,
  NativeImage,
  Notification
}

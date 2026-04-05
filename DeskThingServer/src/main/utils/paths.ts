import { join } from 'node:path'
import { homedir } from 'node:os'
import { mkdirSync, readFileSync } from 'node:fs'

const USER_DATA_PATH = process.env.DESKTHING_DATA_PATH || join(homedir(), '.deskthing')

// Ensure base directories exist on import
for (const dir of ['', 'temp', 'logs', 'apps', 'webapp', 'thumbnails', 'resources']) {
  mkdirSync(join(USER_DATA_PATH, dir), { recursive: true })
}

let _version: string | null = null

export function getUserDataPath(): string {
  return USER_DATA_PATH
}
export function getTempPath(): string {
  return join(USER_DATA_PATH, 'temp')
}
export function getLogsPath(): string {
  return join(USER_DATA_PATH, 'logs')
}
export function getExePath(): string {
  return process.execPath
}
export function getResourcesPath(...segments: string[]): string {
  return join(USER_DATA_PATH, 'resources', ...segments)
}
export function getVersion(): string {
  if (_version) return _version
  try {
    const pkg = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'))
    _version = pkg.version
  } catch {
    try {
      const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'))
      _version = pkg.version
    } catch {
      _version = '0.0.0'
    }
  }
  return _version!
}

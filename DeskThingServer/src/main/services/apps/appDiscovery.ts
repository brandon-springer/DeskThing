/**
 * App Auto-Discovery
 *
 * Scans ~/.deskthing/apps/ for directories containing a manifest.json.
 * Any app found on disk but missing from apps.json gets registered automatically.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { LOGGING_LEVELS } from '@deskthing/types'
import Logger from '@server/utils/logger'
import { getUserDataPath } from '@server/utils/paths'
import { getAppData, setAppData } from '../files/appFileService'

export async function discoverApps(): Promise<void> {
  const appsDir = join(getUserDataPath(), 'apps')
  const registered = await getAppData()

  let dirs: string[]
  try {
    dirs = readdirSync(appsDir).filter((name) => {
      try {
        return statSync(join(appsDir, name)).isDirectory()
      } catch {
        return false
      }
    })
  } catch {
    Logger.warn('[AppDiscovery] Could not read apps directory')
    return
  }

  for (const dirName of dirs) {
    if (registered[dirName]) continue

    const manifestPath = join(appsDir, dirName, 'manifest.json')
    let manifest
    try {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    } catch {
      // No manifest = not a valid app, skip silently
      continue
    }

    Logger.log(LOGGING_LEVELS.LOG, `[AppDiscovery] Found new app on disk: ${dirName}`)

    await setAppData({
      name: dirName,
      enabled: true,
      running: false,
      prefIndex: 10,
      manifest
    })
  }
}

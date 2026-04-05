import { updateLoadingStatus } from '@server/windows/loadingWindow'
import { Settings } from '@shared/types'
import { getUserDataPath } from '@server/utils/paths'
import { readFile } from 'fs/promises'
import { join } from 'path'

export const getCurrentVersion = async (): Promise<string | undefined> => {
  const settingsPath = join(getUserDataPath(), 'settings.json')

  updateLoadingStatus('Checking version')
  try {
    const settings = JSON.parse(await readFile(settingsPath, 'utf-8')) as Settings
    return settings?.version
  } catch (error) {
    updateLoadingStatus('Settings file not found', error)
    return ''
  }
}

export const getSetting = async <K extends keyof Settings>(
  settingId: K
): Promise<Settings[K] | undefined> => {
  const settingsPath = join(getUserDataPath(), 'settings.json')

  updateLoadingStatus('Getting setting ' + settingId)
  try {
    const settings = JSON.parse(await readFile(settingsPath, 'utf-8')) as Settings
    return settings[settingId]
  } catch (error) {
    updateLoadingStatus('Settings file not found', error)
    return
  }
}

import { getResourcesPath as getBaseResourcesPath } from '@server/utils/paths'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import logger from './logger'

export const getResourcesPath = (...pathSegments: string[]): string => {
  // In development
  if (process.env.NODE_ENV === 'development') {
    return join(process.cwd(), 'resources', ...pathSegments)
  }

  const path = getBaseResourcesPath(...pathSegments)

  if (!existsSync(path)) {
    logger.warn(`Resources path not found: ${path}`, {
      function: 'getResourcesPath'
    })
  }

  return path
}

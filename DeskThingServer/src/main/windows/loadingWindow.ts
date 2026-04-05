import logger from '@server/utils/logger'

export async function updateLoadingStatus(message: string, error?: unknown): Promise<void> {
  logger.info(message, { source: 'loading' })
  if (error) {
    console.log(error)
  }
}

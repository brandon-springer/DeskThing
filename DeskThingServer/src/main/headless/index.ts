/**
 * Headless entry point for DeskThing server.
 * Runs the core server (Express + WebSocket + app management) without Electron.
 * Designed for Raspberry Pi and other headless Linux systems.
 */

// Set up process error handlers first
import '../system/process'

import { app } from 'electron'
import dotenv from 'dotenv'

// Load environment
dotenv.config()

console.log(`
╔══════════════════════════════════════════╗
║        DeskThing Headless Server         ║
║              v${app.getVersion().padEnd(27)}║
╚══════════════════════════════════════════╝
`)

async function main(): Promise<void> {
  // Wait for mock app to be "ready"
  await app.whenReady()

  console.log(`[headless] Data directory: ${app.getPath('userData')}`)

  // Load config (env builder) - skip encrypted secrets in headless mode
  try {
    const { loadConfig } = await import('../utils/envBuilder')
    loadConfig()
  } catch {
    console.log('[headless] Skipping encrypted config (not available outside Electron packaging)')
  }

  // Initialize stores
  console.log('[headless] Initializing stores...')
  const { initializeStores } = await import('../services/utility/storeInitializer')
  await initializeStores()

  // Initialize platforms (WebSocket + ADB)
  console.log('[headless] Initializing platforms...')
  const { initializePlatforms } = await import('../stores/platforms/platformInitializer')
  await initializePlatforms()

  console.log('[headless] Server is running!')
  console.log('[headless] WebSocket/HTTP server on port 8891')
  console.log('[headless] Press Ctrl+C to stop')

  // Run background startup tasks after a delay (skip update check - no Electron updater)
  setTimeout(async () => {
    try {
      const { storeProvider } = await import('../stores/storeProvider')

      const releaseStore = await storeProvider.getStore('releaseStore')
      await releaseStore.refreshData()

      const notificationStore = await storeProvider.getStore('notificationStore')
      await notificationStore.checkForNotifications()

      const timeStore = await storeProvider.getStore('timeStore')
      await timeStore.initialize()

      console.log('[headless] Post-startup tasks complete')
    } catch (error) {
      console.error('[headless] Failed to run startup tasks:', error)
    }
  }, 10000)

  // Graceful shutdown
  const shutdown = async (): Promise<void> => {
    console.log('\n[headless] Shutting down gracefully...')
    try {
      const { storeProvider } = await import('../stores/storeProvider')
      const statsCollector = await storeProvider.getStore('statsCollector')
      await statsCollector.collectSessionCloseStats()

      const { default: cacheManager } = await import('../services/utility/cacheManager')
      await cacheManager.hibernateAll()
    } catch (error) {
      console.error('[headless] Error during shutdown:', error)
    }
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((error) => {
  console.error('[headless] Fatal error:', error)
  process.exit(1)
})

import { defineConfig, Plugin } from 'vite'
import { resolve } from 'path'
import { builtinModules } from 'module'

const electronShimPath = resolve(__dirname, 'src/main/headless/electronShim.ts')

/**
 * Plugin to handle electron-vite's ?modulePath query.
 * In electron-vite, `import path from './file?modulePath'` resolves to the built file's path.
 * We resolve it to the output path at runtime using __dirname.
 */
function modulePathPlugin(): Plugin {
  const modulePathEntries: Record<string, string> = {}

  return {
    name: 'headless-module-path',
    enforce: 'pre',

    resolveId(source, importer) {
      if (source.endsWith('?modulePath')) {
        const cleanSource = source.replace('?modulePath', '')
        // Resolve relative to importer
        const resolved = importer
          ? resolve(importer, '..', cleanSource)
          : resolve(cleanSource)
        const id = `\0modulePath:${resolved}`
        // Map to output filename
        const basename = cleanSource.split('/').pop() || 'unknown'
        modulePathEntries[id] = basename
        return id
      }
      return null
    },

    load(id) {
      if (id.startsWith('\0modulePath:')) {
        const basename = modulePathEntries[id] || 'unknown'
        // At runtime, resolve to the output root directory (entry files are there)
        // Worker entry points are always emitted at the output root, not in chunks/
        return `
          import { join, dirname } from 'node:path';
          import { fileURLToPath } from 'node:url';
          const __filename = fileURLToPath(import.meta.url);
          const __curdir = dirname(__filename);
          // If we're in chunks/, go up one level to find entry files
          const __outdir = __curdir.endsWith('chunks') ? dirname(__curdir) : __curdir;
          export default join(__outdir, '${basename}.mjs');
        `
      }
      return null
    },
  }
}

/**
 * Plugin to handle ?asset imports (used for icon files in electron).
 * Returns the file path as a string.
 */
function assetPathPlugin(): Plugin {
  return {
    name: 'headless-asset-path',
    enforce: 'pre',

    resolveId(source) {
      if (source.endsWith('?asset')) {
        return `\0asset:${source.replace('?asset', '')}`
      }
      return null
    },

    load(id) {
      if (id.startsWith('\0asset:')) {
        const assetPath = id.replace('\0asset:', '')
        return `export default ${JSON.stringify(assetPath)};`
      }
      return null
    },
  }
}

/**
 * Plugin to stub electron-updater with a no-op autoUpdater.
 */
function electronUpdaterStubPlugin(): Plugin {
  return {
    name: 'headless-electron-updater-stub',
    enforce: 'pre',

    resolveId(source) {
      if (source === 'electron-updater') {
        return '\0electron-updater-stub'
      }
      return null
    },

    load(id) {
      if (id === '\0electron-updater-stub') {
        return `
          const autoUpdater = {
            checkForUpdates: () => Promise.resolve(null),
            checkForUpdatesAndNotify: () => Promise.resolve(null),
            downloadUpdate: () => Promise.resolve(),
            quitAndInstall: () => {},
            on: () => {},
            once: () => {},
            removeListener: () => {},
            setFeedURL: () => {},
            currentVersion: { version: '0.0.0' },
            autoDownload: false,
            autoInstallOnAppQuit: false,
            logger: null,
            forceDevUpdateConfig: false,
          };
          export { autoUpdater };
          export default { autoUpdater };
        `
      }
      return null
    },
  }
}

export default defineConfig({
  plugins: [modulePathPlugin(), assetPathPlugin(), electronUpdaterStubPlugin()],
  build: {
    target: 'node22',
    outDir: 'out-headless',
    lib: {
      entry: {
        index: resolve(__dirname, 'src/main/headless/index.ts'),
        appProcess: resolve(__dirname, 'src/main/processes/appProcess.ts'),
        flashProcess: resolve(__dirname, 'src/main/processes/flashProcess.ts'),
        wsWebsocket: resolve(__dirname, 'src/main/stores/platforms/websocket/wsWebsocket.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: (id) => {
        // Inline these - don't externalize
        if (
          id === 'electron' ||
          id === 'electron/main' ||
          id === 'electron-updater' ||
          id.includes('@electron-toolkit') ||
          id.startsWith('@shared') ||
          id.startsWith('@server') ||
          id.startsWith('@processes')
        ) {
          return false
        }
        // Externalize Node builtins
        if (builtinModules.includes(id) || id.startsWith('node:')) {
          return true
        }
        // Externalize node_modules
        if (!id.startsWith('.') && !id.startsWith('/') && !id.startsWith('\0')) {
          return true
        }
        return false
      },
      output: {
        entryFileNames: '[name].mjs',
        chunkFileNames: 'chunks/[name].mjs',
      },
    },
    minify: false,
    sourcemap: true,
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      // The magic: redirect all electron imports to our shim
      // Order matters - more specific first
      'electron/main': electronShimPath,
      'electron': electronShimPath,
      // Project aliases
      '@shared': resolve(__dirname, 'src/shared'),
      '@server': resolve(__dirname, 'src/main'),
      '@processes': resolve(__dirname, 'src/main/processes'),
      // Electron toolkit utils - stub it out
      '@electron-toolkit/utils': electronShimPath,
    },
  },
})

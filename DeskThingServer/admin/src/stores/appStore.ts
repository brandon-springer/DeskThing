import { create } from 'zustand'
import { adminFetch } from '../api/client'

export interface App {
  name: string
  id: string
  enabled: boolean
  running: boolean
  manifest?: {
    version?: string
    author?: string
    description?: string
    label?: string
    [key: string]: any
  }
  [key: string]: any
}

export interface AppSetting {
  type: string
  value: any
  label?: string
  description?: string
  options?: { label: string; value: any }[]
  min?: number
  max?: number
  [key: string]: any
}

interface AppState {
  apps: App[]
  loading: boolean
  appSettings: Record<string, Record<string, AppSetting>>
  fetchApps: () => Promise<void>
  runApp: (id: string) => Promise<void>
  stopApp: (id: string) => Promise<void>
  enableApp: (id: string) => Promise<void>
  disableApp: (id: string) => Promise<void>
  purgeApp: (id: string) => Promise<void>
  fetchAppSettings: (id: string) => Promise<void>
  updateAppSettings: (id: string, settings: Record<string, any>) => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  apps: [],
  loading: false,
  appSettings: {},

  fetchApps: async () => {
    set({ loading: true })
    try {
      const apps = await adminFetch<App[]>('/apps')
      set({ apps })
    } catch (e) {
      console.error('Failed to fetch apps:', e)
    } finally {
      set({ loading: false })
    }
  },

  runApp: async (id) => {
    await adminFetch(`/apps/${id}/run`, { method: 'POST' })
    get().fetchApps()
  },

  stopApp: async (id) => {
    await adminFetch(`/apps/${id}/stop`, { method: 'POST' })
    get().fetchApps()
  },

  enableApp: async (id) => {
    await adminFetch(`/apps/${id}/enable`, { method: 'POST' })
    get().fetchApps()
  },

  disableApp: async (id) => {
    await adminFetch(`/apps/${id}/disable`, { method: 'POST' })
    get().fetchApps()
  },

  purgeApp: async (id) => {
    await adminFetch(`/apps/${id}/purge`, { method: 'POST' })
    get().fetchApps()
  },

  fetchAppSettings: async (id) => {
    try {
      const settings = await adminFetch<Record<string, AppSetting>>(`/apps/${id}/settings`)
      set((s) => ({
        appSettings: { ...s.appSettings, [id]: settings },
      }))
    } catch (e) {
      console.error(`Failed to fetch settings for ${id}:`, e)
    }
  },

  updateAppSettings: async (id, settings) => {
    await adminFetch(`/apps/${id}/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    })
    get().fetchAppSettings(id)
  },
}))

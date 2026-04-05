import { create } from 'zustand'
import { adminFetch } from '../api/client'

interface SettingsState {
  settings: Record<string, any>
  loading: boolean
  fetchSettings: () => Promise<void>
  updateSettings: (settings: Record<string, any>) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: {},
  loading: false,

  fetchSettings: async () => {
    set({ loading: true })
    try {
      const settings = await adminFetch<Record<string, any>>('/settings')
      set({ settings })
    } catch (e) {
      console.error('Failed to fetch settings:', e)
    } finally {
      set({ loading: false })
    }
  },

  updateSettings: async (settings) => {
    await adminFetch('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    })
    get().fetchSettings()
  },
}))

import { create } from 'zustand'
import { adminFetch } from '../api/client'

export interface Release {
  id: string
  name: string
  version?: string
  description?: string
  author?: string
  [key: string]: any
}

export interface Repo {
  url: string
  [key: string]: any
}

interface ReleaseState {
  appReleases: Release[]
  clientReleases: Release[]
  repos: Repo[]
  loading: boolean
  fetchAppReleases: () => Promise<void>
  fetchClientReleases: () => Promise<void>
  fetchRepos: () => Promise<void>
  downloadApp: (appId: string) => Promise<void>
  downloadClient: (clientId: string) => Promise<void>
  refreshReleases: () => Promise<void>
  addRepo: (url: string) => Promise<void>
}

export const useReleaseStore = create<ReleaseState>((set, get) => ({
  appReleases: [],
  clientReleases: [],
  repos: [],
  loading: false,

  fetchAppReleases: async () => {
    set({ loading: true })
    try {
      const appReleases = await adminFetch<Release[]>('/releases/apps')
      set({ appReleases })
    } catch (e) {
      console.error('Failed to fetch app releases:', e)
    } finally {
      set({ loading: false })
    }
  },

  fetchClientReleases: async () => {
    try {
      const clientReleases = await adminFetch<Release[]>('/releases/clients')
      set({ clientReleases })
    } catch (e) {
      console.error('Failed to fetch client releases:', e)
    }
  },

  fetchRepos: async () => {
    try {
      const repos = await adminFetch<Repo[]>('/releases/repos')
      set({ repos })
    } catch (e) {
      console.error('Failed to fetch repos:', e)
    }
  },

  downloadApp: async (appId) => {
    await adminFetch('/releases/apps/download', {
      method: 'POST',
      body: JSON.stringify({ appId }),
    })
  },

  downloadClient: async (clientId) => {
    await adminFetch('/releases/clients/download', {
      method: 'POST',
      body: JSON.stringify({ clientId }),
    })
  },

  refreshReleases: async () => {
    set({ loading: true })
    try {
      await adminFetch('/releases/refresh', { method: 'POST' })
      await Promise.all([get().fetchAppReleases(), get().fetchClientReleases()])
    } catch (e) {
      console.error('Failed to refresh releases:', e)
    } finally {
      set({ loading: false })
    }
  },

  addRepo: async (url) => {
    await adminFetch('/releases/repos', {
      method: 'POST',
      body: JSON.stringify({ url }),
    })
    get().fetchRepos()
  },
}))

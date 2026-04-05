import { create } from 'zustand'
import { adminFetch } from '../api/client'

export interface Client {
  clientId: string
  connectionId?: string
  connected: boolean
  device_type?: string
  platform?: string
  [key: string]: any
}

interface ClientState {
  clients: Client[]
  loading: boolean
  fetchClients: () => Promise<void>
}

export const useClientStore = create<ClientState>((set) => ({
  clients: [],
  loading: false,

  fetchClients: async () => {
    set({ loading: true })
    try {
      const clients = await adminFetch<Client[]>('/clients')
      set({ clients })
    } catch (e) {
      console.error('Failed to fetch clients:', e)
    } finally {
      set({ loading: false })
    }
  },
}))

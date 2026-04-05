import { create } from 'zustand'
import { adminFetch } from '../api/client'

interface NotificationState {
  notifications: Record<string, any>
  fetchNotifications: () => Promise<void>
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: {},

  fetchNotifications: async () => {
    try {
      const notifications = await adminFetch<Record<string, any>>('/notifications')
      set({ notifications })
    } catch (e) {
      console.error('Failed to fetch notifications:', e)
    }
  },
}))

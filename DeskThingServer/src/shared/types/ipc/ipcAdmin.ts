import { AppIPCData } from './ipcApps'
import { ClientIPCData } from './ipcClient'
import { DeviceIPCData } from './ipcDevice'
import { FeedbackIPCData } from './ipcFeedback'
import { ReleaseIPCData } from './ipcReleases'
import { ServerIPCData } from './ipcServer'
import { TaskIPCData } from './ipcTask'
import { UpdateIPCData } from './ipcUpdate'
import { UtilityIPCData } from './ipcUtility'

export type AdminPayload =
  | AppIPCData
  | ClientIPCData
  | DeviceIPCData
  | FeedbackIPCData
  | ReleaseIPCData
  | TaskIPCData
  | UpdateIPCData
  | UtilityIPCData

export interface AdminAPIRequest {
  type: 'admin-api'
  requestId: string
  payload: AdminPayload
}

export interface AdminAPIResponse {
  type: 'admin-api-response'
  requestId: string
  result: unknown
  error?: string
}

export interface AdminPushEvent {
  type: 'admin-push'
  data: ServerIPCData
}

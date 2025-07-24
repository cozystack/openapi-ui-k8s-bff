import { AxiosRequestConfig } from 'axios'

export type TLogLine = {
  timestamp: string // ISO 8601
  message: string
}

export type TFetchLogsOptions = {
  namespace: string
  pod: string
  container: string
  headers: AxiosRequestConfig['headers']
  pollIntervalMs?: number
}

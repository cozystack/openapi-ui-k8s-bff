import { userKubeApi } from 'src/constants/httpAgent'
import { TLogLine, TFetchLogsOptions } from './types'

/**
 * Starts polling the pod logs. Returns a stop function.
 */
export const startLogPolling = (
  { namespace, pod, container, headers, pollIntervalMs = 5000 }: TFetchLogsOptions,
  onNewLines: (lines: TLogLine[]) => void,
): { stop: () => void } => {
  let canceled = false
  let latestTimestamp: string | null = null

  // Build base URL
  const buildUrl = (sinceTime?: string) => {
    const params = new URLSearchParams({
      container,
      timestamps: 'true',
      ...(sinceTime && { sinceTime }),
    })
    return (
      `/api/v1/namespaces/${encodeURIComponent(namespace)}` +
      `/pods/${encodeURIComponent(pod)}/log?` +
      params.toString()
    )
  }

  // Parse text response into timestamped lines
  const parseLogText = (text: string): TLogLine[] => {
    return text
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => {
        // Kubernetes logs with timestamps look like: "2025-07-24T12:34:56.789Z message..."
        const firstSpace = line.indexOf(' ')
        return {
          timestamp: line.slice(0, firstSpace),
          message: line.slice(firstSpace + 1),
        }
      })
  }

  // Do one fetch (initial or incremental)
  const doFetch = async () => {
    try {
      const url = buildUrl(latestTimestamp || undefined)
      const resp = await userKubeApi.get(url, {
        headers,
      })
      if (!resp.data) {
        console.error('Log fetch failed:', resp.statusText)
        return
      }
      const text = await resp.data
      const lines = parseLogText(text)
      if (lines.length === 0) {
        return
      }

      // Update latestTimestamp to the last line’s timestamp
      latestTimestamp = lines[lines.length - 1].timestamp

      // Send to callback
      onNewLines(lines)
    } catch (err) {
      console.error('Error fetching logs:', err)
    }
  }

  // Kick off initial fetch, then poll
  ;(async () => {
    await doFetch()
    // Schedule recurring polls
    while (!canceled) {
      await new Promise(res => setTimeout(res, pollIntervalMs))
      await doFetch()
    }
  })()

  return {
    stop: () => {
      canceled = true
    },
  }
}

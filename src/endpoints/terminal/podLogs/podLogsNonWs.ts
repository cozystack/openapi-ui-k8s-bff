import WebSocket from 'ws'
import { AxiosRequestConfig } from 'axios'
import { WebsocketRequestHandler } from 'express-ws'
import { DEVELOPMENT } from 'src/constants/envs'
import { httpsAgent, baseUrl, userKubeApi } from 'src/constants/httpAgent'

export type TMessage = {
  type: string
  payload: any
}

const parseLogText = (
  text: string,
): {
  timestamp: Date
  message: string
}[] => {
  return text
    .split('\n')
    .filter(line => line.trim().length > 0)
    .map(line => {
      // Kubernetes logs with timestamps look like: "2025-07-24T12:34:56.789Z message..."
      const firstSpace = line.indexOf(' ')
      return {
        timestamp: new Date(line.slice(0, firstSpace)),
        message: line.slice(firstSpace + 1),
      }
    })
}

export const startLogPolling = (
  {
    url,
    headers,
    pollIntervalMs = 5000,
  }: { url: string; headers: AxiosRequestConfig['headers']; pollIntervalMs?: number },
  onNewLines: (lines: string) => void,
): { stop: () => void } => {
  let canceled = false
  let prevLatestTimestamp: Date | null = null
  let latestTimestamp: Date | null = null

  const doFetch = async () => {
    try {
      const {
        status,
        statusText,
        data: initLogs,
      } = await userKubeApi.get(url, {
        headers,
      })
      if (!status || status !== 200) {
        console.error('Log fetch failed:', statusText)
        return
      }
      const initLogsSplitted: string[] = initLogs.split('\n')

      initLogsSplitted.forEach(line => {
        const lineDate = line.split(' ')[0]
        if (lineDate && lineDate.length > 1) {
          const lineDateParsed = new Date(lineDate)
          if (!latestTimestamp) {
            latestTimestamp = lineDateParsed
          }
          if (lineDateParsed > latestTimestamp) {
            latestTimestamp = lineDateParsed
          }
        }
      })

      // console.log(latestTimestamp)

      const initLogsWithoutTimestamps = initLogsSplitted
        .filter(line => {
          const index = line.indexOf(' ')
          const timestamp = line.slice(0, index)
          // const rest = line.slice(index + 1)
          if (prevLatestTimestamp) {
            // console.log(new Date(timestamp))
            // console.log(new Date(prevLatestTimestamp))
            return new Date(timestamp) > prevLatestTimestamp
          }
          return true
        })
        .map(line => {
          const index = line.indexOf(' ')
          // const timestamp = line.slice(0, index)
          const rest = line.slice(index + 1)
          return rest
        })
        .join('\n')

      prevLatestTimestamp = latestTimestamp

      // Send to callback
      onNewLines(initLogsWithoutTimestamps)
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

export const podLogsNonWsWebSocket: WebsocketRequestHandler = async (ws, req) => {
  console.log(`[${new Date().toISOString()}]: Websocket: Client connected to WebSocket server`)

  const filteredHeaders = { ...req.headers }
  delete filteredHeaders['host'] // Avoid passing internal host header
  Object.keys(filteredHeaders).forEach(key => {
    if (key.startsWith('sec-websocket-')) {
      delete filteredHeaders[key]
    }
  })

  try {
    const handleInit = async (message: TMessage) => {
      if (message.type !== 'init') {
        console.error(
          `[${new Date().toISOString()}]: Websocket: HandleInit: First message must be init, but got type: ${
            message.type
          }`,
        )
        ws.close()
        return
      }

      const namespace = message.payload.namespace
      const podName = message.payload.podName
      const container = message.payload.container

      ws.send(JSON.stringify({ type: 'ready' }))

      const params = new URLSearchParams({
        container,
        timestamps: 'true',
      })

      const execUrlNoFollow = `${baseUrl}/api/v1/namespaces/${namespace}/pods/${podName}/log?${params.toString()}`

      let pause = false
      let buffer: string[] = []

      const { stop } = startLogPolling(
        {
          url: execUrlNoFollow,
          headers: {
            ...(DEVELOPMENT ? {} : filteredHeaders),
          },
          pollIntervalMs: 3000, // optional, defaults to 5s
        },
        newLines => {
          if (pause) {
            buffer.push(newLines)
            return
          }
          ws.send(JSON.stringify({ type: 'output', payload: newLines }))
        },
      )

      ws.on('message', message => {
        const parsedMessage = JSON.parse(message.toString()) as TMessage

        if (parsedMessage.type === 'stop') {
          console.log(`[${new Date().toISOString()}]: WebsocketPod: Logs Paused`)
          pause = true
          return
        }

        if (parsedMessage.type === 'continue') {
          console.log(`[${new Date().toISOString()}]: WebsocketPod: Logs Continue`)
          buffer.forEach(msg => ws.send(JSON.stringify({ type: 'output', payload: msg })))
          buffer = []
          pause = false
          return
        }
      })

      ws.on('close', () => {
        stop()
        console.log(`[${new Date().toISOString()}]: Websocket: Client disconnected`)
      })
    }

    ws.once('message', (message: Buffer) => {
      try {
        console.log(`[${new Date().toISOString()}]: WebSocket: Init message:`, message.toString())
        const parsedMessage = JSON.parse(message.toString()) as TMessage
        handleInit(parsedMessage)
      } catch (error) {
        console.error(`[${new Date().toISOString()}]: WebSocket: Invalid init message:`, error)
        ws.close()
      }
    })
  } catch (error) {
    console.log(`[${new Date().toISOString()}]: WebSocket: Error catched: ${error}`)
  }
}

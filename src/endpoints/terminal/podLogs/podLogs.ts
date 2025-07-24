import { WebsocketRequestHandler } from 'express-ws'
import { DEVELOPMENT } from 'src/constants/envs'
import { startLogPolling } from './utils'

export type TMessage = {
  type: string
  payload: any
}

export const podLogsWebSocket: WebsocketRequestHandler = async (ws, req) => {
  console.log(`[${new Date().toISOString()}]: Websocket: Client connected to WebSocket server`)

  const filteredHeaders = { ...req.headers }
  delete filteredHeaders['host'] // Avoid passing internal host header
  Object.keys(filteredHeaders).forEach(key => {
    if (key.startsWith('sec-websocket-')) {
      delete filteredHeaders[key]
    }
  })

  try {
    const handleInit = (message: TMessage) => {
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

      const { stop } = startLogPolling(
        {
          namespace,
          pod: podName,
          container,
          headers: {
            ...(DEVELOPMENT ? {} : filteredHeaders),
            'Content-Type': 'application/json',
          },
          pollIntervalMs: 3000, // optional, defaults to 5s
        },
        newLines => {
          ws.send(JSON.stringify({ type: 'output', payload: newLines }))
          // newLines.forEach(({ timestamp, message }) => {
          //   console.log(`[${timestamp}] ${message}`)
          // })
        },
      )

      ws.on('message', message => {
        const parsedMessage = JSON.parse(message.toString()) as TMessage
        if (parsedMessage.type === 'close') {
          stop()
          ws.close()
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

import WebSocket from 'ws'
import { WebsocketRequestHandler } from 'express-ws'
import { DEVELOPMENT } from 'src/constants/envs'
import { httpsAgent, baseUrl } from 'src/constants/httpAgent'

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

      ws.send(JSON.stringify({ type: 'ready' }))

      const params = new URLSearchParams({
        container,
        // timestamps: 'true',
      })

      const execUrl = `${baseUrl}/api/v1/namespaces/${namespace}/pods/${podName}/log?${params.toString()}&follow=true`

      console.log(
        `[${new Date().toISOString()}]: WebsocketPod: Connecting with user headers ${JSON.stringify(
          DEVELOPMENT ? {} : filteredHeaders,
        )}`,
      )
      const podWs = new WebSocket(execUrl, {
        agent: httpsAgent,
        headers: {
          ...(DEVELOPMENT ? {} : filteredHeaders),
        },
        protocol: 'v5.channel.k8s.io',
        handshakeTimeout: 5_000,
      })

      podWs.on('open', () => {
        console.log(`[${new Date().toISOString()}]: WebsocketPod: Connected to pod terminal`)
      })

      podWs.on('message', data => {
        const text = Buffer.from(data as any).toString('utf8')

        ws.send(JSON.stringify({ type: 'output', payload: text }))
      })

      podWs.on('close', () => {
        console.log(`[${new Date().toISOString()}]: WebsocketPod: Disconnected from pod terminal`)
        ws.close()
      })

      podWs.on('error', error => {
        console.error(`[${new Date().toISOString()}]: WebsocketPod: Pod WebSocket error:`, error)
      })

      ws.on('message', message => {
        const parsedMessage = JSON.parse(message.toString()) as TMessage
        if (parsedMessage.type === 'close') {
          podWs.close()
          ws.close()
        }
      })

      ws.on('close', () => {
        podWs.close()
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

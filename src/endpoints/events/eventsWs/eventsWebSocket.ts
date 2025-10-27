import { Request } from 'express'
import { WebSocket } from 'ws'
import { WebsocketRequestHandler } from 'express-ws'
import * as k8s from '@kubernetes/client-node'
import { createUserKubeClient } from 'src/constants/kubeClients'

type TWatchPhase = 'ADDED' | 'MODIFIED' | 'DELETED' | 'BOOKMARK'

// Narrow unknown objects from the watch stream to EventsV1Event safely
const isEventsV1Event = (obj: unknown): obj is k8s.EventsV1Event => {
  if (obj === null || typeof obj !== 'object') return false
  const maybe = obj as Record<string, unknown>
  // minimal structural checks
  if (!('metadata' in maybe) || typeof maybe.metadata !== 'object' || maybe.metadata === null) {
    return false
  }
  const md = maybe.metadata as Record<string, unknown>
  if (!('name' in md) || typeof md.name !== 'string') {
    return false
  }
  // optional fields are fine; this is enough to avoid mis-sends
  return true
}

/**
 * Express-ws handler to stream Kubernetes events live.
 * Client receives:
 *   { type: "READY", namespace?: string }
 *   { type: "ADDED"|"MODIFIED"|"DELETED", item: <EventsV1Event> }
 */
export const eventsWebSocket: WebsocketRequestHandler = async (ws: WebSocket, req: Request) => {
  // forward only user headers (you already sanitize in REST; repeat here)
  const headers: Record<string, string | string[] | undefined> = { ...(req.headers || {}) }
  delete headers['host']

  const reqUrl = new URL(req.url || '', `http://${req.headers.host}`)
  const namespace = reqUrl.searchParams.get('namespace') || undefined

  // Create a user-scoped client (injects caller headers into requests),
  // and use its kubeConfig for Watch
  const userKube = createUserKubeClient(headers)
  const watch = new k8s.Watch(userKube.kubeConfig)

  ws.send(JSON.stringify({ type: 'READY', namespace }))

  let closed = false

  const watchPath = namespace
    ? `/apis/events.k8s.io/v1/namespaces/${namespace}/events`
    : `/apis/events.k8s.io/v1/events`

  const start = async (): Promise<void> => {
    if (closed) {
      return
    }
    try {
      await watch.watch(
        watchPath,
        { allowWatchBookmarks: true },
        (phase: string, obj: unknown) => {
          if (closed) {
            return
          }
          const p = phase as TWatchPhase
          if (p === 'ADDED' || p === 'MODIFIED' || p === 'DELETED') {
            if (isEventsV1Event(obj) && ws.readyState === ws.OPEN) {
              ws.send(JSON.stringify({ type: p, item: obj }))
            }
          }
          // ignore BOOKMARK and unknown phases
        },
        // called when the watch ends or errors; we just restart shortly
        () => {
          if (!closed) {
            setTimeout(() => void start(), 1200)
          }
        },
      )
      // If the promise resolves (server closed conn), restart immediately
      if (!closed) {
        setTimeout(() => void start(), 0)
      }
    } catch {
      if (!closed) {
        setTimeout(() => void start(), 2000)
      }
    }
  }

  // kick off
  start()

  // Keep-alive pings for some proxies
  const pingIv = setInterval(() => {
    try {
      if (ws.readyState === ws.OPEN && typeof (ws as { ping?: () => void }).ping === 'function') {
        ;(ws as { ping?: () => void }).ping?.()
      }
    } catch {
      // ignore
    }
  }, 25_000)

  ws.on('close', () => {
    closed = true
    clearInterval(pingIv)
  })

  ws.on('error', () => {
    closed = true
    clearInterval(pingIv)
    try {
      ws.close()
    } catch {
      // ignore
    }
  })
}

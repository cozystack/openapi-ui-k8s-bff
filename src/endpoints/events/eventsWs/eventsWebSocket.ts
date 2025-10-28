import { Request } from 'express'
import { WebSocket } from 'ws'
import { WebsocketRequestHandler } from 'express-ws'
import * as k8s from '@kubernetes/client-node'
import { createUserKubeClient } from 'src/constants/kubeClients'

type TWatchPhase = 'ADDED' | 'MODIFIED' | 'DELETED' | 'BOOKMARK'

const isEventsV1Event = (obj: unknown): obj is k8s.EventsV1Event => {
  if (obj === null || typeof obj !== 'object') return false
  const maybe = obj as Record<string, unknown>
  if (!('metadata' in maybe) || typeof maybe.metadata !== 'object' || maybe.metadata === null) return false
  const md = maybe.metadata as Record<string, unknown>
  return typeof md.name === 'string'
}

const isGone410 = (err: unknown): boolean => {
  const anyErr = err as any
  return (
    anyErr?.statusCode === 410 ||
    anyErr?.code === 410 ||
    anyErr?.status === 410 ||
    anyErr?.body?.code === 410 ||
    anyErr?.body?.reason === 'Expired' ||
    anyErr?.body?.reason === 'Gone'
  )
}

const parseLimit = (val: string | null): number | undefined => {
  if (!val) return undefined
  const n = Number(val)
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : undefined
}

export const eventsWebSocket: WebsocketRequestHandler = async (ws: WebSocket, req: Request) => {
  const headers: Record<string, string | string[] | undefined> = { ...(req.headers || {}) }
  delete headers['host']

  const reqUrl = new URL(req.url || '', `http://${req.headers.host}`)
  const namespace = reqUrl.searchParams.get('namespace') || undefined
  const initialLimit = parseLimit(reqUrl.searchParams.get('limit'))
  const initialContinue = reqUrl.searchParams.get('_continue') || undefined

  const userKube = createUserKubeClient(headers)
  const watch = new k8s.Watch(userKube.kubeConfig)
  const evApi = userKube.kubeConfig.makeApiClient(k8s.EventsV1Api)

  let closed = false
  let lastRV: string | undefined
  let sentInitial = false

  const watchPath = namespace
    ? `/apis/events.k8s.io/v1/namespaces/${namespace}/events`
    : `/apis/events.k8s.io/v1/events`

  /**
   * One page of list. If `captureRV` is true we update lastRV from the list's metadata.
   * We return the page along with pagination metadata so the caller can forward it to the UI.
   */
  const listPage = async ({
    limit,
    _continue,
    captureRV,
  }: {
    limit?: number
    _continue?: string
    captureRV: boolean
  }) => {
    const opts: k8s.EventsV1ApiListEventForAllNamespacesRequest = {}
    if (typeof limit === 'number') (opts as any).limit = limit
    if (_continue) (opts as any)._continue = _continue

    const resp = namespace
      ? await evApi.listNamespacedEvent({ namespace, ...opts })
      : await evApi.listEventForAllNamespaces(opts)

    // Record RV only for the *initial* snapshot page we are anchoring the watch to.
    if (captureRV) lastRV = resp.metadata?.resourceVersion

    return {
      items: resp.items ?? [],
      continue: resp.metadata?._continue,
      remainingItemCount: resp.metadata?.remainingItemCount,
      resourceVersion: resp.metadata?.resourceVersion,
    }
  }

  const startWatch = async (): Promise<void> => {
    if (closed) return
    try {
      await watch.watch(
        watchPath,
        {
          resourceVersion: lastRV,
          resourceVersionMatch: 'NotOlderThan',
          allowWatchBookmarks: true,
        },
        (phase: string, obj: unknown) => {
          if (closed) return
          const p = phase as TWatchPhase
          if ((p === 'ADDED' || p === 'MODIFIED' || p === 'DELETED') && isEventsV1Event(obj)) {
            const rv = obj.metadata?.resourceVersion
            if (rv) lastRV = rv
            if (ws.readyState === ws.OPEN) {
              ws.send(JSON.stringify({ type: p, item: obj }))
            }
          }
        },
        async err => {
          if (closed) return
          if (isGone410(err)) {
            try {
              // RV too old → relist without resending INITIAL
              await listPage({ limit: initialLimit, _continue: undefined, captureRV: true })
            } catch {
              /* noop */
            }
          }
          setTimeout(() => void startWatch(), 1200)
        },
      )
    } catch (err) {
      if (closed) return
      if (isGone410(err)) {
        try {
          await listPage({ limit: initialLimit, _continue: undefined, captureRV: true })
        } catch {
          /* noop */
        }
      }
      setTimeout(() => void startWatch(), 2000)
    }
  }

  // Kick off: do a *single* snapshot (paged if requested) and send INITIAL once
  try {
    const page = await listPage({
      limit: initialLimit,
      _continue: initialContinue,
      captureRV: true, // anchor the watch to this snapshot
    })

    if (!sentInitial && ws.readyState === ws.OPEN) {
      sentInitial = true
      ws.send(
        JSON.stringify({
          type: 'INITIAL',
          items: page.items,
          continue: page.continue,
          remainingItemCount: page.remainingItemCount,
          resourceVersion: page.resourceVersion,
        }),
      )
    }
  } catch {
    // snapshot failed; proceed to watch "from now"
    lastRV = undefined
    sentInitial = true // prevent accidental INITIAL later
  }

  void startWatch()

  // Infinite scroll: UI requests more pages after INITIAL using the `_continue` token.
  ws.on('message', async data => {
    if (closed) return
    let msg: any
    try {
      msg = JSON.parse(String(data))
    } catch {
      return
    }
    if (msg?.type === 'SCROLL') {
      const limit = typeof msg.limit === 'number' && msg.limit > 0 ? Math.trunc(msg.limit) : undefined
      const token = typeof msg.continue === 'string' ? msg.continue : undefined
      if (!token) return
      try {
        const page = await listPage({ limit, _continue: token, captureRV: false }) // do NOT touch lastRV
        if (ws.readyState === ws.OPEN) {
          ws.send(
            JSON.stringify({
              type: 'PAGE',
              items: page.items,
              continue: page.continue,
              remainingItemCount: page.remainingItemCount,
            }),
          )
        }
      } catch (e) {
        if (ws.readyState === ws.OPEN) {
          ws.send(
            JSON.stringify({
              type: 'PAGE_ERROR',
              error: 'Failed to load next page',
            }),
          )
        }
      }
    }
  })

  // Keep-alive pings
  const pingIv = setInterval(() => {
    try {
      if (ws.readyState === ws.OPEN && typeof (ws as { ping?: () => void }).ping === 'function') {
        ;(ws as { ping?: () => void }).ping?.()
      }
    } catch (e) {
      console.debug('events ping error (ignored):', e)
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
    } catch (e) {
      console.debug('events ws close error (ignored):', e)
    }
  })
}

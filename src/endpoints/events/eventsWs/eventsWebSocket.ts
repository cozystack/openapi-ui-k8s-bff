/* eslint-disable max-lines-per-function */
import { Request } from 'express'
import WebSocket, { WebSocketServer } from 'ws'
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

/** Join multiple query params (e.g. ?labelSelector=a=1&labelSelector=b=2) with commas */
const getJoinedParam = (url: URL, key: string): string | undefined => {
  const values = url.searchParams
    .getAll(key)
    .map(v => v.trim())
    .filter(Boolean)
  if (values.length === 0) return undefined
  return values.join(',')
}

export const eventsWebSocket: WebsocketRequestHandler = async (ws: WebSocket, req: Request) => {
  const headers: Record<string, string | string[] | undefined> = { ...(req.headers || {}) }
  delete headers['host']

  const reqUrl = new URL(req.url || '', `http://${req.headers.host}`)
  const namespace = reqUrl.searchParams.get('namespace') || undefined
  const initialLimit = parseLimit(reqUrl.searchParams.get('limit'))
  const initialContinue = reqUrl.searchParams.get('_continue') || undefined

  // Supports multiple occurrences; they’ll be joined by commas.
  const fieldSelector = getJoinedParam(reqUrl, 'fieldSelector') ?? getJoinedParam(reqUrl, 'field') // optional alias if you decide to support it
  const labelSelector = getJoinedParam(reqUrl, 'labelSelector') ?? getJoinedParam(reqUrl, 'labels') // optional alias if you decide to support it

  const sinceRV = reqUrl.searchParams.get('sinceRV') || undefined

  const userKube = createUserKubeClient(headers)
  const watch = new k8s.Watch(userKube.kubeConfig)
  const evApi = userKube.kubeConfig.makeApiClient(k8s.EventsV1Api)

  let closed = false
  // Seed lastRV from client if provided (so we can resume)
  let lastRV: string | undefined = sinceRV
  let sentInitial = false

  let abortCurrentWatch: (() => void) | null = null
  let startingWatch = false

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
    const baseOpts: k8s.EventsV1ApiListEventForAllNamespacesRequest = {
      fieldSelector,
      labelSelector,
      limit: typeof limit === 'number' ? limit : undefined,
      _continue, // may be undefined
    }

    // Only add RV knobs when NOT paginating with a continue token
    if (!_continue && lastRV) {
      baseOpts.resourceVersion = lastRV
      baseOpts.resourceVersionMatch = 'NotOlderThan'
    }

    const resp = namespace
      ? await evApi.listNamespacedEvent({ namespace, ...baseOpts })
      : await evApi.listEventForAllNamespaces(baseOpts)

    // Record RV only for the *initial* snapshot page we are anchoring the watch to.
    if (captureRV) lastRV = resp.metadata?.resourceVersion

    return {
      items: resp.items ?? [],
      continue: resp.metadata?._continue,
      remainingItemCount: resp.metadata?.remainingItemCount,
      resourceVersion: resp.metadata?.resourceVersion,
    }
  }

  const onEvent = (phase: string, obj: unknown) => {
    if (closed) return
    const p = phase as TWatchPhase

    // (Optional but recommended) advance RV on BOOKMARK
    if (p === 'BOOKMARK' && obj && typeof obj === 'object') {
      const md = (obj as any).metadata
      if (md?.resourceVersion) lastRV = md.resourceVersion
      return
    }

    if ((p === 'ADDED' || p === 'MODIFIED' || p === 'DELETED') && isEventsV1Event(obj)) {
      const rv = obj.metadata?.resourceVersion
      if (rv) lastRV = rv
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: p, item: obj }))
        }
      } catch {
        // ignore send errors (socket might be racing to close)
      }
    }
  }

  const onError = async (err: unknown) => {
    if (closed) return
    if (isGone410(err)) {
      try {
        await listPage({ limit: initialLimit, _continue: undefined, captureRV: true })
      } catch {
        /* noop */
      }
    }
    // Restart the watch after a short delay; ensure we stop the current one first
    setTimeout(() => void startWatch(), 1200)
  }

  const startWatch = async (): Promise<void> => {
    if (closed || startingWatch) return
    startingWatch = true
    try {
      // stop any existing watch before starting a new one
      if (abortCurrentWatch) {
        try {
          abortCurrentWatch()
        } catch {
          /* skip */
        }
        abortCurrentWatch = null
      }

      const watchOpts: any = {
        fieldSelector,
        labelSelector,
        allowWatchBookmarks: true,
      }
      if (lastRV) {
        watchOpts.resourceVersion = lastRV
        watchOpts.resourceVersionMatch = 'NotOlderThan'
      }

      const reqObj = await watch.watch(watchPath, watchOpts, onEvent, onError)
      abortCurrentWatch = () => {
        try {
          ;(reqObj as any)?.abort?.()
        } catch {
          /* skip */
        }
        try {
          ;(reqObj as any)?.destroy?.()
        } catch {
          /* skip */
        }
      }
    } catch (err) {
      if (!closed && isGone410(err)) {
        try {
          await listPage({ limit: initialLimit, _continue: undefined, captureRV: true })
        } catch {
          /* noop */
        }
      }
      // try again a bit later
      setTimeout(() => void startWatch(), 2000)
    } finally {
      startingWatch = false
    }
  }

  // Kick off: do a *single* snapshot (paged if requested) and send INITIAL once
  try {
    const page = await listPage({
      limit: initialLimit,
      _continue: initialContinue,
      captureRV: true, // anchor the watch to this snapshot
    })

    if (!sentInitial && ws.readyState === WebSocket.OPEN) {
      sentInitial = true
      try {
        ws.send(
          JSON.stringify({
            type: 'INITIAL',
            items: page.items,
            continue: page.continue,
            remainingItemCount: page.remainingItemCount,
            resourceVersion: page.resourceVersion,
          }),
        )
      } catch {
        /* ignore */
      }
    }
  } catch {
    // snapshot failed; proceed to watch "from now"
    // (do NOT zero out lastRV; if sinceRV was provided we want to NotOlderThan from it)
    sentInitial = true // prevent accidental INITIAL later
  }

  void startWatch()
  const rotateIv = setInterval(
    () => {
      void startWatch()
    },
    10 * 60 * 1000,
  )

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
        if (ws.readyState === WebSocket.OPEN) {
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
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'PAGE_ERROR', error: 'Failed to load next page' }))
        }
      }
    }
  })

  // Keep-alive pings with liveness tracking
  let isAlive = true
  ;(ws as any).on?.('pong', () => {
    isAlive = true
  })

  const pingIv = setInterval(() => {
    try {
      if ((ws as any).readyState !== WebSocket.OPEN) return
      if (!isAlive) {
        // no pong since last ping — terminate to free resources
        ;(ws as any).terminate?.()
        return
      }
      isAlive = false
      ;(ws as any).ping?.()
    } catch (e) {
      console.debug('events ping error (ignored):', e)
    }
  }, 25_000)

  const cleanup = () => {
    closed = true
    clearInterval(pingIv)
    clearInterval(rotateIv)
    try {
      abortCurrentWatch?.()
    } catch {
      /* skip */
    }
    abortCurrentWatch = null
  }

  ;(ws as any).on?.('close', cleanup)
  ;(ws as any).on?.('error', () => {
    cleanup()
    try {
      ;(ws as any).close?.()
    } catch (e) {
      console.debug('events ws close error (ignored):', e)
    }
  })
}

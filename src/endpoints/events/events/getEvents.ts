import { RequestHandler } from 'express'
import { createUserKubeClient } from 'src/constants/kubeClients'

export const getEvents: RequestHandler = async (req, res) => {
  try {
    const filteredHeaders = { ...req.headers }
    delete filteredHeaders['host'] // Avoid passing internal host header

    const userKubeClient = createUserKubeClient(filteredHeaders)

    const limit = Math.max(1, Math.min(500, Number(req.query.limit) || 50))
    const continueToken = (req.query.continue as string) || undefined
    const ns = (req.query.namespace as string) || undefined

    // Build the shared params object (note: "continue" is a reserved word, so quote it)
    const baseParams: Record<string, any> = {
      limit,
      ...(continueToken ? { ['continue']: continueToken } : {}),
      // fieldSelector: "...",
      // labelSelector: "...",
      // resourceVersion: "...",
      // resourceVersionMatch: "...",
      // timeoutSeconds: 30,
      // watch: false,
    }

    const list = ns
      ? await userKubeClient.events.listNamespacedEvent({
          namespace: ns,
          ...baseParams,
        })
      : await userKubeClient.events.listEventForAllNamespaces(baseParams)

    // list is an EventsV1EventList (no `.body`)
    const items = (list.items || []).sort((a: any, b: any) => {
      const at =
        (a.eventTime && Date.parse(a.eventTime as any)) ||
        (a.lastTimestamp && Date.parse(a.lastTimestamp as any)) ||
        (a.metadata?.creationTimestamp ? Date.parse(a.metadata.creationTimestamp as any) : 0)
      const bt =
        (b.eventTime && Date.parse(b.eventTime as any)) ||
        (b.lastTimestamp && Date.parse(b.lastTimestamp as any)) ||
        (b.metadata?.creationTimestamp ? Date.parse(b.metadata.creationTimestamp as any) : 0)
      return bt - at
    })

    res.json({
      items,
      continue: list.metadata?._continue ?? null,
    })
  } catch (err: any) {
    console.error('Error listing events:', err?.response?.data || err)
    res.status(500).json({
      error: err?.response?.data?.message || err?.message || 'Failed to list events',
    })
  }
}

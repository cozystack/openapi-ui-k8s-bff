import NodeCache from 'node-cache'
import axios from 'axios'
import { dereference } from '@readme/openapi-parser'
import { OpenAPIV2 } from 'openapi-types'
import { KUBE_API_URL } from './constants/kubeApiUrl'

const https = require('https')
const httpsAgent = new https.Agent({ rejectUnauthorized: false })

const DEFAULT_TTL = 60 * 15
const CHECK_PERIOD = 60 * 14

export const cache = new NodeCache({ stdTTL: DEFAULT_TTL, checkperiod: CHECK_PERIOD })

async function fetchAndDerefSwagger(clusterName: string): Promise<OpenAPIV2.Document | undefined> {
  try {
    const { data: rawSpec } = await axios.get<OpenAPIV2.Document>(
      `${KUBE_API_URL}/api/clusters/${clusterName}/k8s/openapi/v2`,
      { httpsAgent },
    )
    return await dereference(rawSpec, { dereference: { circular: 'ignore' } })
  } catch (err) {
    console.error(`Error fetching swagger for "${clusterName}":`, err)
    return undefined
  }
}

export async function getClusterSwagger(clusterName: string): Promise<OpenAPIV2.Document | undefined> {
  let swagger = cache.get<OpenAPIV2.Document>(clusterName)

  if (!swagger) {
    swagger = await fetchAndDerefSwagger(clusterName)
    if (swagger) {
      cache.set(clusterName, swagger)
      console.log(`[${new Date().toISOString()}] Cache initialized for "${clusterName}"`)
    }
  }

  console.log(`[${new Date().toISOString()}] Cache get for "${clusterName}"`)
  return swagger
}

cache.on('expired', (clusterName: string) => {
  console.log(`Cache key "${clusterName}" expired, reloading…`)
  fetchAndDerefSwagger(clusterName)
    .then(spec => {
      if (spec) {
        cache.set(clusterName, spec)
      }
    })
    .catch(err => {
      console.error(`Failed to reload swagger for "${clusterName}" on expire:`, err)
    })
})

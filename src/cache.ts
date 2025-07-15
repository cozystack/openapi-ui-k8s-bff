import NodeCache from 'node-cache'
import { dereference } from '@readme/openapi-parser'
import { OpenAPIV2 } from 'openapi-types'
import { kubeApi } from 'src/constants/httpAgent'

const DEFAULT_TTL = 60 * 15
const CHECK_PERIOD = 60 * 14

export const cache = new NodeCache({ stdTTL: DEFAULT_TTL, checkperiod: CHECK_PERIOD })

async function fetchAndDerefSwagger(): Promise<OpenAPIV2.Document | undefined> {
  try {
    const { data: rawSpec } = await kubeApi.get<OpenAPIV2.Document>(`/openapi/v2`)
    const derefedSpec = await dereference(rawSpec, { dereference: { circular: 'ignore' } })

    cache.set('swagger', derefedSpec)
    cache.set('swaggerPaths', Object.keys(derefedSpec.paths || {}))
    Object.keys(derefedSpec.paths || {}).forEach(path => cache.set(path, derefedSpec?.paths[path]))

    console.log(`[${new Date().toISOString()}]: Cache initialized: swagger, swaggerPaths`)

    return derefedSpec
  } catch (err) {
    console.error('Error fetching swagger:', err)
    return undefined
  }
}

export async function getClusterSwagger(): Promise<OpenAPIV2.Document | undefined> {
  let swagger = cache.get<OpenAPIV2.Document>('swagger')

  if (!swagger) {
    swagger = await fetchAndDerefSwagger()
  }

  console.log(`[${new Date().toISOString()}]: Cache get: swagger`)
  return swagger
}

export async function getClusterSwaggerPaths(): Promise<string[] | undefined> {
  let swaggerPaths = cache.get<string[]>('swaggerPaths')

  if (!swaggerPaths) {
    await fetchAndDerefSwagger()
  }
  swaggerPaths = cache.get<string[]>('swaggerPaths')

  console.log(`[${new Date().toISOString()}]: Cache get: swaggerPaths`)
  return swaggerPaths
}

export async function getClusterSwaggerPathByName(name: string): Promise<OpenAPIV2.PathItemObject | undefined> {
  let swaggerPathValue = cache.get<OpenAPIV2.PathItemObject>(name)

  if (!swaggerPathValue) {
    await fetchAndDerefSwagger()
  }
  swaggerPathValue = cache.get<OpenAPIV2.PathItemObject>(name)

  return swaggerPathValue
}

cache.on('expired', (key: string) => {
  console.log(`[${new Date().toISOString()}]: Cache key "${key}" expired, reloading…`)
  if (key === 'swagger') {
    fetchAndDerefSwagger().catch(err => {
      console.error(`[${new Date().toISOString()}]: Failed to reload cache for "${key}" on expire:`, err)
    })
  } else {
    console.log(`[${new Date().toISOString()}]: No expire func for keyL "${key}"`)
  }
})

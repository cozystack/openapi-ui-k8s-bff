import { RequestHandler } from 'express'
import { getClusterSwagger } from 'src/cache'
import {
  TFilterIfApiInstanceNamespaceScopedReq,
  TFilterIfApiInstanceNamespaceScopedRes,
  TFilterIfBuiltInInstanceNamespaceScopedReq,
  TFilterIfBuiltInInstanceNamespaceScopedRes,
} from 'src/localTypes/scopes'
import { filterBuiltinResources } from './utils/filterBuiltinResources'
import { filterApiResources } from './utils/filterApiResources'

export const filterIfApiNamespaceScoped: RequestHandler = async (req: TFilterIfApiInstanceNamespaceScopedReq, res) => {
  try {
    const { clusterName, ...rest } = req.body
    const swagger = await getClusterSwagger(clusterName)
    if (!swagger) {
      return res.status(500).json('No swagger')
    }

    const result: TFilterIfApiInstanceNamespaceScopedRes = filterApiResources({ swagger, ...rest })
    return res.json(result)
  } catch (error) {
    console.error('Error getting dereferenced Swagger:', error)
    return res.status(500).json(error)
  }
}

export const filterIfBuiltInNamespaceScoped: RequestHandler = async (
  req: TFilterIfBuiltInInstanceNamespaceScopedReq,
  res,
) => {
  try {
    const { clusterName, ...rest } = req.body
    const swagger = await getClusterSwagger(clusterName)
    if (!swagger) {
      return res.status(500).json('No swagger')
    }

    const result: TFilterIfBuiltInInstanceNamespaceScopedRes = filterBuiltinResources({
      swagger,
      ...rest,
    })
    return res.json(result)
  } catch (error) {
    console.error('Error getting dereferenced Swagger:', error)
    return res.status(500).json(error)
  }
}

import { RequestHandler } from 'express'
import { getClusterSwaggerPaths } from 'src/cache'
import { checkIfApiInstanceNamespaceScoped, checkIfBuiltInInstanceNamespaceScoped } from 'src/utils/checkScope'
import {
  TCheckIfApiInstanceNamespaceScopedReq,
  TCheckIfApiInstanceNamespaceScopedRes,
  TCheckIfBuiltInInstanceNamespaceScopedReq,
  TCheckIfBuiltInInstanceNamespaceScopedRes,
} from 'src/localTypes/endpoints/scopes'

export const checkIfApiNamespaceScoped: RequestHandler = async (req: TCheckIfApiInstanceNamespaceScopedReq, res) => {
  try {
    const { clusterName, ...rest } = req.body
    const swaggerPaths = await getClusterSwaggerPaths()
    if (!swaggerPaths) {
      return res.status(500).json('No swagger paths')
    }

    const result: TCheckIfApiInstanceNamespaceScopedRes = checkIfApiInstanceNamespaceScoped({ swaggerPaths, ...rest })
    return res.json(result)
  } catch (error) {
    console.error('Error getting dereferenced Swagger:', error)
    return res.status(500).json(error)
  }
}

export const checkIfBuiltInNamespaceScoped: RequestHandler = async (
  req: TCheckIfBuiltInInstanceNamespaceScopedReq,
  res,
) => {
  try {
    const { clusterName, ...rest } = req.body
    const swaggerPaths = await getClusterSwaggerPaths()
    if (!swaggerPaths) {
      return res.status(500).json('No swagger paths')
    }

    const result: TCheckIfBuiltInInstanceNamespaceScopedRes = checkIfBuiltInInstanceNamespaceScoped({
      swaggerPaths,
      ...rest,
    })
    return res.json(result)
  } catch (error) {
    console.error('Error getting dereferenced Swagger:', error)
    return res.status(500).json(error)
  }
}

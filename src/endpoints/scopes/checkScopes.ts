import { RequestHandler } from 'express'
import { getClusterSwagger } from '../../cache'
import { checkIfApiInstanceNamespaceScoped, checkIfBuiltInInstanceNamespaceScoped } from '../../utils/checkScope'
import {
  TCheckIfApiInstanceNamespaceScopedReq,
  TCheckIfApiInstanceNamespaceScopedRes,
  TCheckIfBuiltInInstanceNamespaceScopedReq,
  TCheckIfBuiltInInstanceNamespaceScopedRes,
} from '../../localTypes/scopes'

export const checkIfApiNamespaceScoped: RequestHandler = async (req: TCheckIfApiInstanceNamespaceScopedReq, res) => {
  try {
    const { clusterName, ...rest } = req.body
    const swagger = await getClusterSwagger(clusterName)
    if (!swagger) {
      return res.status(500).json('No swagger')
    }

    const result: TCheckIfApiInstanceNamespaceScopedRes = checkIfApiInstanceNamespaceScoped({ swagger, ...rest })
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
    const swagger = await getClusterSwagger(clusterName)
    if (!swagger) {
      return res.status(500).json('No swagger')
    }

    const result: TCheckIfBuiltInInstanceNamespaceScopedRes = checkIfBuiltInInstanceNamespaceScoped({
      swagger,
      ...rest,
    })
    return res.json(result)
  } catch (error) {
    console.error('Error getting dereferenced Swagger:', error)
    return res.status(500).json(error)
  }
}
